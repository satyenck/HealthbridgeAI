from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date, datetime
from app.models import Gender, AuthProvider, UserRole, ReportStatus


class UserCreate(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    auth_provider: AuthProvider
    google_id: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = UserRole.PATIENT
    license_number: Optional[str] = None
    specialization: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: Optional[str]
    phone_number: Optional[str]
    auth_provider: AuthProvider
    is_active: int
    role: UserRole
    license_number: Optional[str]
    specialization: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfileCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date
    gender: Gender
    health_condition: Optional[str] = None


class UserProfileResponse(BaseModel):
    id: int
    user_id: int
    first_name: str
    last_name: str
    date_of_birth: date
    gender: Gender
    health_condition: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ConsultationCreate(BaseModel):
    patient_description: str = Field(..., min_length=10)


class ConsultationFileResponse(BaseModel):
    id: int
    consultation_id: int
    file_type: str
    filename: str
    file_size: int
    uploaded_at: datetime

    class Config:
        from_attributes = True


class ConsultationResponse(BaseModel):
    id: int
    user_id: int
    patient_description: str
    symptoms: Optional[str]
    potential_diagnosis: Optional[str]
    potential_treatment: Optional[str]
    next_steps: Optional[str]
    status: ReportStatus
    doctor_id: Optional[int]
    reviewed_at: Optional[datetime]
    doctor_notes: Optional[str]
    edited_at: Optional[datetime]
    created_at: datetime
    files: Optional[List[ConsultationFileResponse]] = []

    class Config:
        from_attributes = True


class ConsultationUpdate(BaseModel):
    symptoms: Optional[str] = None
    potential_diagnosis: Optional[str] = None
    potential_treatment: Optional[str] = None
    next_steps: Optional[str] = None
    doctor_notes: Optional[str] = None
    status: Optional[ReportStatus] = None


class Token(BaseModel):
    access_token: str
    token_type: str
    role: Optional[UserRole] = None


class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[UserRole] = None


class GoogleAuthRequest(BaseModel):
    id_token: str


class PhoneAuthRequest(BaseModel):
    phone_number: str


class PhoneVerifyRequest(BaseModel):
    phone_number: str
    verification_code: str


class VoiceTranscriptionRequest(BaseModel):
    audio_base64: str


class DoctorVerifyRequest(BaseModel):
    phone_number: str
    verification_code: str
    license_number: str
    specialization: str


class RecordConsultationRequest(BaseModel):
    audio_base64: str
    patient_id: int
