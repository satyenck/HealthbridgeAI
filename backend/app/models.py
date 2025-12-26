from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class AuthProvider(str, enum.Enum):
    GOOGLE = "google"
    PHONE = "phone"


class Gender(str, enum.Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"
    PREFER_NOT_TO_SAY = "Prefer Not to Say"


class UserRole(str, enum.Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"


class ReportStatus(str, enum.Enum):
    PENDING = "pending"
    REVIEWED = "reviewed"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=True, index=True)
    phone_number = Column(String, unique=True, nullable=True, index=True)
    auth_provider = Column(Enum(AuthProvider), nullable=False)
    google_id = Column(String, unique=True, nullable=True)
    hashed_password = Column(String, nullable=True)
    is_active = Column(Integer, default=1)
    role = Column(Enum(UserRole), default=UserRole.PATIENT, nullable=False)
    license_number = Column(String(100), nullable=True)
    specialization = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    profile = relationship("UserProfile", back_populates="user", uselist=False)
    consultations = relationship("Consultation", back_populates="user", foreign_keys="[Consultation.user_id]")
    reviewed_consultations = relationship("Consultation", back_populates="doctor", foreign_keys="[Consultation.doctor_id]")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(Enum(Gender), nullable=False)
    health_condition = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="profile")


class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    patient_description = Column(Text, nullable=False)
    symptoms = Column(Text, nullable=True)
    potential_diagnosis = Column(Text, nullable=True)
    potential_treatment = Column(Text, nullable=True)
    next_steps = Column(Text, nullable=True)
    status = Column(Enum(ReportStatus), default=ReportStatus.PENDING, nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    doctor_notes = Column(Text, nullable=True)
    edited_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="consultations", foreign_keys=[user_id])
    doctor = relationship("User", back_populates="reviewed_consultations", foreign_keys=[doctor_id])
    files = relationship("ConsultationFile", back_populates="consultation", cascade="all, delete-orphan")


class ConsultationFile(Base):
    __tablename__ = "consultation_files"

    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id"), nullable=False, index=True)
    file_type = Column(String(50), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    consultation = relationship("Consultation", back_populates="files")


class DoctorPatientRelationship(Base):
    __tablename__ = "doctor_patient_relationships"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint('doctor_id', 'patient_id', name='_doctor_patient_uc'),)
