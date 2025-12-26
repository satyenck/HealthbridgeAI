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
    """Five distinct user roles in the system"""
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
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


class AccessLevel(str, enum.Enum):
    """Profile sharing access levels"""
    FULL_HISTORY = "FULL_HISTORY"
    SINGLE_ENCOUNTER = "SINGLE_ENCOUNTER"


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
    patient_profile = relationship("PatientProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    lab_profile = relationship("LabProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    pharmacy_profile = relationship("PharmacyProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")

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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="patient_profile")


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


class VitalsLog(Base):
    """
    Tracks biometric changes over time for graphing.
    Enables longitudinal health monitoring.
    """
    __tablename__ = "vitals_logs"

    vital_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    encounter_id = Column(UUID(as_uuid=True), ForeignKey("encounters.encounter_id"), nullable=False, index=True)
    blood_pressure_sys = Column(Integer, nullable=True)
    blood_pressure_dia = Column(Integer, nullable=True)
    heart_rate = Column(Integer, nullable=True)
    oxygen_level = Column(Integer, nullable=True)
    weight = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

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
