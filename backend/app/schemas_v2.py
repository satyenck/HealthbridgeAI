"""
Healthbridge AI v2 - Pydantic Schemas
Comprehensive request/response models for all entities
"""
from pydantic import BaseModel, EmailStr, Field, UUID4
from typing import Optional, Dict, Any, List
from datetime import datetime, date
from enum import Enum


# ============================================================================
# ENUMS
# ============================================================================

class UserRole(str, Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    LAB = "LAB"
    PHARMACY = "PHARMACY"
    ADMIN = "ADMIN"


class Gender(str, Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"
    PREFER_NOT_TO_SAY = "Prefer Not to Say"


class EncounterType(str, Enum):
    REMOTE_CONSULT = "REMOTE_CONSULT"
    LIVE_VISIT = "LIVE_VISIT"
    INITIAL_LOG = "INITIAL_LOG"


class InputMethod(str, Enum):
    VOICE = "VOICE"
    MANUAL = "MANUAL"


class ReportStatus(str, Enum):
    GENERATED = "GENERATED"
    PENDING_REVIEW = "PENDING_REVIEW"
    REVIEWED = "REVIEWED"


class Priority(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class OrderStatus(str, Enum):
    SENT = "SENT"
    RECEIVED = "RECEIVED"
    COMPLETED = "COMPLETED"


class AccessLevel(str, Enum):
    FULL_HISTORY = "FULL_HISTORY"
    SINGLE_ENCOUNTER = "SINGLE_ENCOUNTER"


# ============================================================================
# USER SCHEMAS
# ============================================================================

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    role: UserRole


class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: Optional[str] = None  # For future password auth


class UserResponse(UserBase):
    """Schema for user response"""
    user_id: UUID4
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# PATIENT PROFILE SCHEMAS
# ============================================================================

class PatientProfileBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date
    gender: Gender
    general_health_issues: Optional[str] = None
    primary_doctor_id: Optional[UUID4] = None
    notes: Optional[str] = None


class PatientProfileCreate(PatientProfileBase):
    """Schema for creating patient profile"""
    pass


class PatientProfileUpdate(BaseModel):
    """Schema for updating patient profile"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    general_health_issues: Optional[str] = None
    primary_doctor_id: Optional[UUID4] = None
    notes: Optional[str] = None


class PatientProfileResponse(PatientProfileBase):
    """Schema for patient profile response"""
    user_id: UUID4
    primary_doctor_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# DOCTOR PROFILE SCHEMAS
# ============================================================================

class DoctorProfileBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: str
    address: str
    hospital_name: Optional[str] = None
    specialty: Optional[str] = None
    degree: Optional[str] = None
    last_degree_year: Optional[int] = None


class DoctorProfileCreate(DoctorProfileBase):
    """Schema for creating doctor profile (Admin only)"""
    pass


class DoctorProfileUpdate(BaseModel):
    """Schema for updating doctor profile"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    hospital_name: Optional[str] = None
    specialty: Optional[str] = None
    degree: Optional[str] = None
    last_degree_year: Optional[int] = None


class DoctorProfileResponse(DoctorProfileBase):
    """Schema for doctor profile response"""
    user_id: UUID4
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# LAB PROFILE SCHEMAS
# ============================================================================

class LabProfileBase(BaseModel):
    business_name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    phone: str
    address: str
    license_year: Optional[int] = None


class LabProfileCreate(LabProfileBase):
    """Schema for creating lab profile (Admin only)"""
    pass


class LabProfileResponse(LabProfileBase):
    """Schema for lab profile response"""
    user_id: UUID4
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# PHARMACY PROFILE SCHEMAS
# ============================================================================

class PharmacyProfileBase(BaseModel):
    business_name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    phone: str
    address: str
    license_year: Optional[int] = None


class PharmacyProfileCreate(PharmacyProfileBase):
    """Schema for creating pharmacy profile (Admin only)"""
    pass


class PharmacyProfileResponse(PharmacyProfileBase):
    """Schema for pharmacy profile response"""
    user_id: UUID4
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# ENCOUNTER SCHEMAS
# ============================================================================

class EncounterBase(BaseModel):
    encounter_type: EncounterType
    input_method: Optional[InputMethod] = None


class EncounterCreate(EncounterBase):
    """Schema for creating an encounter"""
    patient_id: UUID4
    doctor_id: Optional[UUID4] = None


class EncounterResponse(EncounterBase):
    """Schema for encounter response"""
    encounter_id: UUID4
    patient_id: UUID4
    doctor_id: Optional[UUID4] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AssignDoctorRequest(BaseModel):
    """Schema for assigning a doctor to an encounter"""
    doctor_id: UUID4


# ============================================================================
# VITALS SCHEMAS
# ============================================================================

class VitalsBase(BaseModel):
    blood_pressure_sys: Optional[int] = Field(None, ge=50, le=250)
    blood_pressure_dia: Optional[int] = Field(None, ge=30, le=150)
    heart_rate: Optional[int] = Field(None, ge=30, le=200)
    oxygen_level: Optional[int] = Field(None, ge=70, le=100)
    weight: Optional[float] = Field(None, ge=1.0, le=500.0)
    temperature: Optional[float] = Field(None, ge=95.0, le=110.0)


class VitalsCreate(VitalsBase):
    """Schema for creating vitals log"""
    encounter_id: UUID4


class VitalsResponse(VitalsBase):
    """Schema for vitals response"""
    vital_id: UUID4
    encounter_id: UUID4
    recorded_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# LAB RESULTS SCHEMAS
# ============================================================================

class LabResultsBase(BaseModel):
    metrics: Dict[str, Any] = Field(
        ...,
        description="Lab metrics as key-value pairs (e.g., {'LDL': 100, 'HDL': 50})"
    )


class LabResultsCreate(LabResultsBase):
    """Schema for creating lab results"""
    encounter_id: UUID4


class LabResultsResponse(LabResultsBase):
    """Schema for lab results response"""
    log_id: UUID4
    encounter_id: UUID4
    recorded_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# SUMMARY REPORT SCHEMAS
# ============================================================================

class SummaryReportContent(BaseModel):
    """Structure for report content (JSONB)"""
    symptoms: str
    diagnosis: str
    treatment: str
    tests: Optional[str] = None
    prescription: Optional[str] = None
    next_steps: str


class SummaryReportBase(BaseModel):
    status: ReportStatus = ReportStatus.GENERATED
    priority: Optional[Priority] = None
    content: SummaryReportContent


class SummaryReportCreate(SummaryReportBase):
    """Schema for creating summary report"""
    encounter_id: UUID4


class SummaryReportUpdate(BaseModel):
    """Schema for updating summary report (doctor edits)"""
    status: Optional[ReportStatus] = None
    priority: Optional[Priority] = None
    content: Optional[SummaryReportContent] = None


class PatientSymptomsUpdate(BaseModel):
    """Schema for patient updating their own symptoms"""
    symptoms: str


class SummaryReportResponse(SummaryReportBase):
    """Schema for summary report response"""
    report_id: UUID4
    encounter_id: UUID4
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# LAB ORDER SCHEMAS
# ============================================================================

class LabOrderBase(BaseModel):
    instructions: str = Field(..., min_length=1)


class LabOrderCreate(LabOrderBase):
    """Schema for creating lab order"""
    encounter_id: UUID4
    lab_id: UUID4


class LabOrderRequest(BaseModel):
    """Schema for lab order request from API endpoint (encounter_id comes from path)"""
    lab_id: UUID4
    instructions: str = Field(..., min_length=1)


class LabOrderUpdate(BaseModel):
    """Schema for updating lab order status"""
    status: OrderStatus


class LabOrderResponse(LabOrderBase):
    """Schema for lab order response"""
    order_id: UUID4
    encounter_id: UUID4
    lab_id: UUID4
    status: OrderStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# PRESCRIPTION SCHEMAS
# ============================================================================

class PrescriptionBase(BaseModel):
    instructions: str = Field(..., min_length=1)


class PrescriptionCreate(PrescriptionBase):
    """Schema for creating prescription"""
    encounter_id: UUID4
    pharmacy_id: UUID4


class PrescriptionRequest(BaseModel):
    """Schema for prescription request from API endpoint (encounter_id comes from path)"""
    pharmacy_id: UUID4
    instructions: str = Field(..., min_length=1)


class PrescriptionUpdate(BaseModel):
    """Schema for updating prescription status"""
    status: OrderStatus


class PrescriptionResponse(PrescriptionBase):
    """Schema for prescription response"""
    prescription_id: UUID4
    encounter_id: UUID4
    pharmacy_id: UUID4
    status: OrderStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# MEDIA FILE SCHEMAS
# ============================================================================

class MediaFileBase(BaseModel):
    file_type: str
    filename: str


class MediaFileCreate(MediaFileBase):
    """Schema for creating media file record"""
    encounter_id: UUID4
    file_path: str
    file_size: int


class MediaFileResponse(MediaFileBase):
    """Schema for media file response"""
    file_id: UUID4
    encounter_id: UUID4
    file_path: str
    file_size: int
    uploaded_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# PROFILE SHARE SCHEMAS
# ============================================================================

class ProfileShareBase(BaseModel):
    access_level: AccessLevel = AccessLevel.FULL_HISTORY


class ProfileShareCreate(ProfileShareBase):
    """Schema for creating profile share"""
    patient_id: UUID4
    doctor_id: UUID4


class ProfileShareResponse(ProfileShareBase):
    """Schema for profile share response"""
    share_id: UUID4
    patient_id: UUID4
    doctor_id: UUID4
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# AUTHENTICATION SCHEMAS
# ============================================================================

class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"
    user_id: UUID4
    role: UserRole


class TokenData(BaseModel):
    """Token payload data"""
    user_id: Optional[UUID4] = None
    role: Optional[UserRole] = None


class GoogleLoginRequest(BaseModel):
    """Google OAuth login request"""
    id_token: str


class PhoneSendCodeRequest(BaseModel):
    """Phone send verification code request"""
    phone_number: str


class PhoneLoginRequest(BaseModel):
    """Phone verification login request"""
    phone_number: str
    verification_code: str


# ============================================================================
# VOICE & MEDIA UPLOAD SCHEMAS
# ============================================================================

class VoiceTranscriptionRequest(BaseModel):
    """Request for voice transcription"""
    encounter_id: Optional[UUID4] = None
    audio_base64: str


class VoiceTranscriptionResponse(BaseModel):
    """Response from voice transcription"""
    transcribed_text: str
    confidence: Optional[float] = None
    duration_seconds: Optional[float] = None


class MediaUploadResponse(BaseModel):
    """Response after media upload"""
    file_id: UUID4
    file_url: str
    message: str = "File uploaded successfully"


# ============================================================================
# COMPREHENSIVE ENCOUNTER VIEW (For Timeline)
# ============================================================================

class ComprehensiveEncounterResponse(BaseModel):
    """Complete encounter data with all related information"""
    encounter: EncounterResponse
    vitals: Optional[List[VitalsResponse]] = None
    lab_results: Optional[List[LabResultsResponse]] = None
    summary_report: Optional[SummaryReportResponse] = None
    lab_orders: Optional[List[LabOrderResponse]] = None
    prescriptions: Optional[List[PrescriptionResponse]] = None
    media_files: Optional[List[MediaFileResponse]] = None
    patient_info: Optional[PatientProfileResponse] = None
    doctor_info: Optional[DoctorProfileResponse] = None


# ============================================================================
# PATIENT TIMELINE SCHEMAS
# ============================================================================

class PatientTimelineResponse(BaseModel):
    """Patient's complete health timeline"""
    patient: PatientProfileResponse
    encounters: List[ComprehensiveEncounterResponse]
    vitals_trend: Optional[Dict[str, Any]] = Field(
        None,
        description="Aggregated vitals data for graphing"
    )


# ============================================================================
# ADMIN SCHEMAS
# ============================================================================

class AdminCreateProfessional(BaseModel):
    """Admin endpoint to create doctor/lab/pharmacy"""
    role: UserRole = Field(..., description="Must be DOCTOR, LAB, or PHARMACY")
    email: EmailStr
    phone: str
    profile_data: Dict[str, Any] = Field(
        ...,
        description="Role-specific profile data"
    )


class SystemStats(BaseModel):
    """System-wide statistics (Admin only)"""
    total_patients: int
    total_doctors: int
    total_labs: int
    total_pharmacies: int
    total_encounters: int
    pending_reports: int
    reviewed_reports: int
