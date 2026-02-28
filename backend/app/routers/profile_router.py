from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models_v2 import User, PatientProfile, UserRole, PatientDocument
from app.schemas_v2 import (
    PatientProfileCreate, PatientProfileResponse, PatientProfileUpdate,
    VoiceTranscriptionRequest
)
from app.auth import get_current_active_user, get_current_patient
from app.services.gemini_service import gemini_service
from app.services.file_service import FileService
from typing import List
from uuid import UUID
import json
import io

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
        general_health_issues=profile.general_health_issues,
        primary_doctor_id=profile.primary_doctor_id,
        notes=profile.notes
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
    from app.models_v2 import DoctorProfile

    profile = db.query(PatientProfile).filter(
        PatientProfile.user_id == current_patient.user_id
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    # Get primary doctor name if exists
    primary_doctor_name = None
    if profile.primary_doctor_id:
        doctor = db.query(DoctorProfile).filter(
            DoctorProfile.user_id == profile.primary_doctor_id
        ).first()
        if doctor:
            primary_doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}"

    # Create response with computed field
    profile_dict = {
        "user_id": profile.user_id,
        "first_name": profile.first_name,
        "last_name": profile.last_name,
        "date_of_birth": profile.date_of_birth,
        "gender": profile.gender,
        "general_health_issues": profile.general_health_issues,
        "primary_doctor_id": profile.primary_doctor_id,
        "primary_doctor_name": primary_doctor_name,
        "notes": profile.notes,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at
    }

    return profile_dict


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
    if profile_update.primary_doctor_id is not None:
        profile.primary_doctor_id = profile_update.primary_doctor_id
    if profile_update.notes is not None:
        profile.notes = profile_update.notes

    db.commit()
    db.refresh(profile)

    # Get primary doctor name if exists
    from app.models_v2 import DoctorProfile
    primary_doctor_name = None
    if profile.primary_doctor_id:
        doctor = db.query(DoctorProfile).filter(
            DoctorProfile.user_id == profile.primary_doctor_id
        ).first()
        if doctor:
            primary_doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}"

    # Create response with computed field
    profile_dict = {
        "user_id": profile.user_id,
        "first_name": profile.first_name,
        "last_name": profile.last_name,
        "date_of_birth": profile.date_of_birth,
        "gender": profile.gender,
        "general_health_issues": profile.general_health_issues,
        "primary_doctor_id": profile.primary_doctor_id,
        "primary_doctor_name": primary_doctor_name,
        "notes": profile.notes,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at
    }

    return profile_dict


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
    force_refresh: bool = False,
    current_patient: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    Get personalized health insights for the patient based on their complete health data.
    Supports multiple languages (English, Gujarati) via query parameter.
    Uses intelligent caching - only calls AI API when there's new data (vitals, labs, or reviewed reports).
    Set force_refresh=true to bypass cache.
    """
    from app.models_v2 import (
        Encounter, SummaryReport, VitalsLog, LabOrder, Prescription,
        LabResultsLog, HealthInsightsCache
    )
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

    # ===== INTELLIGENT CACHING LOGIC =====
    # Check for cached insights
    cached_insights = db.query(HealthInsightsCache).filter(
        HealthInsightsCache.patient_id == current_patient.user_id
    ).first()

    # Get latest timestamps for new data
    latest_vital_time = db.query(func.max(VitalsLog.recorded_at)).join(
        Encounter, VitalsLog.encounter_id == Encounter.encounter_id
    ).filter(Encounter.patient_id == current_patient.user_id).scalar()

    latest_lab_time = db.query(func.max(LabResultsLog.recorded_at)).join(
        Encounter, LabResultsLog.encounter_id == Encounter.encounter_id
    ).filter(Encounter.patient_id == current_patient.user_id).scalar()

    latest_reviewed_report_time = db.query(func.max(SummaryReport.updated_at)).join(
        Encounter, SummaryReport.encounter_id == Encounter.encounter_id
    ).filter(
        Encounter.patient_id == current_patient.user_id,
        SummaryReport.status == 'REVIEWED'
    ).scalar()

    # Determine if we need to regenerate insights
    needs_regeneration = force_refresh or not cached_insights or cached_insights.language != language

    if cached_insights and not force_refresh and cached_insights.language == language:
        # Check if there's new data since last generation
        has_new_vitals = latest_vital_time and (
            not cached_insights.last_vitals_timestamp or
            latest_vital_time > cached_insights.last_vitals_timestamp
        )
        has_new_labs = latest_lab_time and (
            not cached_insights.last_lab_result_timestamp or
            latest_lab_time > cached_insights.last_lab_result_timestamp
        )
        has_new_reports = latest_reviewed_report_time and (
            not cached_insights.last_reviewed_report_timestamp or
            latest_reviewed_report_time > cached_insights.last_reviewed_report_timestamp
        )

        needs_regeneration = has_new_vitals or has_new_labs or has_new_reports

    # If cached data is fresh, return it immediately (no AI API call)
    if not needs_regeneration and cached_insights:
        print(f"[INSIGHTS CACHE HIT] Returning cached insights for patient {current_patient.user_id}")
        return cached_insights.insights_data

    print(f"[INSIGHTS CACHE MISS] Generating new insights for patient {current_patient.user_id}")
    # ===== END CACHING LOGIC =====

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

    # Prepare response data
    response_data = {
        'ai_insights': ai_insights,
        'pending_labs': pending_labs_data,
        'pending_prescriptions': pending_prescriptions_data
    }

    # ===== SAVE TO CACHE =====
    if cached_insights:
        # Update existing cache
        cached_insights.insights_data = response_data
        cached_insights.language = language
        cached_insights.last_generated_at = datetime.utcnow()
        cached_insights.last_vitals_timestamp = latest_vital_time
        cached_insights.last_lab_result_timestamp = latest_lab_time
        cached_insights.last_reviewed_report_timestamp = latest_reviewed_report_time
    else:
        # Create new cache entry
        new_cache = HealthInsightsCache(
            patient_id=current_patient.user_id,
            insights_data=response_data,
            language=language,
            last_vitals_timestamp=latest_vital_time,
            last_lab_result_timestamp=latest_lab_time,
            last_reviewed_report_timestamp=latest_reviewed_report_time
        )
        db.add(new_cache)

    db.commit()
    print(f"[INSIGHTS CACHE] Saved new insights for patient {current_patient.user_id}")
    # ===== END SAVE TO CACHE =====

    return response_data


# ============================================================================
# PATIENT DOCUMENTS (Lab reports, MRI scans, prescriptions, etc.)
# ============================================================================

@router.get("/documents")
async def get_patient_documents(
    current_patient: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    Get all documents uploaded by the patient.
    Returns list of documents with metadata.
    """
    documents = db.query(PatientDocument).filter(
        PatientDocument.patient_id == current_patient.user_id
    ).order_by(PatientDocument.uploaded_at.desc()).all()

    # Build response with file URLs
    documents_list = []
    for doc in documents:
        documents_list.append({
            "file_id": str(doc.file_id),
            "file_name": doc.filename,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "uploaded_at": doc.uploaded_at.isoformat(),
            "file_url": f"/api/profile/documents/{doc.file_id}/download"
        })

    return documents_list


@router.post("/documents/upload")
async def upload_patient_documents(
    files: List[UploadFile] = File(...),
    current_patient: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    Upload medical documents (lab reports, MRI scans, prescriptions, etc.).
    These documents are accessible to all doctors treating the patient.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided"
        )

    # Save documents using FileService
    saved_documents = await FileService.save_patient_documents(files, current_patient.user_id, db)

    # Build response
    documents_list = []
    for doc in saved_documents:
        documents_list.append({
            "file_id": str(doc.file_id),
            "file_name": doc.filename,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "uploaded_at": doc.uploaded_at.isoformat(),
            "file_url": f"/api/profile/documents/{doc.file_id}/download"
        })

    return documents_list


@router.delete("/documents/{file_id}")
async def delete_patient_document(
    file_id: UUID,
    current_patient: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    Delete a patient document.
    Only the patient who uploaded it can delete it.
    """
    # Verify document exists and belongs to patient
    document = db.query(PatientDocument).filter(
        PatientDocument.file_id == file_id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if document.patient_id != current_patient.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this document"
        )

    # Delete using FileService
    FileService.delete_patient_document(file_id, db)

    return {"message": "Document deleted successfully"}


@router.get("/documents/{file_id}/download")
async def download_patient_document(
    file_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Download/view a patient document.
    Accessible to the patient and all doctors treating them.
    """
    # Verify document exists
    document = db.query(PatientDocument).filter(
        PatientDocument.file_id == file_id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # Authorization: patient can access their own documents, doctors can access their patients' documents
    if current_user.role == UserRole.PATIENT:
        if document.patient_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this document"
            )
    elif current_user.role == UserRole.DOCTOR:
        # For now, allow all doctors to access patient documents
        # TODO: Add more granular access control (e.g., only doctors who have seen the patient)
        pass
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this document"
        )

    # Read and decrypt file
    file_contents = FileService.read_encrypted_patient_document(file_id, db)

    # Determine content type based on file type
    content_type_map = {
        "image": "image/jpeg",
        "video": "video/mp4",
        "document": "application/pdf"
    }
    content_type = content_type_map.get(document.file_type, "application/octet-stream")

    # Return file as streaming response
    return StreamingResponse(
        io.BytesIO(file_contents),
        media_type=content_type,
        headers={
            "Content-Disposition": f"inline; filename={document.filename}"
        }
    )
