"""
Encounter Router - Handles all medical encounters and related data
Replaces consultation_router.py in v2 architecture
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.models_v2 import (
    User, Encounter, VitalsLog, LabResultsLog, SummaryReport,
    MediaFile, PatientProfile, DoctorProfile,
    UserRole, EncounterType, InputMethod, ReportStatus, Priority
)
from app.schemas_v2 import (
    EncounterCreate, EncounterResponse, AssignDoctorRequest,
    VitalsCreate, VitalsResponse,
    LabResultsCreate, LabResultsResponse,
    SummaryReportCreate, SummaryReportResponse, SummaryReportUpdate,
    PatientSymptomsUpdate,
    MediaFileResponse,
    ComprehensiveEncounterResponse,
    DoctorProfileResponse,
    LabOrderRequest, PrescriptionRequest
)
from app.auth import get_current_active_user, get_current_doctor, get_current_patient
from app.services.openai_service import openai_service
from app.services.file_service import FileService
from app.services.encounter_service import encounter_service
from app.schemas_v2 import VoiceTranscriptionRequest, VoiceTranscriptionResponse

router = APIRouter(prefix="/api/encounters", tags=["Encounters"])


# ============================================================================
# DOCTORS
# ============================================================================

@router.get("/available-doctors", response_model=List[DoctorProfileResponse])
async def get_available_doctors(
    specialty: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get list of available doctors for consultation.
    Patients can use this to select a doctor when creating an encounter.
    """
    query = db.query(DoctorProfile).join(
        User, DoctorProfile.user_id == User.user_id
    ).filter(User.is_active == True)

    if specialty:
        query = query.filter(DoctorProfile.specialty == specialty)

    doctors = query.order_by(DoctorProfile.first_name, DoctorProfile.last_name).all()
    return doctors


# ============================================================================
# LABS AND PHARMACIES (Must be before /{encounter_id} route)
# ============================================================================

@router.get("/labs", response_model=List[dict])
async def get_available_labs(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get list of available labs for lab orders.
    """
    from app.models_v2 import LabProfile

    labs = db.query(LabProfile).all()
    return [
        {
            "user_id": str(lab.user_id),
            "business_name": lab.business_name,
            "email": lab.email,
            "phone": lab.phone,
            "address": lab.address,
            "license_year": lab.license_year,
            "created_at": lab.created_at.isoformat() if lab.created_at else None,
        }
        for lab in labs
    ]


@router.get("/pharmacies", response_model=List[dict])
async def get_available_pharmacies(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get list of available pharmacies for prescriptions.
    """
    from app.models_v2 import PharmacyProfile

    pharmacies = db.query(PharmacyProfile).all()
    return [
        {
            "user_id": str(pharmacy.user_id),
            "business_name": pharmacy.business_name,
            "email": pharmacy.email,
            "phone": pharmacy.phone,
            "address": pharmacy.address,
            "license_year": pharmacy.license_year,
            "created_at": pharmacy.created_at.isoformat() if pharmacy.created_at else None,
        }
        for pharmacy in pharmacies
    ]


# ============================================================================
# ENCOUNTER CREATION & RETRIEVAL
# ============================================================================

@router.post("/", response_model=EncounterResponse)
async def create_encounter(
    encounter: EncounterCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new medical encounter.
    Patients create their own encounters.
    Doctors can create encounters for their patients.
    """
    # Authorization check
    if current_user.role == UserRole.PATIENT:
        # Patients can only create encounters for themselves
        if encounter.patient_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Patients can only create encounters for themselves"
            )
    elif current_user.role == UserRole.DOCTOR:
        # Doctors can create encounters for any patient
        pass
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients and doctors can create encounters"
        )

    # Create encounter
    new_encounter = Encounter(
        patient_id=encounter.patient_id,
        doctor_id=encounter.doctor_id,
        encounter_type=encounter.encounter_type,
        input_method=encounter.input_method
    )

    db.add(new_encounter)
    db.commit()
    db.refresh(new_encounter)

    return new_encounter


@router.get("/", response_model=List[EncounterResponse])
async def get_encounters(
    patient_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get encounters based on user role:
    - Patients: Only their own encounters
    - Doctors: Encounters they're assigned to, or all if patient_id provided
    - Admin: All encounters
    """
    query = db.query(Encounter)

    if current_user.role == UserRole.PATIENT:
        # Patients see only their own encounters
        query = query.filter(Encounter.patient_id == current_user.user_id)
    elif current_user.role == UserRole.DOCTOR:
        if patient_id:
            # Doctor requesting specific patient's encounters
            query = query.filter(Encounter.patient_id == patient_id)
        else:
            # Doctor sees encounters they're assigned to
            query = query.filter(Encounter.doctor_id == current_user.user_id)
    elif current_user.role == UserRole.ADMIN:
        # Admin can filter by patient_id or see all
        if patient_id:
            query = query.filter(Encounter.patient_id == patient_id)

    encounters = query.order_by(Encounter.created_at.desc()).all()
    return encounters


@router.get("/{encounter_id}", response_model=ComprehensiveEncounterResponse)
async def get_encounter(
    encounter_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive encounter data with all related information:
    - Vitals logs
    - Lab results
    - Summary report
    - Media files
    - Patient and doctor info
    """
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Authorization check
    if current_user.role == UserRole.PATIENT:
        if encounter.patient_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this encounter"
            )
    elif current_user.role == UserRole.DOCTOR:
        # Doctors can view encounters they're assigned to or pending reports
        if encounter.doctor_id != current_user.user_id:
            # Check if encounter has pending report
            summary = db.query(SummaryReport).filter(
                SummaryReport.encounter_id == encounter_id,
                SummaryReport.status == ReportStatus.PENDING_REVIEW
            ).first()
            if not summary:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view this encounter"
                )

    # Gather all related data
    vitals = db.query(VitalsLog).filter(VitalsLog.encounter_id == encounter_id).all()
    lab_results = db.query(LabResultsLog).filter(LabResultsLog.encounter_id == encounter_id).all()
    summary_report = db.query(SummaryReport).filter(SummaryReport.encounter_id == encounter_id).first()
    media_files = db.query(MediaFile).filter(MediaFile.encounter_id == encounter_id).all()

    # Get patient and doctor info
    patient_profile = db.query(PatientProfile).filter(
        PatientProfile.user_id == encounter.patient_id
    ).first()
    doctor_profile = None
    if encounter.doctor_id:
        doctor_profile = db.query(DoctorProfile).filter(
            DoctorProfile.user_id == encounter.doctor_id
        ).first()

    return ComprehensiveEncounterResponse(
        encounter=encounter,
        vitals=vitals,
        lab_results=lab_results,
        summary_report=summary_report,
        media_files=media_files,
        patient_info=patient_profile,
        doctor_info=doctor_profile
    )


@router.patch("/{encounter_id}/assign-doctor", response_model=EncounterResponse)
async def assign_doctor_to_encounter(
    encounter_id: UUID,
    request: AssignDoctorRequest,
    current_patient: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    Assign a doctor to an encounter.
    Only the patient who owns the encounter can assign a doctor.
    """
    # Verify encounter exists and belongs to the patient
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id,
        Encounter.patient_id == current_patient.user_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found or access denied"
        )

    # Verify doctor exists and is active
    doctor = db.query(User).join(DoctorProfile).filter(
        User.user_id == request.doctor_id,
        User.role == UserRole.DOCTOR,
        User.is_active == True
    ).first()

    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found or not active"
        )

    # Assign doctor
    encounter.doctor_id = request.doctor_id
    db.commit()
    db.refresh(encounter)

    return encounter


# ============================================================================
# VITALS MANAGEMENT
# ============================================================================

@router.post("/{encounter_id}/vitals", response_model=VitalsResponse)
async def add_vitals(
    encounter_id: UUID,
    vitals: VitalsCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Add vitals to an encounter.
    Patients and doctors can add vitals.
    """
    # Verify encounter exists and user has access
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Authorization
    if current_user.role == UserRole.PATIENT:
        if encounter.patient_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to add vitals to this encounter"
            )
    elif current_user.role == UserRole.DOCTOR:
        if encounter.doctor_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to add vitals to this encounter"
            )

    # Create vitals log
    new_vitals = VitalsLog(
        encounter_id=encounter_id,
        blood_pressure_sys=vitals.blood_pressure_sys,
        blood_pressure_dia=vitals.blood_pressure_dia,
        heart_rate=vitals.heart_rate,
        oxygen_level=vitals.oxygen_level,
        weight=vitals.weight,
        temperature=vitals.temperature
    )

    db.add(new_vitals)
    db.commit()
    db.refresh(new_vitals)

    return new_vitals


@router.get("/{encounter_id}/vitals", response_model=List[VitalsResponse])
async def get_encounter_vitals(
    encounter_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all vitals for an encounter
    """
    # Verify access to encounter
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Authorization
    if current_user.role == UserRole.PATIENT and encounter.patient_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )

    vitals = db.query(VitalsLog).filter(
        VitalsLog.encounter_id == encounter_id
    ).order_by(VitalsLog.recorded_at.desc()).all()

    return vitals


# ============================================================================
# LAB RESULTS MANAGEMENT
# ============================================================================

@router.post("/{encounter_id}/lab-results", response_model=LabResultsResponse)
async def add_lab_results(
    encounter_id: UUID,
    lab_results: LabResultsCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Add lab results to an encounter.
    Doctors and labs can add lab results.
    """
    # Verify encounter exists
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Authorization - only doctors and labs can add lab results
    if current_user.role not in [UserRole.DOCTOR, UserRole.LAB]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors and labs can add lab results"
        )

    # Create lab results log
    new_lab_results = LabResultsLog(
        encounter_id=encounter_id,
        metrics=lab_results.metrics
    )

    db.add(new_lab_results)
    db.commit()
    db.refresh(new_lab_results)

    return new_lab_results


@router.get("/{encounter_id}/lab-results", response_model=List[LabResultsResponse])
async def get_encounter_lab_results(
    encounter_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all lab results for an encounter
    """
    # Verify access to encounter
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Authorization
    if current_user.role == UserRole.PATIENT and encounter.patient_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )

    lab_results = db.query(LabResultsLog).filter(
        LabResultsLog.encounter_id == encounter_id
    ).order_by(LabResultsLog.recorded_at.desc()).all()

    return lab_results


# ============================================================================
# SUMMARY REPORT MANAGEMENT
# ============================================================================

@router.post("/{encounter_id}/summary", response_model=SummaryReportResponse)
async def create_summary_report(
    encounter_id: UUID,
    report: SummaryReportCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create AI-generated summary report for an encounter.
    Can be triggered by patient or doctor.
    """
    # Verify encounter exists
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Check if summary already exists
    existing_summary = db.query(SummaryReport).filter(
        SummaryReport.encounter_id == encounter_id
    ).first()

    if existing_summary:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Summary report already exists for this encounter"
        )

    # Create summary report
    new_summary = SummaryReport(
        encounter_id=encounter_id,
        status=report.status,
        priority=report.priority,
        content=report.content.model_dump()
    )

    db.add(new_summary)
    db.commit()
    db.refresh(new_summary)

    return new_summary


@router.patch("/{encounter_id}/summary", response_model=SummaryReportResponse)
async def update_summary_report(
    encounter_id: UUID,
    update_data: SummaryReportUpdate,
    current_doctor: User = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Update summary report (Doctor only).
    Allows editing report content and changing status.
    """
    summary = db.query(SummaryReport).filter(
        SummaryReport.encounter_id == encounter_id
    ).first()

    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Summary report not found"
        )

    # Update fields if provided
    if update_data.status is not None:
        summary.status = update_data.status
    if update_data.priority is not None:
        summary.priority = update_data.priority
    if update_data.content is not None:
        summary.content = update_data.content.model_dump()

    summary.updated_at = datetime.utcnow()

    # If marking as REVIEWED, update encounter's doctor_id
    if update_data.status == ReportStatus.REVIEWED:
        encounter = db.query(Encounter).filter(
            Encounter.encounter_id == encounter_id
        ).first()
        if encounter:
            encounter.doctor_id = current_doctor.user_id

    db.commit()
    db.refresh(summary)

    return summary


@router.patch("/{encounter_id}/summary/symptoms", response_model=SummaryReportResponse)
async def update_patient_symptoms(
    encounter_id: UUID,
    update_data: PatientSymptomsUpdate,
    current_patient: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    Update patient's own symptoms in the summary report.
    Patients can only update symptoms, not diagnosis or treatment.
    """
    # Verify the encounter belongs to the patient
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id,
        Encounter.patient_id == current_patient.user_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found or access denied"
        )

    # Get the summary report
    summary = db.query(SummaryReport).filter(
        SummaryReport.encounter_id == encounter_id
    ).first()

    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Summary report not found"
        )

    # Update only the symptoms field in the content
    content = summary.content.copy()
    content['symptoms'] = update_data.symptoms
    summary.content = content
    summary.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(summary)

    return summary


@router.get("/{encounter_id}/summary", response_model=SummaryReportResponse)
async def get_summary_report(
    encounter_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get summary report for an encounter
    """
    # Verify access to encounter
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Authorization
    if current_user.role == UserRole.PATIENT and encounter.patient_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )

    summary = db.query(SummaryReport).filter(
        SummaryReport.encounter_id == encounter_id
    ).first()

    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Summary report not found"
        )

    return summary


# ============================================================================
# MEDIA FILE MANAGEMENT
# ============================================================================

@router.post("/{encounter_id}/media", response_model=List[MediaFileResponse])
async def upload_media_files(
    encounter_id: UUID,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Upload media files (PDF, images, video) to an encounter.
    Patients and doctors can upload files.
    """
    # Verify encounter exists
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Authorization
    if current_user.role == UserRole.PATIENT:
        if encounter.patient_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to upload files to this encounter"
            )
    elif current_user.role == UserRole.DOCTOR:
        if encounter.doctor_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to upload files to this encounter"
            )

    # Save files using FileService
    saved_files = await FileService.save_encounter_files(files, encounter_id, db)

    return saved_files


@router.get("/{encounter_id}/media", response_model=List[MediaFileResponse])
async def get_media_files(
    encounter_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all media files for an encounter
    """
    # Verify access to encounter
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Authorization
    if current_user.role == UserRole.PATIENT and encounter.patient_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )

    media_files = db.query(MediaFile).filter(
        MediaFile.encounter_id == encounter_id
    ).order_by(MediaFile.uploaded_at.desc()).all()

    return media_files


@router.get("/{encounter_id}/media/{file_id}")
async def download_media_file(
    encounter_id: UUID,
    file_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Download a specific media file
    """
    # Verify access to encounter
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Authorization
    if current_user.role == UserRole.PATIENT and encounter.patient_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )

    # Get file
    media_file = db.query(MediaFile).filter(
        MediaFile.file_id == file_id,
        MediaFile.encounter_id == encounter_id
    ).first()

    if not media_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    # Return file
    return FileResponse(media_file.file_path, filename=media_file.filename)


# ============================================================================
# VOICE INTEGRATION & AI PROCESSING
# ============================================================================

@router.post("/voice/transcribe", response_model=VoiceTranscriptionResponse)
async def transcribe_voice(
    voice_request: VoiceTranscriptionRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Transcribe voice audio using OpenAI Whisper.
    Returns transcribed text for use in encounters.
    """
    try:
        transcription = openai_service.transcribe_audio(voice_request.audio_base64)
        return VoiceTranscriptionResponse(
            transcribed_text=transcription
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {str(e)}"
        )


@router.post("/{encounter_id}/generate-summary", response_model=SummaryReportResponse)
async def generate_ai_summary(
    encounter_id: UUID,
    request: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate AI-powered summary report for an encounter.
    Uses patient description, health history, vitals, and lab results.
    Auto-assesses priority level based on symptoms and vitals.
    """
    # Verify encounter exists and user has access
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Authorization
    if current_user.role == UserRole.PATIENT:
        if encounter.patient_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
    elif current_user.role == UserRole.DOCTOR:
        # Doctors can generate summaries for any encounter they're working on
        pass

    # Extract patient_description from request body
    patient_description = request.get('patient_description', '')
    if not patient_description:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="patient_description is required"
        )

    try:
        summary_report = encounter_service.generate_ai_summary(
            encounter_id=encounter_id,
            patient_description=patient_description,
            db=db,
            auto_assess_priority=True
        )
        return summary_report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary: {str(e)}"
        )


@router.post("/{encounter_id}/process-voice")
async def process_voice_encounter(
    encounter_id: UUID,
    voice_request: VoiceTranscriptionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Complete voice-first workflow:
    1. Transcribe voice audio
    2. Generate AI summary report
    Returns both transcription and summary report.
    """
    # Verify encounter exists and user has access
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Authorization
    if current_user.role == UserRole.PATIENT:
        if encounter.patient_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )

    try:
        result = encounter_service.process_voice_encounter(
            encounter_id=encounter_id,
            audio_base64=voice_request.audio_base64,
            db=db
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process voice encounter: {str(e)}"
        )


@router.get("/{encounter_id}/vitals-analysis")
async def analyze_encounter_vitals(
    encounter_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get AI analysis of vitals for an encounter.
    Provides health insights and recommendations based on vital signs.
    """
    # Verify encounter exists and user has access
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Authorization
    if current_user.role == UserRole.PATIENT and encounter.patient_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )

    try:
        analysis = encounter_service.analyze_encounter_vitals(
            encounter_id=encounter_id,
            db=db
        )
        return analysis
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze vitals: {str(e)}"
        )


@router.post("/{encounter_id}/extract-report-fields")
async def extract_report_fields_from_voice(
    encounter_id: UUID,
    voice_request: VoiceTranscriptionRequest,
    current_doctor: User = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Extract structured report fields from doctor's voice recording.
    Doctor speaks all updates, AI extracts which content belongs to which field.
    Returns structured data for review before saving.
    """
    # Verify encounter exists
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Get existing summary report for context
    summary = db.query(SummaryReport).filter(
        SummaryReport.encounter_id == encounter_id
    ).first()

    existing_content = summary.content if summary else None

    try:
        # Transcribe voice
        transcription = openai_service.transcribe_audio(voice_request.audio_base64)

        # Extract fields using new OpenAI service method
        extracted_fields = openai_service.extract_report_fields_from_voice(
            transcription=transcription,
            existing_content=existing_content
        )

        return {
            "transcription": transcription,
            "extracted_fields": extracted_fields,
            "existing_content": existing_content
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract fields: {str(e)}"
        )


@router.post("/{encounter_id}/start-call")
async def start_voice_call(
    encounter_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Initialize a voice/video call for an encounter.
    Returns Agora credentials and channel info.
    """
    # Verify encounter exists and user has access
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Authorization: only patient or assigned doctor
    if current_user.role == UserRole.PATIENT:
        if encounter.patient_id != current_user.user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    elif current_user.role == UserRole.DOCTOR:
        if encounter.doctor_id != current_user.user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    # Generate Agora token and channel
    from app.services.agora_service import agora_service
    call_data = agora_service.generate_call_token(
        channel_name=f"encounter_{encounter_id}",
        user_id=str(current_user.user_id)
    )

    return call_data


@router.post("/{encounter_id}/process-call-recording")
async def process_call_recording(
    encounter_id: UUID,
    voice_request: VoiceTranscriptionRequest,
    current_doctor: User = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Process recorded call audio:
    1. Transcribe entire conversation
    2. Extract medical information (symptoms, diagnosis, treatment, etc.)
    3. Present to doctor for review

    This endpoint does NOT update the encounter automatically.
    It returns extracted data for doctor review.
    """
    # Verify encounter
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id
    ).first()

    if not encounter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    try:
        # Transcribe call recording
        transcription = openai_service.transcribe_audio(voice_request.audio_base64)

        # Extract medical information from conversation
        extracted_data = openai_service.extract_medical_info_from_conversation(
            conversation_transcription=transcription
        )

        return {
            "transcription": transcription,
            "extracted_data": extracted_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process call recording: {str(e)}"
        )


# ============================================================================
# LAB ORDERS AND PRESCRIPTIONS
# ============================================================================

@router.post("/{encounter_id}/lab-orders")
async def create_lab_order_for_encounter(
    encounter_id: UUID,
    request: LabOrderRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a lab order for an encounter.
    Both patients and doctors can create lab orders.
    """
    from app.models_v2 import LabOrder, OrderStatus

    # Verify encounter exists and user has access
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Authorization
    if current_user.role == UserRole.PATIENT and encounter.patient_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )

    # Verify lab exists
    lab = db.query(User).filter(
        User.user_id == request.lab_id,
        User.role == UserRole.LAB
    ).first()

    if not lab:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lab not found"
        )

    # Create lab order
    new_order = LabOrder(
        encounter_id=encounter_id,
        lab_id=request.lab_id,
        instructions=request.instructions,
        status=OrderStatus.SENT
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    return new_order


@router.post("/{encounter_id}/prescriptions")
async def create_prescription_for_encounter(
    encounter_id: UUID,
    request: PrescriptionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a prescription for an encounter.
    Both patients and doctors can create prescriptions.
    """
    from app.models_v2 import Prescription, OrderStatus

    # Verify encounter exists and user has access
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Authorization
    if current_user.role == UserRole.PATIENT and encounter.patient_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )

    # Verify pharmacy exists
    pharmacy = db.query(User).filter(
        User.user_id == request.pharmacy_id,
        User.role == UserRole.PHARMACY
    ).first()

    if not pharmacy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pharmacy not found"
        )

    # Create prescription
    new_prescription = Prescription(
        encounter_id=encounter_id,
        pharmacy_id=request.pharmacy_id,
        instructions=request.instructions,
        status=OrderStatus.SENT
    )

    db.add(new_prescription)
    db.commit()
    db.refresh(new_prescription)

    return new_prescription


@router.get("/{encounter_id}/translate-summary")
async def translate_summary_to_gujarati(
    encounter_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Translate encounter summary report to Gujarati while keeping medical terms in English.
    """
    # Get encounter
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Check access - patient can only access their own, doctors can access assigned encounters
    if current_user.role == UserRole.PATIENT:
        if encounter.patient_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    elif current_user.role == UserRole.DOCTOR:
        if encounter.doctor_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

    # Get summary report
    summary = db.query(SummaryReport).filter(
        SummaryReport.encounter_id == encounter_id
    ).first()

    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Summary report not found"
        )

    # Translate to Gujarati
    translated_content = openai_service.translate_consultation_to_gujarati(summary.content)

    return {
        "translated_content": translated_content,
        "original_content": summary.content
    }
