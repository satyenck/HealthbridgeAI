from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models_v2 import User, VitalsLog, Encounter
from app.auth import get_current_patient, get_current_doctor_or_assistant
from app.services.gemini_service import gemini_service
from pydantic import BaseModel
from datetime import datetime, date
import uuid
import json

router = APIRouter(prefix="/api/health-assistant", tags=["Health Assistant"])


class Message(BaseModel):
    role: str  # "assistant" or "user"
    content: str


class InterviewRequest(BaseModel):
    conversation_history: List[Message]


class InterviewResponse(BaseModel):
    next_question: Optional[str] = None
    is_complete: bool
    summary: Optional[str] = None


@router.post("/interview", response_model=InterviewResponse)
async def conduct_interview(
    request: InterviewRequest,
    current_patient: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    Conduct intelligent symptom interview with the patient.

    The AI will:
    1. Ask up to 6 intelligent follow-up questions
    2. Base questions on patient's previous responses
    3. Generate comprehensive symptoms summary after 6 questions

    Args:
        conversation_history: List of messages with role ("assistant" or "user") and content

    Returns:
        - next_question: The next question to ask (if not complete)
        - is_complete: Whether the interview is complete
        - summary: Comprehensive symptoms summary (if complete)
    """
    try:
        # Convert to dict format expected by service
        conversation_history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversation_history
        ]

        # Get response from AI
        result = gemini_service.conduct_symptom_interview(conversation_history)

        return InterviewResponse(
            next_question=result.get("next_question"),
            is_complete=result.get("is_complete"),
            summary=result.get("summary")
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class VitalsReportRequest(BaseModel):
    audio_base64: Optional[str] = None  # Base64 encoded audio
    text_input: Optional[str] = None     # Or direct text input


class VitalsReportResponse(BaseModel):
    transcribed_text: Optional[str] = None  # What the patient said
    needs_clarification: bool
    clarification_question: Optional[str] = None
    confirmation_message: Optional[str] = None
    vitals_saved: List[dict] = []  # List of saved vital records with IDs


@router.post("/report-vitals", response_model=VitalsReportResponse)
async def report_vitals(
    request: VitalsReportRequest,
    current_patient: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    AI-powered vitals reporting via voice or text.

    Patient can say things like:
    - "My blood pressure was 120/80 this morning"
    - "I measured my weight yesterday, it was 75 kg"
    - "My blood sugar is 110 today and my temperature is 98.6"

    The AI will:
    1. Extract all mentioned vital signs
    2. Parse dates (today, yesterday, specific dates)
    3. Store vitals in database with correct dates
    4. Ask for clarification if needed

    Args:
        audio_base64: Base64 encoded audio recording (optional)
        text_input: Direct text input (optional)

    Returns:
        - needs_clarification: Whether AI needs more info
        - clarification_question: Question to ask if clarification needed
        - confirmation_message: Friendly confirmation of what was saved
        - vitals_saved: List of vital records that were created
    """
    try:
        # Step 1: Get the input text (either from voice transcription or direct text)
        if request.audio_base64:
            # Transcribe audio (returns string directly)
            conversation_text = gemini_service.transcribe_audio(request.audio_base64)
        elif request.text_input:
            conversation_text = request.text_input
        else:
            raise HTTPException(status_code=400, detail="Either audio_base64 or text_input must be provided")

        if not conversation_text or conversation_text.strip() == "":
            raise HTTPException(status_code=400, detail="No input received")

        # Step 2: Extract vitals from conversation
        current_date = date.today().isoformat()
        extraction_result = gemini_service.extract_vitals_from_conversation(
            conversation_text,
            current_date
        )

        # Step 3: Check if clarification is needed
        if extraction_result.get("needs_clarification", False):
            return VitalsReportResponse(
                transcribed_text=conversation_text,
                needs_clarification=True,
                clarification_question=extraction_result.get("clarification_question"),
                confirmation_message=None,
                vitals_saved=[]
            )

        # Step 4: Get or create an encounter for vitals logging
        # Find most recent INITIAL_LOG encounter or create one
        encounter = db.query(Encounter).filter(
            Encounter.patient_id == current_patient.user_id,
            Encounter.encounter_type == "INITIAL_LOG"
        ).order_by(Encounter.created_at.desc()).first()

        if not encounter:
            # Create a new INITIAL_LOG encounter for vitals
            encounter = Encounter(
                encounter_id=uuid.uuid4(),
                patient_id=current_patient.user_id,
                encounter_type="INITIAL_LOG",
                input_method="VOICE" if request.audio_base64 else "MANUAL"
            )
            db.add(encounter)
            db.flush()

        # Step 5: Save vitals to database
        vitals_list = extraction_result.get("vitals", [])
        saved_vitals = []

        for vital_data in vitals_list:
            # Parse the date
            vital_date_str = vital_data.get("date")
            if vital_date_str:
                try:
                    vital_date = datetime.strptime(vital_date_str, "%Y-%m-%d")
                except:
                    vital_date = datetime.now()
            else:
                vital_date = datetime.now()

            # Create VitalsLog entry
            vital_log = VitalsLog(
                vital_id=uuid.uuid4(),
                encounter_id=encounter.encounter_id,
                blood_pressure_sys=vital_data.get("blood_pressure_sys"),
                blood_pressure_dia=vital_data.get("blood_pressure_dia"),
                heart_rate=vital_data.get("heart_rate"),
                temperature=vital_data.get("temperature"),
                weight=vital_data.get("weight"),
                height=vital_data.get("height"),
                oxygen_level=vital_data.get("oxygen_level"),
                respiratory_rate=vital_data.get("respiratory_rate"),
                glucose_level=vital_data.get("glucose_level"),
                pain_level=vital_data.get("pain_level"),
                pulse=vital_data.get("pulse") or vital_data.get("heart_rate"),  # pulse can be same as heart_rate
                recorded_at=vital_date
            )

            db.add(vital_log)
            db.flush()

            saved_vitals.append({
                "vital_id": str(vital_log.vital_id),
                "date": vital_date.strftime("%Y-%m-%d"),
                "measurements": {
                    k: v for k, v in vital_data.items()
                    if v is not None and k != "date"
                }
            })

        db.commit()

        # Step 6: Return confirmation
        return VitalsReportResponse(
            transcribed_text=conversation_text,
            needs_clarification=False,
            clarification_question=None,
            confirmation_message=extraction_result.get("friendly_confirmation"),
            vitals_saved=saved_vitals
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error in report_vitals endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process vitals: {str(e)}")


class BulkVitalsRecordRequest(BaseModel):
    audio_base64: str  # Base64 encoded audio with multiple patients' vitals


class PatientVitalsResult(BaseModel):
    phone_number: str
    patient_name: Optional[str] = None
    vitals_saved: dict
    success: bool
    error: Optional[str] = None


class BulkVitalsRecordResponse(BaseModel):
    transcribed_text: str
    results: List[PatientVitalsResult]


@router.post("/bulk-vitals-record", response_model=BulkVitalsRecordResponse)
async def bulk_vitals_record(
    request: BulkVitalsRecordRequest,
    current_user: User = Depends(get_current_doctor_or_assistant),
    db: Session = Depends(get_db)
):
    """
    Record vitals for multiple patients from a single voice recording.

    For doctor assistants to efficiently record vitals for many patients.

    Example input (spoken):
    "5106880096's blood pressure is 130 and 85. RBC count is 4.9, WBC count is 3.
    1234567890's blood pressure is 135 and 90. Sodium level is 140."

    The AI will:
    1. Transcribe the audio
    2. Extract each patient's phone number and their vitals
    3. Create vitals records for each patient
    4. Return success/failure status for each patient

    Args:
        audio_base64: Base64 encoded audio recording

    Returns:
        - transcribed_text: The transcription of what was said
        - results: Array of results for each patient (success/failure)
    """
    try:
        # Step 1: Transcribe the audio
        transcribed_text = gemini_service.transcribe_audio(request.audio_base64)

        if not transcribed_text or transcribed_text.strip() == "":
            raise HTTPException(status_code=400, detail="No transcription received from audio")

        # Step 2: Extract multiple patients' vitals using AI
        extraction_prompt = f"""You are a medical assistant helping to extract vitals from a voice recording.
The recording contains vitals for multiple patients, each identified by their phone number.

Extract all patients and their vitals from the following transcription:
"{transcribed_text}"

IMPORTANT RULES:
1. Each patient is identified by a 10-digit phone number
2. Extract ALL vitals mentioned for each patient
3. Common vitals include: blood pressure (systolic/diastolic), heart rate, temperature, weight, height, oxygen level, respiratory rate, glucose level
4. Lab values include: RBC count, WBC count, hemoglobin, platelet count, sodium, potassium, cholesterol, etc.

Return a JSON array with this exact structure:
[
  {{
    "phone_number": "5106880096",
    "vitals": {{
      "blood_pressure_sys": 130,
      "blood_pressure_dia": 85,
      "rbc_count": 4.9,
      "wbc_count": 3
    }}
  }},
  {{
    "phone_number": "1234567890",
    "vitals": {{
      "blood_pressure_sys": 135,
      "blood_pressure_dia": 90,
      "sodium": 140
    }}
  }}
]

VITAL FIELDS (use these exact field names):
- Blood pressure: blood_pressure_sys, blood_pressure_dia
- Heart rate: heart_rate
- Temperature: temperature
- Weight: weight
- Height: height
- Oxygen level: oxygen_level
- Respiratory rate: respiratory_rate
- Glucose level: glucose_level
- Pulse: pulse
- Pain level: pain_level

Return ONLY the JSON array, no other text."""

        response = gemini_service.text_model.generate_content(extraction_prompt)
        extraction_text = response.text.strip()

        # Clean up markdown formatting if present
        if extraction_text.startswith("```json"):
            extraction_text = extraction_text[7:]  # Remove ```json
        if extraction_text.startswith("```"):
            extraction_text = extraction_text[3:]  # Remove ```
        if extraction_text.endswith("```"):
            extraction_text = extraction_text[:-3]  # Remove trailing ```
        extraction_text = extraction_text.strip()

        # Parse the JSON
        try:
            patients_data = json.loads(extraction_text)
        except json.JSONDecodeError as e:
            print(f"Failed to parse AI response as JSON: {extraction_text}")
            raise HTTPException(status_code=500, detail=f"Failed to parse vitals data: {str(e)}")

        # Step 3: Process each patient
        results = []
        current_date = datetime.now()

        for patient_data in patients_data:
            phone_number = patient_data.get("phone_number", "").strip()
            vitals_dict = patient_data.get("vitals", {})

            if not phone_number:
                results.append(PatientVitalsResult(
                    phone_number="unknown",
                    success=False,
                    error="No phone number found",
                    vitals_saved={}
                ))
                continue

            try:
                # Find patient by phone number
                patient = db.query(User).filter(User.phone_number == phone_number).first()

                if not patient:
                    results.append(PatientVitalsResult(
                        phone_number=phone_number,
                        success=False,
                        error=f"Patient with phone number {phone_number} not found",
                        vitals_saved={}
                    ))
                    continue

                # Get or create an encounter for this patient
                encounter = db.query(Encounter).filter(
                    Encounter.patient_id == patient.user_id,
                    Encounter.encounter_type == "INITIAL_LOG"
                ).order_by(Encounter.created_at.desc()).first()

                if not encounter:
                    # Create a new INITIAL_LOG encounter
                    encounter = Encounter(
                        encounter_id=uuid.uuid4(),
                        patient_id=patient.user_id,
                        encounter_type="INITIAL_LOG",
                        input_method="VOICE"
                    )
                    db.add(encounter)
                    db.flush()

                # Create VitalsLog entry
                vital_log = VitalsLog(
                    vital_id=uuid.uuid4(),
                    encounter_id=encounter.encounter_id,
                    blood_pressure_sys=vitals_dict.get("blood_pressure_sys"),
                    blood_pressure_dia=vitals_dict.get("blood_pressure_dia"),
                    heart_rate=vitals_dict.get("heart_rate"),
                    temperature=vitals_dict.get("temperature"),
                    weight=vitals_dict.get("weight"),
                    height=vitals_dict.get("height"),
                    oxygen_level=vitals_dict.get("oxygen_level"),
                    respiratory_rate=vitals_dict.get("respiratory_rate"),
                    glucose_level=vitals_dict.get("glucose_level"),
                    pain_level=vitals_dict.get("pain_level"),
                    pulse=vitals_dict.get("pulse") or vitals_dict.get("heart_rate"),
                    recorded_at=current_date
                )

                db.add(vital_log)
                db.flush()

                # Get patient name if available
                patient_name = None
                if hasattr(patient, 'patient_profile') and patient.patient_profile:
                    patient_name = f"{patient.patient_profile.first_name} {patient.patient_profile.last_name}"

                results.append(PatientVitalsResult(
                    phone_number=phone_number,
                    patient_name=patient_name,
                    success=True,
                    vitals_saved={
                        "vital_id": str(vital_log.vital_id),
                        "date": current_date.strftime("%Y-%m-%d"),
                        "measurements": {k: v for k, v in vitals_dict.items() if v is not None}
                    }
                ))

            except Exception as e:
                print(f"Error processing patient {phone_number}: {str(e)}")
                results.append(PatientVitalsResult(
                    phone_number=phone_number,
                    success=False,
                    error=str(e),
                    vitals_saved={}
                ))

        # Commit all changes
        db.commit()

        return BulkVitalsRecordResponse(
            transcribed_text=transcribed_text,
            results=results
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error in bulk_vitals_record endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process bulk vitals: {str(e)}")
