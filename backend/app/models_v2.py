"""
Healthbridge AI - New Database Models (v2)
Based on ERD specification with UUID support and comprehensive health tracking
"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Date, Enum, Integer, Float, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum
import uuid


# ============================================================================
# ENUMS
# ============================================================================

class UserRole(str, enum.Enum):
    """Six distinct user roles in the system"""
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    DOCTOR_ASSISTANT = "DOCTOR_ASSISTANT"
    LAB = "LAB"
    PHARMACY = "PHARMACY"
    ADMIN = "ADMIN"


class Gender(str, enum.Enum):
    """Gender options for patient profiles"""
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"
    PREFER_NOT_TO_SAY = "Prefer Not to Say"


class EncounterType(str, enum.Enum):
    """Types of patient encounters"""
    REMOTE_CONSULT = "REMOTE_CONSULT"
    LIVE_VISIT = "LIVE_VISIT"
    INITIAL_LOG = "INITIAL_LOG"


class InputMethod(str, enum.Enum):
    """How data was captured"""
    VOICE = "VOICE"
    MANUAL = "MANUAL"


class ReportStatus(str, enum.Enum):
    """Summary report workflow states"""
    GENERATED = "GENERATED"
    PENDING_REVIEW = "PENDING_REVIEW"
    REVIEWED = "REVIEWED"


class Priority(str, enum.Enum):
    """AI-generated priority levels"""
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class OrderStatus(str, enum.Enum):
    """Status for lab orders and prescriptions"""
    SENT = "SENT"
    RECEIVED = "RECEIVED"
    COMPLETED = "COMPLETED"


class VideoConsultationStatus(str, enum.Enum):
    """Status for video consultations"""
    SCHEDULED = "SCHEDULED"
    WAITING = "WAITING"  # Waiting room - patient/doctor can join
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"


class AccessLevel(str, enum.Enum):
    """Profile sharing access levels"""
    FULL_HISTORY = "FULL_HISTORY"
    SINGLE_ENCOUNTER = "SINGLE_ENCOUNTER"


class AuditAction(str, enum.Enum):
    """HIPAA audit log actions"""
    VIEW = "VIEW"
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    EXPORT = "EXPORT"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    ACCESS_DENIED = "ACCESS_DENIED"


# ============================================================================
# CORE TABLES
# ============================================================================

class User(Base):
    """
    Central authentication table with UUID-based identity.
    Supports 5 roles: PATIENT, DOCTOR, LAB, PHARMACY, ADMIN
    """
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String, unique=True, nullable=True, index=True)
    phone_number = Column(String, unique=True, nullable=True, index=True)
    role = Column(Enum(UserRole), nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships to role-specific profiles
    patient_profile = relationship("PatientProfile", foreign_keys="[PatientProfile.user_id]", back_populates="user", uselist=False, cascade="all, delete-orphan")
    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    lab_profile = relationship("LabProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    pharmacy_profile = relationship("PharmacyProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    doctor_assistant_profile = relationship("DoctorAssistantProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")

    # Encounters as patient
    patient_encounters = relationship("Encounter", foreign_keys="[Encounter.patient_id]", back_populates="patient")

    # Encounters as doctor
    doctor_encounters = relationship("Encounter", foreign_keys="[Encounter.doctor_id]", back_populates="doctor")

    # Profile shares
    shared_profiles = relationship("ProfileShare", foreign_keys="[ProfileShare.patient_id]", back_populates="patient")
    received_shares = relationship("ProfileShare", foreign_keys="[ProfileShare.doctor_id]", back_populates="doctor")


# ============================================================================
# USER PROFILES (Role-Specific)
# ============================================================================

class PatientProfile(Base):
    """
    Patient-specific profile information.
    Multiple patients can link to same phone number (family members).
    """
    __tablename__ = "patient_profiles"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), primary_key=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=False, index=True)
    gender = Column(String(20), nullable=False)
    general_health_issues = Column(Text, nullable=True)
    primary_doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id], back_populates="patient_profile")
    primary_doctor = relationship("User", foreign_keys=[primary_doctor_id])


class DoctorProfile(Base):
    """
    Doctor-specific profile with credentials and specialization.
    Managed by Admin.
    """
    __tablename__ = "doctor_profiles"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), primary_key=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    address = Column(Text, nullable=False)
    hospital_name = Column(String(200), nullable=True)
    specialty = Column(String(100), nullable=True)
    degree = Column(String(100), nullable=True)
    last_degree_year = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="doctor_profile")


class LabProfile(Base):
    """
    Laboratory profile.
    Managed by Admin.
    """
    __tablename__ = "lab_profiles"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), primary_key=True)
    business_name = Column(String(200), nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    address = Column(Text, nullable=False)
    license_year = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="lab_profile")


class PharmacyProfile(Base):
    """
    Pharmacy profile.
    Managed by Admin.
    """
    __tablename__ = "pharmacy_profiles"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), primary_key=True)
    business_name = Column(String(200), nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    address = Column(Text, nullable=False)
    license_year = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="pharmacy_profile")


class DoctorAssistantProfile(Base):
    """
    Doctor's Assistant profile.
    Assistants help doctors with data entry, vitals recording, and follow-ups.
    Can be associated with up to 5 doctors.
    """
    __tablename__ = "doctor_assistant_profiles"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), primary_key=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=False)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="doctor_assistant_profile")
    doctor_associations = relationship("DoctorAssistantAssociation", back_populates="assistant", foreign_keys="[DoctorAssistantAssociation.assistant_id]", cascade="all, delete-orphan")


class DoctorAssistantAssociation(Base):
    """
    Junction table linking doctor assistants to doctors.
    Allows many-to-many relationship with max 5 doctors per assistant.
    """
    __tablename__ = "doctor_assistant_associations"

    association_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assistant_id = Column(UUID(as_uuid=True), ForeignKey("doctor_assistant_profiles.user_id"), nullable=False, index=True)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctor_profiles.user_id"), nullable=False, index=True)
    hospital_name = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    assistant = relationship("DoctorAssistantProfile", back_populates="doctor_associations", foreign_keys=[assistant_id])
    doctor = relationship("DoctorProfile", foreign_keys=[doctor_id])


# ============================================================================
# HEALTH HISTORY & TIMELINE (Longitudinal Data)
# ============================================================================

class Encounter(Base):
    """
    Represents a single point-in-time interaction.
    Parent entity for all medical data (vitals, reports, etc.)
    """
    __tablename__ = "encounters"

    encounter_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, index=True)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True, index=True)
    encounter_type = Column(Enum(EncounterType), nullable=False)
    input_method = Column(Enum(InputMethod), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    patient = relationship("User", foreign_keys=[patient_id], back_populates="patient_encounters")
    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="doctor_encounters")

    vitals = relationship("VitalsLog", back_populates="encounter", cascade="all, delete-orphan")
    lab_results = relationship("LabResultsLog", back_populates="encounter", cascade="all, delete-orphan")
    summary_report = relationship("SummaryReport", back_populates="encounter", uselist=False, cascade="all, delete-orphan")
    lab_orders = relationship("LabOrder", back_populates="encounter", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="encounter", cascade="all, delete-orphan")
    media_files = relationship("MediaFile", back_populates="encounter", cascade="all, delete-orphan")
    video_consultation = relationship("VideoConsultation", back_populates="encounter", uselist=False, cascade="all, delete-orphan")


class VideoConsultation(Base):
    """
    Video consultation appointments and call metadata.
    Supports scheduled video calls between patient and doctor with recording.
    """
    __tablename__ = "video_consultations"

    consultation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    encounter_id = Column(UUID(as_uuid=True), ForeignKey("encounters.encounter_id"), nullable=False, unique=True, index=True)

    # Scheduling
    scheduled_start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    scheduled_end_time = Column(DateTime(timezone=True), nullable=True)
    duration_minutes = Column(Integer, default=30)  # Expected duration

    # Status tracking
    status = Column(Enum(VideoConsultationStatus), default=VideoConsultationStatus.SCHEDULED, nullable=False, index=True)

    # Agora video call details
    channel_name = Column(String(255), nullable=False, unique=True, index=True)  # Unique Agora channel
    agora_app_id = Column(String(255), nullable=True)

    # Call session tracking
    actual_start_time = Column(DateTime(timezone=True), nullable=True)
    actual_end_time = Column(DateTime(timezone=True), nullable=True)
    patient_joined_at = Column(DateTime(timezone=True), nullable=True)
    doctor_joined_at = Column(DateTime(timezone=True), nullable=True)

    # Recording
    recording_sid = Column(String(255), nullable=True)  # Agora cloud recording SID
    recording_resource_id = Column(String(255), nullable=True)
    recording_url = Column(Text, nullable=True)  # URL to recorded video
    recording_duration_seconds = Column(Integer, nullable=True)

    # Transcription (similar to live visit)
    transcription_text = Column(Text, nullable=True)
    transcription_status = Column(String(50), nullable=True)  # PENDING, COMPLETED, FAILED

    # Metadata
    patient_notes = Column(Text, nullable=True)  # Patient's reason for consultation
    doctor_notes = Column(Text, nullable=True)  # Doctor's notes before/after call
    cancellation_reason = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    encounter = relationship("Encounter", back_populates="video_consultation")

    def __repr__(self):
        return f"<VideoConsultation {self.consultation_id} - {self.status.value}>"


class VitalsLog(Base):
    """
    Tracks biometric changes over time for graphing.
    Enables longitudinal health monitoring.
    """
    __tablename__ = "vitals_logs"

    vital_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    encounter_id = Column(UUID(as_uuid=True), ForeignKey("encounters.encounter_id"), nullable=False, index=True)

    # Existing vital signs (preserved)
    blood_pressure_sys = Column(Integer, nullable=True)
    blood_pressure_dia = Column(Integer, nullable=True)
    heart_rate = Column(Integer, nullable=True)
    oxygen_level = Column(Integer, nullable=True)
    weight = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)

    # Additional vital signs
    height = Column(Float, nullable=True)  # in cm
    bmi = Column(Float, nullable=True)  # body mass index
    respiratory_rate = Column(Integer, nullable=True)  # breaths per minute
    pulse = Column(Integer, nullable=True)  # pulse rate (bpm)

    # Blood pressure derived metrics
    mean_arterial_pressure = Column(Float, nullable=True)  # MAP
    pulse_pressure = Column(Float, nullable=True)  # Systolic - Diastolic

    # Oxygen and perfusion
    oxygen_saturation = Column(Float, nullable=True)  # SpO2 percentage
    perfusion_index = Column(Float, nullable=True)  # PI %
    capillary_refill_time = Column(Float, nullable=True)  # seconds

    # Metabolic measurements
    glucose_level = Column(Float, nullable=True)  # mg/dL
    fasting_glucose = Column(Float, nullable=True)  # mg/dL when fasting
    random_glucose = Column(Float, nullable=True)  # mg/dL random
    ketone_level = Column(Float, nullable=True)  # mmol/L

    # Body composition
    body_fat_percentage = Column(Float, nullable=True)
    muscle_mass = Column(Float, nullable=True)  # kg
    bone_mass = Column(Float, nullable=True)  # kg
    body_water_percentage = Column(Float, nullable=True)
    visceral_fat_rating = Column(Float, nullable=True)

    # Circumference measurements
    waist_circumference = Column(Float, nullable=True)  # cm
    hip_circumference = Column(Float, nullable=True)  # cm
    neck_circumference = Column(Float, nullable=True)  # cm
    chest_circumference = Column(Float, nullable=True)  # cm
    head_circumference = Column(Float, nullable=True)  # cm (pediatric)
    mid_upper_arm_circumference = Column(Float, nullable=True)  # cm (MUAC)

    # Waist-to-hip ratio
    waist_hip_ratio = Column(Float, nullable=True)

    # Pain assessment
    pain_level = Column(Integer, nullable=True)  # 0-10 scale
    pain_location = Column(Text, nullable=True)
    pain_description = Column(Text, nullable=True)

    # Neurological
    consciousness_level = Column(Text, nullable=True)  # Alert, Voice, Pain, Unresponsive (AVPU)
    glasgow_coma_scale = Column(Integer, nullable=True)  # GCS 3-15
    pupil_response_left = Column(Text, nullable=True)  # Normal, Sluggish, Fixed
    pupil_response_right = Column(Text, nullable=True)
    pupil_size_left = Column(Float, nullable=True)  # mm
    pupil_size_right = Column(Float, nullable=True)  # mm

    # Cardiovascular additional
    peripheral_pulse_strength = Column(Text, nullable=True)  # Strong, Weak, Absent
    capillary_refill_location = Column(Text, nullable=True)  # Central, Peripheral
    edema_location = Column(Text, nullable=True)
    edema_grade = Column(Integer, nullable=True)  # 1-4+

    # Respiratory additional
    breath_sounds = Column(Text, nullable=True)  # Clear, Wheezes, Crackles, etc.
    cough_type = Column(Text, nullable=True)  # Dry, Productive, etc.
    sputum_color = Column(Text, nullable=True)
    chest_expansion = Column(Text, nullable=True)  # Equal, Unequal
    use_of_accessory_muscles = Column(Boolean, nullable=True)

    # Skin assessment
    skin_color = Column(Text, nullable=True)  # Normal, Pale, Cyanotic, Jaundiced
    skin_temperature = Column(Text, nullable=True)  # Warm, Cool, Hot
    skin_moisture = Column(Text, nullable=True)  # Dry, Moist, Diaphoretic
    skin_turgor = Column(Text, nullable=True)  # Normal, Poor
    capillary_blanching = Column(Text, nullable=True)

    # Hydration status
    mucous_membranes = Column(Text, nullable=True)  # Moist, Dry
    urine_output = Column(Float, nullable=True)  # mL (if measured)
    urine_color = Column(Text, nullable=True)
    fluid_intake = Column(Float, nullable=True)  # mL per day

    # Gastrointestinal
    bowel_sounds = Column(Text, nullable=True)  # Normal, Hyperactive, Hypoactive, Absent
    last_bowel_movement = Column(DateTime(timezone=True), nullable=True)
    abdomen_appearance = Column(Text, nullable=True)  # Soft, Distended, Rigid
    nausea = Column(Boolean, nullable=True)
    vomiting = Column(Boolean, nullable=True)

    # Genitourinary
    urinary_frequency = Column(Text, nullable=True)
    urinary_urgency = Column(Boolean, nullable=True)
    dysuria = Column(Boolean, nullable=True)
    incontinence = Column(Boolean, nullable=True)

    # Mobility and functional status
    mobility_status = Column(Text, nullable=True)  # Independent, Assisted, Bedbound
    fall_risk_score = Column(Integer, nullable=True)
    balance_assessment = Column(Text, nullable=True)  # Steady, Unsteady
    gait_assessment = Column(Text, nullable=True)

    # Mental status
    orientation = Column(Text, nullable=True)  # Oriented x3 (Person, Place, Time)
    mood = Column(Text, nullable=True)
    affect = Column(Text, nullable=True)
    speech = Column(Text, nullable=True)  # Clear, Slurred, Aphasic
    memory = Column(Text, nullable=True)  # Intact, Impaired

    # Sleep
    sleep_quality = Column(Text, nullable=True)
    sleep_hours = Column(Float, nullable=True)
    sleep_disturbances = Column(Text, nullable=True)

    # Nutrition
    appetite = Column(Text, nullable=True)  # Good, Poor, None
    dietary_intake_percentage = Column(Integer, nullable=True)  # % of meal consumed
    special_diet = Column(Text, nullable=True)
    nutrition_risk_score = Column(Integer, nullable=True)

    # Wound assessment (if applicable)
    wound_present = Column(Boolean, nullable=True)
    wound_location = Column(Text, nullable=True)
    wound_size = Column(Text, nullable=True)  # Length x Width x Depth
    wound_type = Column(Text, nullable=True)  # Pressure, Surgical, Traumatic
    wound_drainage = Column(Text, nullable=True)  # Serous, Sanguineous, Purulent
    wound_healing_stage = Column(Text, nullable=True)

    # Infection indicators
    fever_present = Column(Boolean, nullable=True)
    chills = Column(Boolean, nullable=True)
    sweating = Column(Boolean, nullable=True)
    signs_of_infection = Column(Text, nullable=True)

    # Medication-related vitals
    medication_timing = Column(Text, nullable=True)  # Before meds, After meds
    fasting_status = Column(Boolean, nullable=True)  # For glucose, lipids tests

    # Environmental factors
    measurement_position = Column(Text, nullable=True)  # Sitting, Standing, Lying, Supine
    activity_level_before = Column(Text, nullable=True)  # Resting, Post-exercise
    environmental_temperature = Column(Float, nullable=True)  # Room temp in Celsius

    # Special populations
    gestational_age = Column(Integer, nullable=True)  # weeks (for OB patients)
    apgar_score_1min = Column(Integer, nullable=True)  # Neonatal assessment
    apgar_score_5min = Column(Integer, nullable=True)
    fundal_height = Column(Float, nullable=True)  # cm (OB)
    fetal_heart_rate = Column(Integer, nullable=True)  # bpm (OB)

    # Additional clinical notes
    clinical_notes = Column(Text, nullable=True)
    abnormal_findings = Column(Text, nullable=True)
    assessment_summary = Column(Text, nullable=True)

    # Metadata
    measured_by = Column(Text, nullable=True)  # Healthcare provider name/ID
    measurement_device = Column(Text, nullable=True)  # Device used for measurement
    verified_by = Column(Text, nullable=True)  # Supervisor verification if needed

    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    encounter = relationship("Encounter", back_populates="vitals")


class LabResultsLog(Base):
    """
    Stores structured data extracted from lab reports.
    Uses JSONB for flexible metric storage (LDL, HDL, RBC, etc.)
    """
    __tablename__ = "lab_results_logs"

    log_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    encounter_id = Column(UUID(as_uuid=True), ForeignKey("encounters.encounter_id"), nullable=False, index=True)
    metrics = Column(JSONB, nullable=False)  # e.g., {"LDL": 100, "HDL": 50, "RBC": 4.5}
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    encounter = relationship("Encounter", back_populates="lab_results")


# ============================================================================
# CLINICAL DOCUMENTATION & AI REPORTS
# ============================================================================

class SummaryReport(Base):
    """
    AI-generated core document with all clinical sections.
    Content stored as JSONB for flexibility.
    """
    __tablename__ = "summary_reports"

    report_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    encounter_id = Column(UUID(as_uuid=True), ForeignKey("encounters.encounter_id"), nullable=False, unique=True)
    status = Column(Enum(ReportStatus), default=ReportStatus.GENERATED, nullable=False, index=True)
    priority = Column(Enum(Priority), nullable=True)

    # JSONB content structure:
    # {
    #   "symptoms": "patient-reported symptoms",
    #   "diagnosis": "AI potential diagnosis",
    #   "treatment": "AI treatment recommendations",
    #   "tests": "AI recommended tests",
    #   "prescription": "AI prescription suggestions",
    #   "next_steps": "AI next steps guidance"
    # }
    content = Column(JSONB, nullable=False)

    # Cached translations (JSONB with same structure as content)
    gujarati_content = Column(JSONB, nullable=True)
    hindi_content = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    encounter = relationship("Encounter", back_populates="summary_report")


class LabOrder(Base):
    """
    Links encounters to lab providers for test fulfillment.
    """
    __tablename__ = "lab_orders"

    order_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    encounter_id = Column(UUID(as_uuid=True), ForeignKey("encounters.encounter_id"), nullable=False, index=True)
    lab_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, index=True)
    instructions = Column(Text, nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.SENT, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    encounter = relationship("Encounter", back_populates="lab_orders")


class Prescription(Base):
    """
    Links encounters to pharmacy providers for medication fulfillment.
    """
    __tablename__ = "prescriptions"

    prescription_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    encounter_id = Column(UUID(as_uuid=True), ForeignKey("encounters.encounter_id"), nullable=False, index=True)
    pharmacy_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, index=True)
    instructions = Column(Text, nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.SENT, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    encounter = relationship("Encounter", back_populates="prescriptions")


# ============================================================================
# MEDIA & FILES
# ============================================================================

class MediaFile(Base):
    """
    Stores uploaded media (PDF, images, video clips).
    Linked to encounters for context.
    """
    __tablename__ = "media_files"

    file_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    encounter_id = Column(UUID(as_uuid=True), ForeignKey("encounters.encounter_id"), nullable=False, index=True)
    file_type = Column(String(50), nullable=False)  # pdf, image, video
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    encounter = relationship("Encounter", back_populates="media_files")


# ============================================================================
# PERMISSIONS & SHARING
# ============================================================================

class ProfileShare(Base):
    """
    Handles patient sharing health history with doctors.
    Supports granular access control.
    """
    __tablename__ = "profile_shares"

    share_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, index=True)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, index=True)
    access_level = Column(Enum(AccessLevel), default=AccessLevel.FULL_HISTORY, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("User", foreign_keys=[patient_id], back_populates="shared_profiles")
    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="received_shares")


# ============================================================================
# HEALTH INSIGHTS CACHE
# ============================================================================

class HealthInsightsCache(Base):
    """
    Caches AI-generated health insights to avoid unnecessary API calls.
    Only regenerates when new data (vitals, labs, reviewed reports) is available.
    """
    __tablename__ = "health_insights_cache"

    cache_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, unique=True, index=True)

    # Cached insights content (JSONB)
    insights_data = Column(JSONB, nullable=False)

    # Language of cached insights
    language = Column(String(20), default="English", nullable=False)

    # Timestamps for tracking data freshness
    last_generated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_vitals_timestamp = Column(DateTime(timezone=True))
    last_lab_result_timestamp = Column(DateTime(timezone=True))
    last_reviewed_report_timestamp = Column(DateTime(timezone=True))

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    patient = relationship("User", foreign_keys=[patient_id])


# ============================================================================
# AUDIT LOGS (HIPAA Compliance)
# ============================================================================

class AuditLog(Base):
    """
    Comprehensive audit logging for HIPAA compliance.
    Tracks all access and modifications to PHI (Protected Health Information).
    """
    __tablename__ = "audit_logs"

    log_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Who performed the action
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, index=True)
    
    # What action was performed
    action = Column(Enum(AuditAction), nullable=False, index=True)
    
    # What resource was accessed/modified
    resource_type = Column(String(100), nullable=True, index=True)  # PATIENT, ENCOUNTER, SUMMARY_REPORT, etc.
    resource_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    
    # Request metadata
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(Text, nullable=True)
    
    # Session tracking
    session_id = Column(String(255), nullable=True, index=True)
    
    # Additional context (JSON format)
    details = Column(JSONB, nullable=True)  # Endpoint, query params, changes made, etc.
    
    # Timestamp (immutable)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<AuditLog {self.action} by {self.user_id} on {self.resource_type}:{self.resource_id}>"
