from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models import User, Consultation, UserProfile, UserRole, ReportStatus, DoctorPatientRelationship
from app.schemas import ConsultationCreate, ConsultationResponse, ConsultationUpdate, VoiceTranscriptionRequest, ConsultationFileResponse
from app.auth import get_current_active_user, get_current_doctor
from app.services.gemini_service import gemini_service
from app.services.file_service import FileService

router = APIRouter(prefix="/api/consultations", tags=["Consultations"])


@router.post("/", response_model=ConsultationResponse)
async def create_consultation(
    consultation: ConsultationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new consultation with AI-generated report
    """
    try:
        # Get user profile for health history
        profile = db.query(UserProfile).filter(
            UserProfile.user_id == current_user.id
        ).first()

        health_history = profile.health_condition if profile and profile.health_condition else ""

        # Generate AI consultation report
        report = gemini_service.generate_consultation_report(
            consultation.patient_description,
            health_history
        )

        # Create consultation record
        new_consultation = Consultation(
            user_id=current_user.id,
            patient_description=consultation.patient_description,
            symptoms=report.get('symptoms', ''),
            potential_diagnosis=report.get('potential_diagnosis', ''),
            potential_treatment=report.get('potential_treatment', ''),
            next_steps=report.get('next_steps', '')
        )

        db.add(new_consultation)
        db.commit()
        db.refresh(new_consultation)

        return new_consultation

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create consultation: {str(e)}"
        )


@router.get("/", response_model=List[ConsultationResponse])
async def get_consultations(
    status_filter: Optional[ReportStatus] = None,
    patient_id: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get consultations based on user role:
    - Patients: Only their own consultations with status=REVIEWED
    - Doctors: Pending consultations OR consultations for their patients
    """
    query = db.query(Consultation)

    if current_user.role == UserRole.PATIENT:
        # Patients can only see their own REVIEWED consultations
        query = query.filter(
            Consultation.user_id == current_user.id,
            Consultation.status == ReportStatus.REVIEWED
        )
    elif current_user.role == UserRole.DOCTOR:
        # Doctors can see pending reports or reports for their patients
        if patient_id:
            # Specific patient (check doctor has relationship)
            relationship = db.query(DoctorPatientRelationship).filter(
                DoctorPatientRelationship.doctor_id == current_user.id,
                DoctorPatientRelationship.patient_id == patient_id
            ).first()
            if not relationship:
                # Allow viewing pending reports even without relationship
                query = query.filter(
                    Consultation.user_id == patient_id,
                    Consultation.status == ReportStatus.PENDING
                )
            else:
                query = query.filter(Consultation.user_id == patient_id)
        elif status_filter:
            # Filter by status
            query = query.filter(Consultation.status == status_filter)
        else:
            # All pending consultations OR consultations reviewed by this doctor
            query = query.filter(
                (Consultation.status == ReportStatus.PENDING) |
                (Consultation.doctor_id == current_user.id)
            )

    # Apply status filter if provided
    if status_filter and current_user.role == UserRole.PATIENT:
        # Patients can only see REVIEWED anyway
        pass

    consultations = query.order_by(Consultation.created_at.desc()).all()
    return consultations


@router.get("/{consultation_id}", response_model=ConsultationResponse)
async def get_consultation(
    consultation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific consultation by ID
    - Patients: Can only see their own consultations if status=REVIEWED
    - Doctors: Can see PENDING consultations or consultations they reviewed
    """
    consultation = db.query(Consultation).filter(
        Consultation.id == consultation_id
    ).first()

    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    # Authorization checks
    if current_user.role == UserRole.PATIENT:
        # Patients can only see their own REVIEWED consultations
        if consultation.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this consultation"
            )
        if consultation.status != ReportStatus.REVIEWED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Consultation not yet reviewed by doctor"
            )
    elif current_user.role == UserRole.DOCTOR:
        # Doctors can see PENDING or their own reviewed consultations
        if consultation.status != ReportStatus.PENDING and consultation.doctor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this consultation"
            )

    return consultation


@router.patch("/{consultation_id}", response_model=ConsultationResponse)
async def update_consultation(
    consultation_id: int,
    update_data: ConsultationUpdate,
    current_doctor: User = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Update consultation report (Doctor only)
    - Allows editing report fields
    - Can mark as REVIEWED
    - Creates doctor-patient relationship
    """
    consultation = db.query(Consultation).filter(
        Consultation.id == consultation_id
    ).first()

    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    # Update fields if provided
    if update_data.symptoms is not None:
        consultation.symptoms = update_data.symptoms
    if update_data.potential_diagnosis is not None:
        consultation.potential_diagnosis = update_data.potential_diagnosis
    if update_data.potential_treatment is not None:
        consultation.potential_treatment = update_data.potential_treatment
    if update_data.next_steps is not None:
        consultation.next_steps = update_data.next_steps
    if update_data.doctor_notes is not None:
        consultation.doctor_notes = update_data.doctor_notes

    # Update timestamps and doctor assignment
    consultation.edited_at = datetime.utcnow()
    consultation.doctor_id = current_doctor.id

    # Update status if provided
    if update_data.status is not None:
        consultation.status = update_data.status
        if update_data.status == ReportStatus.REVIEWED:
            consultation.reviewed_at = datetime.utcnow()

            # Create doctor-patient relationship if doesn't exist
            existing_relationship = db.query(DoctorPatientRelationship).filter(
                DoctorPatientRelationship.doctor_id == current_doctor.id,
                DoctorPatientRelationship.patient_id == consultation.user_id
            ).first()

            if not existing_relationship:
                relationship = DoctorPatientRelationship(
                    doctor_id=current_doctor.id,
                    patient_id=consultation.user_id
                )
                db.add(relationship)

    db.commit()
    db.refresh(consultation)

    return consultation


@router.post("/{consultation_id}/files", response_model=List[ConsultationFileResponse])
async def upload_consultation_files(
    consultation_id: int,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Upload files to a consultation
    """
    consultation = db.query(Consultation).filter(
        Consultation.id == consultation_id
    ).first()

    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    # Only the patient who owns the consultation can upload files
    if consultation.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to upload files to this consultation"
        )

    # Save files
    saved_files = await FileService.save_files(files, consultation_id, db)

    return saved_files


@router.get("/{consultation_id}/files", response_model=List[ConsultationFileResponse])
async def get_consultation_files(
    consultation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all files for a consultation
    """
    consultation = db.query(Consultation).filter(
        Consultation.id == consultation_id
    ).first()

    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    # Check authorization
    if current_user.role == UserRole.PATIENT:
        if consultation.user_id != current_user.id or consultation.status != ReportStatus.REVIEWED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view consultation files"
            )
    elif current_user.role == UserRole.DOCTOR:
        if consultation.status != ReportStatus.PENDING and consultation.doctor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view consultation files"
            )

    return consultation.files


@router.get("/{consultation_id}/files/{file_id}")
async def download_consultation_file(
    consultation_id: int,
    file_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Download a consultation file
    """
    consultation = db.query(Consultation).filter(
        Consultation.id == consultation_id
    ).first()

    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    # Check authorization
    if current_user.role == UserRole.PATIENT:
        if consultation.user_id != current_user.id or consultation.status != ReportStatus.REVIEWED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to download this file"
            )
    elif current_user.role == UserRole.DOCTOR:
        if consultation.status != ReportStatus.PENDING and consultation.doctor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to download this file"
            )

    # Get file path
    file_path = FileService.get_file_path(file_id, db)

    # Return file
    return FileResponse(file_path)


@router.post("/transcribe-description")
async def transcribe_consultation_description(
    voice_request: VoiceTranscriptionRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Transcribe voice description of health issue
    """
    try:
        transcription = gemini_service.transcribe_audio(voice_request.audio_base64)
        return {"transcription": transcription}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
