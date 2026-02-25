"""
Doctor Referral System API Endpoints

Handles doctor-to-doctor patient referrals:
- Doctor DA creates referral for patient P to doctor DB
- Doctor DB can view, accept/decline referrals
- Patient P can view referrals and book appointments
- Doctor DA can track referral status and outcomes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, UUID4
from app.database import get_db
from app.auth import get_current_user
from app.models_v2 import (
    User, UserRole, Referral, ReferralStatus, Encounter,
    DoctorProfile, PatientProfile, VideoConsultation
)

router = APIRouter(prefix="/api/referrals", tags=["Referrals"])


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class ReferralCreate(BaseModel):
    """Schema for creating a new referral"""
    patient_id: UUID4
    referred_to_doctor_id: UUID4
    reason: str
    clinical_notes: Optional[str] = None
    priority: str = "MEDIUM"  # HIGH, MEDIUM, LOW
    specialty_needed: Optional[str] = None
    source_encounter_id: Optional[UUID4] = None


class ReferralUpdate(BaseModel):
    """Schema for updating referral by referred-to doctor"""
    status: Optional[str] = None
    referred_doctor_notes: Optional[str] = None
    declined_reason: Optional[str] = None


class ReferralResponse(BaseModel):
    """Schema for referral response"""
    referral_id: UUID4
    patient_id: UUID4
    patient_name: str
    patient_phone: Optional[str]
    referring_doctor_id: UUID4
    referring_doctor_name: str
    referring_doctor_specialty: Optional[str]
    referred_to_doctor_id: UUID4
    referred_to_doctor_name: str
    reason: str
    clinical_notes: Optional[str]
    priority: str
    specialty_needed: Optional[str]
    status: str
    appointment_scheduled_time: Optional[datetime]
    appointment_completed_time: Optional[datetime]
    referred_doctor_notes: Optional[str]
    declined_reason: Optional[str]
    patient_viewed: bool
    referred_doctor_viewed: bool
    created_at: datetime
    updated_at: datetime

    # Additional context
    has_appointment: bool
    appointment_encounter_id: Optional[UUID4]
    source_encounter_id: Optional[UUID4]

    class Config:
        from_attributes = True


class ReferralStats(BaseModel):
    """Statistics for referral notifications"""
    total_pending: int
    total_accepted: int
    total_completed: int
    unread_count: int  # For notifications


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_user_full_name(user: User) -> str:
    """Get full name from user's role-specific profile"""
    if user.role == UserRole.PATIENT and user.patient_profile:
        return f"{user.patient_profile.first_name} {user.patient_profile.last_name}"
    elif user.role == UserRole.DOCTOR and user.doctor_profile:
        return f"Dr. {user.doctor_profile.first_name} {user.doctor_profile.last_name}"
    return user.phone_number or user.email or "Unknown User"


def format_referral_response(referral: Referral, db: Session) -> dict:
    """Format referral for API response"""

    # Get patient info
    patient = db.query(User).filter(User.user_id == referral.patient_id).first()
    patient_name = get_user_full_name(patient) if patient else "Unknown Patient"
    patient_phone = patient.phone_number if patient else None

    # Get referring doctor info
    referring_doctor = db.query(User).filter(User.user_id == referral.referring_doctor_id).first()
    referring_doctor_name = get_user_full_name(referring_doctor) if referring_doctor else "Unknown Doctor"
    referring_doctor_specialty = referring_doctor.doctor_profile.specialty if referring_doctor and referring_doctor.doctor_profile else None

    # Get referred-to doctor info
    referred_to_doctor = db.query(User).filter(User.user_id == referral.referred_to_doctor_id).first()
    referred_to_doctor_name = get_user_full_name(referred_to_doctor) if referred_to_doctor else "Unknown Doctor"

    return {
        "referral_id": referral.referral_id,
        "patient_id": referral.patient_id,
        "patient_name": patient_name,
        "patient_phone": patient_phone,
        "referring_doctor_id": referral.referring_doctor_id,
        "referring_doctor_name": referring_doctor_name,
        "referring_doctor_specialty": referring_doctor_specialty,
        "referred_to_doctor_id": referral.referred_to_doctor_id,
        "referred_to_doctor_name": referred_to_doctor_name,
        "reason": referral.reason,
        "clinical_notes": referral.clinical_notes,
        "priority": referral.priority,
        "specialty_needed": referral.specialty_needed,
        "status": referral.status.value,
        "appointment_scheduled_time": referral.appointment_scheduled_time,
        "appointment_completed_time": referral.appointment_completed_time,
        "referred_doctor_notes": referral.referred_doctor_notes,
        "declined_reason": referral.declined_reason,
        "patient_viewed": referral.patient_viewed_at is not None,
        "referred_doctor_viewed": referral.referred_doctor_viewed_at is not None,
        "created_at": referral.created_at,
        "updated_at": referral.updated_at,
        "has_appointment": referral.appointment_encounter_id is not None,
        "appointment_encounter_id": referral.appointment_encounter_id,
        "source_encounter_id": referral.source_encounter_id,
    }


# ============================================================================
# ENDPOINTS - CREATE REFERRAL
# ============================================================================

@router.post("/", response_model=ReferralResponse)
def create_referral(
    referral_data: ReferralCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new referral (Doctor DA refers Patient P to Doctor DB)
    Only doctors can create referrals
    """
    # Verify current user is a doctor
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can create referrals"
        )

    # Verify patient exists
    patient = db.query(User).filter(User.user_id == referral_data.patient_id).first()
    if not patient or patient.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    # Verify referred-to doctor exists
    referred_doctor = db.query(User).filter(User.user_id == referral_data.referred_to_doctor_id).first()
    if not referred_doctor or referred_doctor.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referred-to doctor not found"
        )

    # Create referral
    new_referral = Referral(
        patient_id=referral_data.patient_id,
        referring_doctor_id=current_user.user_id,
        referred_to_doctor_id=referral_data.referred_to_doctor_id,
        reason=referral_data.reason,
        clinical_notes=referral_data.clinical_notes,
        priority=referral_data.priority,
        specialty_needed=referral_data.specialty_needed,
        source_encounter_id=referral_data.source_encounter_id,
        status=ReferralStatus.PENDING,
        patient_notified=True,  # Auto-notify patient
        created_at=func.now()
    )

    db.add(new_referral)
    db.commit()
    db.refresh(new_referral)

    return format_referral_response(new_referral, db)


# ============================================================================
# ENDPOINTS - VIEW REFERRALS
# ============================================================================

@router.get("/my-referrals-made", response_model=List[ReferralResponse])
def get_my_referrals_made(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all referrals made by current doctor (Doctor DA's view)
    Shows referrals they created for their patients
    """
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can view referrals"
        )

    referrals = db.query(Referral).filter(
        Referral.referring_doctor_id == current_user.user_id
    ).order_by(Referral.created_at.desc()).all()

    return [format_referral_response(ref, db) for ref in referrals]


@router.get("/my-referrals-received", response_model=List[ReferralResponse])
def get_my_referrals_received(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all referrals received by current doctor (Doctor DB's view)
    Shows referrals where they are the referred-to doctor
    """
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can view referrals"
        )

    referrals = db.query(Referral).filter(
        Referral.referred_to_doctor_id == current_user.user_id
    ).order_by(Referral.created_at.desc()).all()

    # Mark as viewed
    for ref in referrals:
        if ref.referred_doctor_viewed_at is None:
            ref.referred_doctor_viewed_at = func.now()
    db.commit()

    return [format_referral_response(ref, db) for ref in referrals]


@router.get("/my-referrals", response_model=List[ReferralResponse])
def get_my_referrals_as_patient(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all referrals for current patient (Patient P's view)
    Shows referrals where they are the patient
    """
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can view their referrals"
        )

    referrals = db.query(Referral).filter(
        Referral.patient_id == current_user.user_id
    ).order_by(Referral.created_at.desc()).all()

    # Mark as viewed
    for ref in referrals:
        if ref.patient_viewed_at is None:
            ref.patient_viewed_at = func.now()
    db.commit()

    return [format_referral_response(ref, db) for ref in referrals]


@router.get("/patient/{patient_id}", response_model=List[ReferralResponse])
def get_patient_referrals(
    patient_id: UUID4,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all referrals for a specific patient
    Used by Doctor DA to see referral status in patient encounters
    """
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can view patient referrals"
        )

    # Verify doctor has access to this patient (either referring doctor or referred-to doctor)
    referrals = db.query(Referral).filter(
        and_(
            Referral.patient_id == patient_id,
            or_(
                Referral.referring_doctor_id == current_user.user_id,
                Referral.referred_to_doctor_id == current_user.user_id
            )
        )
    ).order_by(Referral.created_at.desc()).all()

    return [format_referral_response(ref, db) for ref in referrals]


@router.get("/{referral_id}", response_model=ReferralResponse)
def get_referral_detail(
    referral_id: UUID4,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific referral"""
    referral = db.query(Referral).filter(Referral.referral_id == referral_id).first()

    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found"
        )

    # Verify user has access to this referral
    if current_user.user_id not in [
        referral.patient_id,
        referral.referring_doctor_id,
        referral.referred_to_doctor_id
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Mark as viewed based on user role
    if current_user.user_id == referral.patient_id and referral.patient_viewed_at is None:
        referral.patient_viewed_at = func.now()
        db.commit()
    elif current_user.user_id == referral.referred_to_doctor_id and referral.referred_doctor_viewed_at is None:
        referral.referred_doctor_viewed_at = func.now()
        db.commit()

    return format_referral_response(referral, db)


# ============================================================================
# ENDPOINTS - UPDATE REFERRAL
# ============================================================================

@router.patch("/{referral_id}/accept")
def accept_referral(
    referral_id: UUID4,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Accept a referral (Doctor DB accepts referral from Doctor DA)
    """
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can accept referrals"
        )

    referral = db.query(Referral).filter(Referral.referral_id == referral_id).first()

    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found"
        )

    # Verify current user is the referred-to doctor
    if referral.referred_to_doctor_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the referred-to doctor can accept this referral"
        )

    # Update referral
    referral.status = ReferralStatus.ACCEPTED
    referral.accepted_at = func.now()
    if notes:
        referral.referred_doctor_notes = notes

    db.commit()

    return {"message": "Referral accepted successfully", "referral_id": referral_id}


@router.patch("/{referral_id}/decline")
def decline_referral(
    referral_id: UUID4,
    reason: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Decline a referral (Doctor DB declines referral from Doctor DA)
    """
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can decline referrals"
        )

    referral = db.query(Referral).filter(Referral.referral_id == referral_id).first()

    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found"
        )

    # Verify current user is the referred-to doctor
    if referral.referred_to_doctor_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the referred-to doctor can decline this referral"
        )

    # Update referral
    referral.status = ReferralStatus.DECLINED
    referral.declined_at = func.now()
    referral.declined_reason = reason

    db.commit()

    return {"message": "Referral declined", "referral_id": referral_id}


@router.patch("/{referral_id}/link-appointment")
def link_appointment_to_referral(
    referral_id: UUID4,
    encounter_id: UUID4,
    scheduled_time: datetime,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Link an appointment/encounter to a referral
    Called when patient or doctor books appointment related to referral
    """
    referral = db.query(Referral).filter(Referral.referral_id == referral_id).first()

    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found"
        )

    # Verify user has access
    if current_user.user_id not in [
        referral.patient_id,
        referral.referred_to_doctor_id
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Verify encounter exists
    encounter = db.query(Encounter).filter(Encounter.encounter_id == encounter_id).first()
    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Update referral
    referral.appointment_encounter_id = encounter_id
    referral.appointment_scheduled_time = scheduled_time
    referral.status = ReferralStatus.APPOINTMENT_SCHEDULED

    db.commit()

    return {"message": "Appointment linked to referral", "referral_id": referral_id}


@router.patch("/{referral_id}/complete")
def complete_referral(
    referral_id: UUID4,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark referral as completed (after appointment with Doctor DB is done)
    """
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can complete referrals"
        )

    referral = db.query(Referral).filter(Referral.referral_id == referral_id).first()

    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found"
        )

    # Verify current user is the referred-to doctor
    if referral.referred_to_doctor_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the referred-to doctor can complete this referral"
        )

    # Update referral
    referral.status = ReferralStatus.COMPLETED
    referral.appointment_completed_time = func.now()

    db.commit()

    return {"message": "Referral marked as completed", "referral_id": referral_id}


# ============================================================================
# ENDPOINTS - STATISTICS/NOTIFICATIONS
# ============================================================================

@router.get("/stats/summary", response_model=ReferralStats)
def get_referral_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get referral statistics for current user
    Used for notification badges
    """
    stats = {
        "total_pending": 0,
        "total_accepted": 0,
        "total_completed": 0,
        "unread_count": 0
    }

    if current_user.role == UserRole.DOCTOR:
        # For doctors, count referrals received
        total_pending = db.query(Referral).filter(
            and_(
                Referral.referred_to_doctor_id == current_user.user_id,
                Referral.status == ReferralStatus.PENDING
            )
        ).count()

        total_accepted = db.query(Referral).filter(
            and_(
                Referral.referred_to_doctor_id == current_user.user_id,
                Referral.status == ReferralStatus.ACCEPTED
            )
        ).count()

        total_completed = db.query(Referral).filter(
            and_(
                Referral.referred_to_doctor_id == current_user.user_id,
                Referral.status == ReferralStatus.COMPLETED
            )
        ).count()

        unread_count = db.query(Referral).filter(
            and_(
                Referral.referred_to_doctor_id == current_user.user_id,
                Referral.referred_doctor_viewed_at.is_(None)
            )
        ).count()

        stats = {
            "total_pending": total_pending,
            "total_accepted": total_accepted,
            "total_completed": total_completed,
            "unread_count": unread_count
        }

    elif current_user.role == UserRole.PATIENT:
        # For patients, count their referrals
        total_pending = db.query(Referral).filter(
            and_(
                Referral.patient_id == current_user.user_id,
                Referral.status == ReferralStatus.PENDING
            )
        ).count()

        unread_count = db.query(Referral).filter(
            and_(
                Referral.patient_id == current_user.user_id,
                Referral.patient_viewed_at.is_(None)
            )
        ).count()

        stats = {
            "total_pending": total_pending,
            "total_accepted": 0,
            "total_completed": 0,
            "unread_count": unread_count
        }

    return stats
