from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models_v2 import User, PatientProfile, UserRole
from app.schemas_v2 import (
    PatientProfileCreate, PatientProfileResponse, PatientProfileUpdate,
    VoiceTranscriptionRequest
)
from app.auth import get_current_active_user, get_current_patient
from app.services.gemini_service import gemini_service
import json

router = APIRouter(prefix="/api/profile", tags=["Profile"])


@router.post("/", response_model=PatientProfileResponse)
async def create_profile(
    profile: PatientProfileCreate,
    current_patient: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    Create patient profile (Patient only).
    """
    existing_profile = db.query(PatientProfile).filter(
        PatientProfile.user_id == current_patient.user_id
    ).first()

    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile already exists. Use update endpoint."
        )

    new_profile = PatientProfile(
        user_id=current_patient.user_id,
        first_name=profile.first_name,
        last_name=profile.last_name,
        date_of_birth=profile.date_of_birth,
        gender=profile.gender,
        general_health_issues=profile.general_health_issues
    )

    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)

    return new_profile


@router.get("/", response_model=PatientProfileResponse)
async def get_profile(
    current_patient: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    Get current patient's profile.
    """
    profile = db.query(PatientProfile).filter(
        PatientProfile.user_id == current_patient.user_id
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    return profile


@router.patch("/", response_model=PatientProfileResponse)
async def update_profile(
    profile_update: PatientProfileUpdate,
    current_patient: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    Update patient profile (Patient only).
    """
    profile = db.query(PatientProfile).filter(
        PatientProfile.user_id == current_patient.user_id
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    # Update only provided fields
    if profile_update.first_name is not None:
        profile.first_name = profile_update.first_name
    if profile_update.last_name is not None:
        profile.last_name = profile_update.last_name
    if profile_update.date_of_birth is not None:
        profile.date_of_birth = profile_update.date_of_birth
    if profile_update.gender is not None:
        profile.gender = profile_update.gender
    if profile_update.general_health_issues is not None:
        profile.general_health_issues = profile_update.general_health_issues

    db.commit()
    db.refresh(profile)

    return profile


@router.post("/transcribe-voice")
async def transcribe_voice(
    voice_request: VoiceTranscriptionRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Transcribe voice input to text for profile creation
    """
    try:
        transcription = gemini_service.transcribe_audio(voice_request.audio_base64)
        return {"transcription": transcription}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/parse-voice-profile")
async def parse_voice_profile(
    voice_request: VoiceTranscriptionRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Transcribe voice and extract profile information using AI
    """
    try:
        transcription = gemini_service.transcribe_audio(voice_request.audio_base64)

        prompt = f"""Extract the following profile information from this transcription: "{transcription}"

Please extract and return a JSON object with these fields:
- first_name: string
- last_name: string
- date_of_birth: string (YYYY-MM-DD format)
- gender: string (Male, Female, Other, or Prefer Not to Say)
- general_health_issues: string (any mentioned health conditions or null if not mentioned)

If any field is not mentioned, use null."""

        response = gemini_service.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that extracts structured profile information from text."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )

        profile_data = json.loads(response.choices[0].message.content)

        return {
            "transcription": transcription,
            "profile_data": profile_data
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/timeline")
async def get_my_timeline(
    current_patient: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    Get patient's own health timeline with all encounters and data.
    """
    from app.models_v2 import Encounter, SummaryReport, VitalsLog, LabResultsLog
    from app.schemas_v2 import PatientTimelineResponse, ComprehensiveEncounterResponse
    from collections import defaultdict
    from typing import Dict, Any, List
    
    # Get patient profile
    patient = db.query(PatientProfile).filter(
        PatientProfile.user_id == current_patient.user_id
    ).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )

    # Get all encounters for this patient
    encounters = db.query(Encounter).filter(
        Encounter.patient_id == current_patient.user_id
    ).order_by(Encounter.created_at.desc()).all()

    # Build timeline encounters
    timeline_encounters = []
    vitals_data = defaultdict(list)
    timestamps = []

    for encounter in encounters:
        # Get summary report
        summary = db.query(SummaryReport).filter(
            SummaryReport.encounter_id == encounter.encounter_id
        ).first()

        # Get vitals
        vitals_list = db.query(VitalsLog).filter(
            VitalsLog.encounter_id == encounter.encounter_id
        ).order_by(VitalsLog.recorded_at).all()

        # Get lab results
        lab_results = db.query(LabResultsLog).filter(
            LabResultsLog.encounter_id == encounter.encounter_id
        ).all()

        # Collect vitals for trends
        for vital in vitals_list:
            vitals_data['blood_pressure_sys'].append(vital.blood_pressure_sys)
            vitals_data['blood_pressure_dia'].append(vital.blood_pressure_dia)
            vitals_data['heart_rate'].append(vital.heart_rate)
            vitals_data['temperature'].append(vital.temperature)
            vitals_data['oxygen_level'].append(vital.oxygen_level)
            vitals_data['weight'].append(vital.weight or 0)
            timestamps.append(vital.recorded_at.isoformat())

        # Build comprehensive encounter response
        from app.schemas_v2 import EncounterResponse

        encounter_response = EncounterResponse(
            encounter_id=encounter.encounter_id,
            patient_id=encounter.patient_id,
            doctor_id=encounter.doctor_id,
            encounter_type=encounter.encounter_type,
            input_method=encounter.input_method,
            created_at=encounter.created_at
        )

        encounter_data = ComprehensiveEncounterResponse(
            encounter=encounter_response,
            summary_report=summary,
            vitals=vitals_list,
            lab_results=lab_results,
            doctor_info=None  # Patient view doesn't need doctor info
        )
        timeline_encounters.append(encounter_data)

    # Build vitals trend
    vitals_trend = None
    if timestamps:
        vitals_trend = {
            'timestamps': timestamps,
            'blood_pressure_sys': vitals_data['blood_pressure_sys'],
            'blood_pressure_dia': vitals_data['blood_pressure_dia'],
            'heart_rate': vitals_data['heart_rate'],
            'temperature': vitals_data['temperature'],
            'oxygen_level': vitals_data['oxygen_level'],
            'weight': vitals_data['weight']
        }

    return PatientTimelineResponse(
        patient=patient,
        encounters=timeline_encounters,
        vitals_trend=vitals_trend
    )

@router.get("/insights")
async def get_health_insights(
    language: str = "English",
    current_patient: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    Get personalized health insights for the patient based on their complete health data.
    Supports multiple languages (English, Gujarati) via query parameter.
    """
    from app.models_v2 import Encounter, SummaryReport, VitalsLog, LabOrder, Prescription
    from datetime import datetime, timedelta

    # Get patient profile
    patient = db.query(PatientProfile).filter(
        PatientProfile.user_id == current_patient.user_id
    ).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )

    # Get recent encounters (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    encounters = db.query(Encounter).filter(
        Encounter.patient_id == current_patient.user_id,
        Encounter.created_at >= thirty_days_ago
    ).order_by(Encounter.created_at.desc()).all()

    # Get pending lab orders (through encounters)
    pending_labs = db.query(LabOrder).join(
        Encounter, LabOrder.encounter_id == Encounter.encounter_id
    ).filter(
        Encounter.patient_id == current_patient.user_id,
        LabOrder.status.in_(['SENT', 'RECEIVED'])
    ).all()

    # Get pending prescriptions (through encounters)
    pending_prescriptions = db.query(Prescription).join(
        Encounter, Prescription.encounter_id == Encounter.encounter_id
    ).filter(
        Encounter.patient_id == current_patient.user_id,
        Prescription.status.in_(['SENT', 'RECEIVED'])
    ).all()

    # Build encounters summary
    encounters_summary = []
    diagnoses_set = set()
    treatments_set = set()

    for encounter in encounters:
        summary = db.query(SummaryReport).filter(
            SummaryReport.encounter_id == encounter.encounter_id
        ).first()

        if summary and summary.status == 'REVIEWED':
            date_str = encounter.created_at.strftime('%Y-%m-%d')
            encounters_summary.append(
                f"- {date_str}: {summary.content.get('symptoms', 'N/A')[:100]}"
            )
            if summary.content.get('diagnosis'):
                diagnoses_set.add(summary.content['diagnosis'])
            if summary.content.get('treatment'):
                treatments_set.add(summary.content['treatment'])

    # Get recent vitals trends
    vitals_list = []
    for encounter in encounters[:5]:  # Last 5 encounters
        vitals = db.query(VitalsLog).filter(
            VitalsLog.encounter_id == encounter.encounter_id
        ).order_by(VitalsLog.recorded_at.desc()).first()
        if vitals:
            vitals_list.append(vitals)

    vitals_summary = ""
    if vitals_list:
        latest = vitals_list[0]
        vitals_summary = f"""Latest readings:
- Blood Pressure: {latest.blood_pressure_sys}/{latest.blood_pressure_dia} mmHg
- Heart Rate: {latest.heart_rate} bpm
- Temperature: {latest.temperature}°C
- Oxygen Level: {latest.oxygen_level}%
{f"- Weight: {latest.weight} kg" if latest.weight else ""}"""

    # Calculate age from date of birth
    age = "Unknown"
    if patient.date_of_birth:
        today = datetime.utcnow().date()
        age = today.year - patient.date_of_birth.year - (
            (today.month, today.day) < (patient.date_of_birth.month, patient.date_of_birth.day)
        )

    # Prepare data for AI
    patient_data = {
        'name': f"{patient.first_name} {patient.last_name}",
        'age': age,
        'gender': patient.gender,
        'general_health_issues': patient.general_health_issues,
        'encounters': encounters,
        'encounters_summary': '\n'.join(encounters_summary) if encounters_summary else 'No recent consultations',
        'vitals_summary': vitals_summary,
        'diagnoses': ', '.join(diagnoses_set) if diagnoses_set else 'None',
        'treatments': ', '.join(treatments_set) if treatments_set else 'None'
    }

    # Generate AI insights in requested language
    ai_insights = gemini_service.generate_health_insights(patient_data, language=language)

    # Build response with lab and pharmacy names
    pending_labs_data = []
    for lab in pending_labs:
        lab_user = db.query(User).filter(User.user_id == lab.lab_id).first()
        lab_name = lab_user.email if lab_user else "Unknown Lab"
        pending_labs_data.append({
            'order_id': str(lab.order_id),
            'test_name': lab.instructions,
            'lab_name': lab_name,
            'status': lab.status.value,
            'ordered_at': lab.created_at.isoformat()
        })

    pending_prescriptions_data = []
    for prescription in pending_prescriptions:
        pharmacy_user = db.query(User).filter(User.user_id == prescription.pharmacy_id).first()
        pharmacy_name = pharmacy_user.email if pharmacy_user else "Unknown Pharmacy"
        pending_prescriptions_data.append({
            'prescription_id': str(prescription.prescription_id),
            'medication_name': prescription.instructions,
            'pharmacy_name': pharmacy_name,
            'status': prescription.status.value,
            'prescribed_at': prescription.created_at.isoformat()
        })

    return {
        'ai_insights': ai_insights,
        'pending_labs': pending_labs_data,
        'pending_prescriptions': pending_prescriptions_data
    }
