"""
Schemas for Video Consultation feature
"""
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================

class VideoConsultationCreate(BaseModel):
    """Request to schedule a video consultation"""
    doctor_id: UUID
    scheduled_start_time: datetime
    duration_minutes: int = Field(default=30, ge=15, le=120)  # 15 min to 2 hours
    patient_notes: Optional[str] = Field(None, max_length=1000)


class VideoConsultationUpdate(BaseModel):
    """Update video consultation details"""
    scheduled_start_time: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=15, le=120)
    patient_notes: Optional[str] = Field(None, max_length=1000)
    doctor_notes: Optional[str] = Field(None, max_length=2000)


class VideoConsultationCancel(BaseModel):
    """Cancel video consultation"""
    cancellation_reason: str = Field(..., min_length=10, max_length=500)


class JoinCallRequest(BaseModel):
    """Request to join video call"""
    user_type: str = Field(..., pattern="^(patient|doctor)$")  # "patient" or "doctor"


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class VideoCallCredentials(BaseModel):
    """Agora credentials for joining video call"""
    app_id: str
    channel_name: str
    token: str
    uid: int
    consultation_id: UUID
    call_url: Optional[str] = None  # Web URL to join call


class VideoConsultationResponse(BaseModel):
    """Video consultation details"""
    consultation_id: UUID
    encounter_id: UUID
    patient_id: UUID
    doctor_id: Optional[UUID]

    # Scheduling
    scheduled_start_time: datetime
    scheduled_end_time: Optional[datetime]
    duration_minutes: int

    # Status
    status: str

    # Call metadata
    channel_name: str
    actual_start_time: Optional[datetime]
    actual_end_time: Optional[datetime]
    patient_joined_at: Optional[datetime]
    doctor_joined_at: Optional[datetime]

    # Recording
    recording_url: Optional[str]
    recording_duration_seconds: Optional[int]
    transcription_status: Optional[str]

    # Notes
    patient_notes: Optional[str]
    doctor_notes: Optional[str]
    cancellation_reason: Optional[str]

    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class VideoConsultationListItem(BaseModel):
    """Brief video consultation info for lists"""
    consultation_id: UUID
    encounter_id: UUID
    scheduled_start_time: datetime
    duration_minutes: int
    status: str
    doctor_id: Optional[UUID]
    doctor_name: Optional[str]
    patient_notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class VideoConsultationStats(BaseModel):
    """Statistics for video consultations"""
    total_scheduled: int
    total_completed: int
    total_cancelled: int
    total_no_show: int
    upcoming_count: int
    average_duration_minutes: Optional[float]


# ============================================================================
# RECORDING & TRANSCRIPTION SCHEMAS
# ============================================================================

class StartRecordingRequest(BaseModel):
    """Request to start recording"""
    channel_name: str


class StartRecordingResponse(BaseModel):
    """Response with recording details"""
    recording_sid: str
    resource_id: str
    message: str


class ProcessRecordingRequest(BaseModel):
    """Request to process recorded consultation"""
    recording_url: str


class TranscriptionResponse(BaseModel):
    """Transcription result"""
    transcription_text: str
    status: str
    word_count: int
