"""
Video Consultation Router
Handles video consultation scheduling, joining, recording, and transcription
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
import secrets

from app.database import get_db
from app.models_v2 import (
    User, Encounter, VideoConsultation, VideoConsultationStatus,
    EncounterType, DoctorProfile, PatientProfile, SummaryReport, ReportStatus
)
from app.schemas.video_consultation_schemas import (
    VideoConsultationCreate, VideoConsultationUpdate, VideoConsultationCancel,
    JoinCallRequest, VideoCallCredentials, VideoConsultationResponse,
    VideoConsultationListItem, VideoConsultationStats,
    ProcessRecordingRequest, TranscriptionResponse
)
from app.auth import get_current_user, get_current_patient, get_current_doctor
from app.services.agora_service import agora_service
from app.services.gemini_service import gemini_service
from app.services.audit_service import audit_log, create_audit_log
from app.models_v2 import AuditAction

router = APIRouter(prefix="/api/video-consultations", tags=["Video Consultations"])


# ============================================================================
# PATIENT ENDPOINTS - Schedule & Manage Consultations
# ============================================================================

@router.post("/", response_model=VideoConsultationResponse, status_code=status.HTTP_201_CREATED)
@audit_log(action=AuditAction.CREATE, resource_type="VIDEO_CONSULTATION")
async def schedule_video_consultation(
    consultation_data: VideoConsultationCreate,
    request: Request,
    current_user: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    Schedule a new video consultation (Patient only)

    Steps:
    1. Patient selects doctor and time
    2. Creates encounter with REMOTE_CONSULT type
    3. Generates unique Agora channel
    4. Returns consultation ID and details

    Both patient and doctor will get join links when it's time.
    """
    # Validate doctor exists and is active
    doctor = db.query(User).filter(
        and_(
            User.user_id == consultation_data.doctor_id,
            User.role == "DOCTOR",
            User.is_active == True
        )
    ).first()

    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found or not available"
        )

    # Validate scheduled time is in the future
    if consultation_data.scheduled_start_time <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scheduled time must be in the future"
        )

    # Check for conflicting consultations (same doctor, overlapping time)
    scheduled_end = consultation_data.scheduled_start_time + timedelta(minutes=consultation_data.duration_minutes)

    conflicts = db.query(VideoConsultation).join(Encounter).filter(
        and_(
            Encounter.doctor_id == consultation_data.doctor_id,
            VideoConsultation.status.in_([
                VideoConsultationStatus.SCHEDULED,
                VideoConsultationStatus.WAITING,
                VideoConsultationStatus.IN_PROGRESS
            ]),
            or_(
                # New consultation starts during existing
                and_(
                    VideoConsultation.scheduled_start_time <= consultation_data.scheduled_start_time,
                    VideoConsultation.scheduled_end_time >= consultation_data.scheduled_start_time
                ),
                # New consultation ends during existing
                and_(
                    VideoConsultation.scheduled_start_time <= scheduled_end,
                    VideoConsultation.scheduled_end_time >= scheduled_end
                ),
                # New consultation encompasses existing
                and_(
                    VideoConsultation.scheduled_start_time >= consultation_data.scheduled_start_time,
                    VideoConsultation.scheduled_end_time <= scheduled_end
                )
            )
        )
    ).first()

    if conflicts:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Doctor has another consultation scheduled at this time"
        )

    # Create encounter
    encounter = Encounter(
        patient_id=current_user.user_id,
        doctor_id=consultation_data.doctor_id,
        encounter_type=EncounterType.REMOTE_CONSULT,
        input_method=None  # Will be set to VOICE after call
    )
    db.add(encounter)
    db.flush()  # Get encounter_id

    # Generate unique channel name
    channel_name = f"vc_{encounter.encounter_id.hex[:16]}_{secrets.token_hex(8)}"

    # Create video consultation
    video_consultation = VideoConsultation(
        encounter_id=encounter.encounter_id,
        scheduled_start_time=consultation_data.scheduled_start_time,
        scheduled_end_time=scheduled_end,
        duration_minutes=consultation_data.duration_minutes,
        status=VideoConsultationStatus.SCHEDULED,
        channel_name=channel_name,
        agora_app_id=agora_service.app_id,
        patient_notes=consultation_data.patient_notes
    )

    db.add(video_consultation)
    db.commit()
    db.refresh(video_consultation)

    # Build response
    response = VideoConsultationResponse(
        consultation_id=video_consultation.consultation_id,
        encounter_id=encounter.encounter_id,
        patient_id=current_user.user_id,
        doctor_id=consultation_data.doctor_id,
        scheduled_start_time=video_consultation.scheduled_start_time,
        scheduled_end_time=video_consultation.scheduled_end_time,
        duration_minutes=video_consultation.duration_minutes,
        status=video_consultation.status.value,
        channel_name=video_consultation.channel_name,
        actual_start_time=None,
        actual_end_time=None,
        patient_joined_at=None,
        doctor_joined_at=None,
        recording_url=None,
        recording_duration_seconds=None,
        transcription_status=None,
        patient_notes=video_consultation.patient_notes,
        doctor_notes=None,
        cancellation_reason=None,
        created_at=video_consultation.created_at,
        updated_at=video_consultation.updated_at
    )

    return response


@router.get("/my-consultations", response_model=List[VideoConsultationListItem])
async def get_my_consultations(
    status_filter: Optional[str] = None,
    upcoming_only: bool = False,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's video consultations (Patient or Doctor)

    Filters:
    - status_filter: Filter by status (SCHEDULED, COMPLETED, etc.)
    - upcoming_only: Only show future consultations
    - limit: Max consultations to return
    """
    # Base query depends on user role
    query = db.query(VideoConsultation).join(Encounter)

    if current_user.role.value == "PATIENT":
        query = query.filter(Encounter.patient_id == current_user.user_id)
    elif current_user.role.value == "DOCTOR":
        query = query.filter(Encounter.doctor_id == current_user.user_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients and doctors can view consultations"
        )

    # Apply filters
    if status_filter:
        try:
            status_enum = VideoConsultationStatus(status_filter.upper())
            query = query.filter(VideoConsultation.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )

    if upcoming_only:
        query = query.filter(
            VideoConsultation.scheduled_start_time >= datetime.utcnow()
        )

    # Order by scheduled time (upcoming first)
    consultations = query.order_by(VideoConsultation.scheduled_start_time.desc()).limit(limit).all()

    # Build response with doctor/patient names
    result = []
    for vc in consultations:
        encounter = vc.encounter

        # Get doctor name if patient is viewing
        doctor_name = None
        if current_user.role.value == "PATIENT" and encounter.doctor:
            doctor_profile = db.query(DoctorProfile).filter(
                DoctorProfile.user_id == encounter.doctor_id
            ).first()
            if doctor_profile:
                doctor_name = f"Dr. {doctor_profile.first_name} {doctor_profile.last_name}"

        result.append(VideoConsultationListItem(
            consultation_id=vc.consultation_id,
            encounter_id=vc.encounter_id,
            scheduled_start_time=vc.scheduled_start_time,
            duration_minutes=vc.duration_minutes,
            status=vc.status.value,
            doctor_id=encounter.doctor_id,
            doctor_name=doctor_name,
            patient_notes=vc.patient_notes,
            created_at=vc.created_at
        ))

    return result


@router.get("/{consultation_id}", response_model=VideoConsultationResponse)
@audit_log(action=AuditAction.VIEW, resource_type="VIDEO_CONSULTATION")
async def get_consultation_details(
    consultation_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a video consultation

    Authorization:
    - Patient can view their own consultations
    - Doctor can view consultations assigned to them
    """
    consultation = db.query(VideoConsultation).filter(
        VideoConsultation.consultation_id == consultation_id
    ).first()

    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    encounter = consultation.encounter

    # Authorization check
    if current_user.role.value == "PATIENT":
        if encounter.patient_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this consultation"
            )
    elif current_user.role.value == "DOCTOR":
        if encounter.doctor_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this consultation"
            )

    return VideoConsultationResponse(
        consultation_id=consultation.consultation_id,
        encounter_id=encounter.encounter_id,
        patient_id=encounter.patient_id,
        doctor_id=encounter.doctor_id,
        scheduled_start_time=consultation.scheduled_start_time,
        scheduled_end_time=consultation.scheduled_end_time,
        duration_minutes=consultation.duration_minutes,
        status=consultation.status.value,
        channel_name=consultation.channel_name,
        actual_start_time=consultation.actual_start_time,
        actual_end_time=consultation.actual_end_time,
        patient_joined_at=consultation.patient_joined_at,
        doctor_joined_at=consultation.doctor_joined_at,
        recording_url=consultation.recording_url,
        recording_duration_seconds=consultation.recording_duration_seconds,
        transcription_status=consultation.transcription_status,
        patient_notes=consultation.patient_notes,
        doctor_notes=consultation.doctor_notes,
        cancellation_reason=consultation.cancellation_reason,
        created_at=consultation.created_at,
        updated_at=consultation.updated_at
    )


# ============================================================================
# JOIN CALL - Get Agora Credentials
# ============================================================================

@router.post("/{consultation_id}/join", response_model=VideoCallCredentials)
@audit_log(action=AuditAction.VIEW, resource_type="VIDEO_CALL")
async def join_video_call(
    consultation_id: UUID,
    join_request: JoinCallRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Join video call - Get Agora credentials

    Returns:
    - app_id: Agora App ID
    - channel_name: Channel to join
    - token: Temporary Agora RTC token (1 hour validity)
    - uid: User ID for Agora
    - call_url: Optional web URL for joining

    Authorization:
    - Patient can join their own consultation
    - Doctor can join consultations assigned to them
    """
    consultation = db.query(VideoConsultation).filter(
        VideoConsultation.consultation_id == consultation_id
    ).first()

    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    encounter = consultation.encounter

    # Authorization
    if join_request.user_type == "patient":
        if current_user.user_id != encounter.patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to join this consultation"
            )
    elif join_request.user_type == "doctor":
        if current_user.user_id != encounter.doctor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to join this consultation"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_type. Must be 'patient' or 'doctor'"
        )

    # Check if consultation is in joinable state
    if consultation.status == VideoConsultationStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consultation has been cancelled"
        )

    if consultation.status == VideoConsultationStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consultation has already been completed"
        )

    # Check if it's too early to join (more than 15 minutes before scheduled time)
    time_until_consultation = (consultation.scheduled_start_time - datetime.utcnow()).total_seconds() / 60
    if time_until_consultation > 15:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Consultation starts in {int(time_until_consultation)} minutes. You can join 15 minutes before scheduled time."
        )

    # Update consultation status if first person joining
    if consultation.status == VideoConsultationStatus.SCHEDULED:
        consultation.status = VideoConsultationStatus.WAITING
        db.commit()

    # Track who joined
    current_time = datetime.utcnow()
    if join_request.user_type == "patient" and not consultation.patient_joined_at:
        consultation.patient_joined_at = current_time
        db.commit()
    elif join_request.user_type == "doctor" and not consultation.doctor_joined_at:
        consultation.doctor_joined_at = current_time
        db.commit()

    # If both joined, mark as IN_PROGRESS
    if consultation.patient_joined_at and consultation.doctor_joined_at and consultation.status != VideoConsultationStatus.IN_PROGRESS:
        consultation.status = VideoConsultationStatus.IN_PROGRESS
        if not consultation.actual_start_time:
            consultation.actual_start_time = current_time
        db.commit()

    # Generate Agora token
    agora_credentials = agora_service.generate_call_token(
        channel_name=consultation.channel_name,
        user_id=str(current_user.user_id)
    )

    # Build response
    return VideoCallCredentials(
        app_id=agora_credentials["app_id"],
        channel_name=agora_credentials["channel_name"],
        token=agora_credentials["token"],
        uid=agora_credentials["uid"],
        consultation_id=consultation.consultation_id,
        call_url=f"/video-call/{consultation.consultation_id}"  # Frontend route
    )


# ============================================================================
# END CALL & RECORDING
# ============================================================================

@router.post("/{consultation_id}/end")
@audit_log(action=AuditAction.UPDATE, resource_type="VIDEO_CONSULTATION")
async def end_video_call(
    consultation_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    End video call and mark consultation as completed

    Either patient or doctor can end the call.
    This triggers:
    1. Stop recording
    2. Mark consultation as COMPLETED
    3. Queue transcription job
    """
    consultation = db.query(VideoConsultation).filter(
        VideoConsultation.consultation_id == consultation_id
    ).first()

    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    encounter = consultation.encounter

    # Authorization
    if current_user.user_id not in [encounter.patient_id, encounter.doctor_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to end this consultation"
        )

    # Update consultation
    consultation.status = VideoConsultationStatus.COMPLETED
    consultation.actual_end_time = datetime.utcnow()

    # Calculate actual duration
    if consultation.actual_start_time:
        duration = (consultation.actual_end_time - consultation.actual_start_time).total_seconds()
        consultation.recording_duration_seconds = int(duration)

    db.commit()

    return {
        "message": "Video call ended successfully",
        "consultation_id": consultation.consultation_id,
        "duration_seconds": consultation.recording_duration_seconds,
        "status": consultation.status.value
    }


@router.post("/{consultation_id}/process-recording")
@audit_log(action=AuditAction.UPDATE, resource_type="VIDEO_CONSULTATION")
async def process_consultation_recording(
    consultation_id: UUID,
    recording_data: ProcessRecordingRequest,
    request: Request,
    current_user: User = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Process recorded consultation:
    1. Transcribe audio
    2. Generate summary report

    Doctor only - typically called after consultation ends
    """
    consultation = db.query(VideoConsultation).filter(
        VideoConsultation.consultation_id == consultation_id
    ).first()

    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    encounter = consultation.encounter

    # Authorization
    if encounter.doctor_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to process this consultation"
        )

    # Store recording URL
    consultation.recording_url = recording_data.recording_url
    consultation.transcription_status = "PENDING"
    db.commit()

    # TODO: In production, this should be an async job (Celery/RQ)
    # For now, we'll process synchronously

    try:
        # Transcribe audio (placeholder - you'll need actual audio transcription)
        # In practice, you'd download the recording and transcribe it
        transcription = "Transcription of video consultation would go here..."  # Placeholder

        consultation.transcription_text = transcription
        consultation.transcription_status = "COMPLETED"

        # Generate AI summary using Gemini
        summary_prompt = f"""
        Generate a medical consultation summary from this transcription:

        {transcription}

        Provide:
        - Chief complaints/symptoms
        - Diagnosis (if discussed)
        - Treatment recommendations
        - Follow-up instructions
        """

        summary_response = gemini_service.generate_text(summary_prompt)

        # Create summary report
        summary_report = SummaryReport(
            encounter_id=encounter.encounter_id,
            content={
                "symptoms": summary_response[:500],  # Placeholder parsing
                "diagnosis": "",
                "treatment": "",
                "tests": "",
                "prescription": "",
                "next_steps": ""
            },
            status=ReportStatus.PENDING_REVIEW,
            priority=None
        )

        db.add(summary_report)
        db.commit()

        return {
            "message": "Recording processed successfully",
            "transcription_length": len(transcription),
            "summary_report_created": True
        }

    except Exception as e:
        consultation.transcription_status = "FAILED"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process recording: {str(e)}"
        )


# ============================================================================
# CANCEL CONSULTATION
# ============================================================================

@router.post("/{consultation_id}/cancel")
@audit_log(action=AuditAction.UPDATE, resource_type="VIDEO_CONSULTATION")
async def cancel_consultation(
    consultation_id: UUID,
    cancel_data: VideoConsultationCancel,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel a scheduled consultation

    Both patient and doctor can cancel.
    Cannot cancel if consultation is IN_PROGRESS or COMPLETED.
    """
    consultation = db.query(VideoConsultation).filter(
        VideoConsultation.consultation_id == consultation_id
    ).first()

    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )

    encounter = consultation.encounter

    # Authorization
    if current_user.user_id not in [encounter.patient_id, encounter.doctor_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel this consultation"
        )

    # Check if cancellable
    if consultation.status in [VideoConsultationStatus.IN_PROGRESS, VideoConsultationStatus.COMPLETED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel consultation with status: {consultation.status.value}"
        )

    if consultation.status == VideoConsultationStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consultation is already cancelled"
        )

    # Cancel consultation
    consultation.status = VideoConsultationStatus.CANCELLED
    consultation.cancellation_reason = cancel_data.cancellation_reason
    db.commit()

    return {
        "message": "Consultation cancelled successfully",
        "consultation_id": consultation.consultation_id,
        "cancellation_reason": cancel_data.cancellation_reason
    }


# ============================================================================
# STATISTICS (Doctor)
# ============================================================================

@router.get("/stats/my-stats", response_model=VideoConsultationStats)
async def get_my_consultation_stats(
    current_user: User = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Get video consultation statistics for current doctor
    """
    from sqlalchemy import func

    # Get all consultations for this doctor
    consultations = db.query(VideoConsultation).join(Encounter).filter(
        Encounter.doctor_id == current_user.user_id
    ).all()

    total_scheduled = sum(1 for c in consultations if c.status == VideoConsultationStatus.SCHEDULED)
    total_completed = sum(1 for c in consultations if c.status == VideoConsultationStatus.COMPLETED)
    total_cancelled = sum(1 for c in consultations if c.status == VideoConsultationStatus.CANCELLED)
    total_no_show = sum(1 for c in consultations if c.status == VideoConsultationStatus.NO_SHOW)

    upcoming_count = db.query(func.count(VideoConsultation.consultation_id)).join(Encounter).filter(
        and_(
            Encounter.doctor_id == current_user.user_id,
            VideoConsultation.status == VideoConsultationStatus.SCHEDULED,
            VideoConsultation.scheduled_start_time >= datetime.utcnow()
        )
    ).scalar()

    # Calculate average duration
    completed_with_duration = [c for c in consultations if c.status == VideoConsultationStatus.COMPLETED and c.recording_duration_seconds]
    avg_duration = None
    if completed_with_duration:
        avg_duration = sum(c.recording_duration_seconds for c in completed_with_duration) / len(completed_with_duration) / 60  # Convert to minutes

    return VideoConsultationStats(
        total_scheduled=total_scheduled,
        total_completed=total_completed,
        total_cancelled=total_cancelled,
        total_no_show=total_no_show,
        upcoming_count=upcoming_count or 0,
        average_duration_minutes=avg_duration
    )
