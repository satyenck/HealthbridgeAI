"""
Admin Router - Administrative functions for managing the system
Admin-only endpoints for user management, professional creation, and statistics
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from uuid import UUID

from app.database import get_db
from app.models_v2 import (
    User, UserRole, PatientProfile, DoctorProfile, LabProfile, PharmacyProfile,
    Encounter, SummaryReport, ReportStatus
)
from app.schemas_v2 import (
    UserResponse, DoctorProfileCreate, DoctorProfileResponse,
    LabProfileCreate, LabProfileResponse,
    PharmacyProfileCreate, PharmacyProfileResponse,
    AdminCreateProfessional, SystemStats
)
from app.auth import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ============================================================================
# PROFESSIONAL ACCOUNT CREATION
# ============================================================================

@router.post("/professionals/doctors", response_model=DoctorProfileResponse)
async def create_doctor(
    doctor_data: DoctorProfileCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Create a new doctor account with profile (Admin only).
    Creates User record with DOCTOR role and DoctorProfile.
    """
    # Check if email or phone already exists
    existing_user = db.query(User).filter(
        (User.email == doctor_data.email) | (User.phone_number == doctor_data.phone)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or phone already exists"
        )

    # Create user with DOCTOR role
    new_user = User(
        email=doctor_data.email,
        phone_number=doctor_data.phone,
        role=UserRole.DOCTOR,
        is_active=True
    )
    db.add(new_user)
    db.flush()  # Get user_id without committing

    # Create doctor profile
    doctor_profile = DoctorProfile(
        user_id=new_user.user_id,
        first_name=doctor_data.first_name,
        last_name=doctor_data.last_name,
        email=doctor_data.email,
        phone=doctor_data.phone,
        address=doctor_data.address,
        hospital_name=doctor_data.hospital_name,
        specialty=doctor_data.specialty,
        degree=doctor_data.degree,
        last_degree_year=doctor_data.last_degree_year
    )
    db.add(doctor_profile)
    db.commit()
    db.refresh(doctor_profile)

    return doctor_profile


@router.post("/professionals/labs", response_model=LabProfileResponse)
async def create_lab(
    lab_data: LabProfileCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Create a new lab account with profile (Admin only).
    Creates User record with LAB role and LabProfile.
    """
    # Check if email or phone already exists
    existing_user = db.query(User).filter(
        (User.email == lab_data.email) | (User.phone_number == lab_data.phone)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or phone already exists"
        )

    # Create user with LAB role
    new_user = User(
        email=lab_data.email,
        phone_number=lab_data.phone,
        role=UserRole.LAB,
        is_active=True
    )
    db.add(new_user)
    db.flush()

    # Create lab profile
    lab_profile = LabProfile(
        user_id=new_user.user_id,
        business_name=lab_data.business_name,
        email=lab_data.email,
        phone=lab_data.phone,
        address=lab_data.address,
        license_year=lab_data.license_year
    )
    db.add(lab_profile)
    db.commit()
    db.refresh(lab_profile)

    return lab_profile


@router.post("/professionals/pharmacies", response_model=PharmacyProfileResponse)
async def create_pharmacy(
    pharmacy_data: PharmacyProfileCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Create a new pharmacy account with profile (Admin only).
    Creates User record with PHARMACY role and PharmacyProfile.
    """
    # Check if email or phone already exists
    existing_user = db.query(User).filter(
        (User.email == pharmacy_data.email) | (User.phone_number == pharmacy_data.phone)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or phone already exists"
        )

    # Create user with PHARMACY role
    new_user = User(
        email=pharmacy_data.email,
        phone_number=pharmacy_data.phone,
        role=UserRole.PHARMACY,
        is_active=True
    )
    db.add(new_user)
    db.flush()

    # Create pharmacy profile
    pharmacy_profile = PharmacyProfile(
        user_id=new_user.user_id,
        business_name=pharmacy_data.business_name,
        email=pharmacy_data.email,
        phone=pharmacy_data.phone,
        address=pharmacy_data.address,
        license_year=pharmacy_data.license_year
    )
    db.add(pharmacy_profile)
    db.commit()
    db.refresh(pharmacy_profile)

    return pharmacy_profile


# ============================================================================
# USER MANAGEMENT
# ============================================================================

@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    role: UserRole = None,
    is_active: bool = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get all users with optional filtering by role and active status (Admin only).
    """
    query = db.query(User)

    # Apply filters
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    users = query.order_by(User.created_at.desc()).all()
    return users


@router.patch("/users/{user_id}/activate", response_model=UserResponse)
async def activate_user(
    user_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Activate a user account (Admin only).
    """
    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user.is_active = True
    db.commit()
    db.refresh(user)

    return user


@router.patch("/users/{user_id}/deactivate", response_model=UserResponse)
async def deactivate_user(
    user_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Deactivate a user account (Admin only).
    """
    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent deactivating admin accounts
    if user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot deactivate admin accounts"
        )

    user.is_active = False
    db.commit()
    db.refresh(user)

    return user


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Delete a user account (Admin only).
    Cascades to all related records.
    """
    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent deleting admin accounts
    if user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete admin accounts"
        )

    db.delete(user)
    db.commit()

    return {"message": f"User {user_id} deleted successfully"}


# ============================================================================
# SYSTEM STATISTICS
# ============================================================================

@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get system-wide statistics (Admin only).
    Returns counts of users by role, encounters, and report statuses.
    """
    # Count users by role
    total_patients = db.query(func.count(User.user_id)).filter(
        User.role == UserRole.PATIENT
    ).scalar()

    total_doctors = db.query(func.count(User.user_id)).filter(
        User.role == UserRole.DOCTOR
    ).scalar()

    total_labs = db.query(func.count(User.user_id)).filter(
        User.role == UserRole.LAB
    ).scalar()

    total_pharmacies = db.query(func.count(User.user_id)).filter(
        User.role == UserRole.PHARMACY
    ).scalar()

    # Count encounters
    total_encounters = db.query(func.count(Encounter.encounter_id)).scalar()

    # Count reports by status
    pending_reports = db.query(func.count(SummaryReport.report_id)).filter(
        SummaryReport.status == ReportStatus.PENDING_REVIEW
    ).scalar()

    reviewed_reports = db.query(func.count(SummaryReport.report_id)).filter(
        SummaryReport.status == ReportStatus.REVIEWED
    ).scalar()

    return SystemStats(
        total_patients=total_patients,
        total_doctors=total_doctors,
        total_labs=total_labs,
        total_pharmacies=total_pharmacies,
        total_encounters=total_encounters,
        pending_reports=pending_reports,
        reviewed_reports=reviewed_reports
    )


# ============================================================================
# DOCTOR MANAGEMENT
# ============================================================================

@router.get("/doctors", response_model=List[DoctorProfileResponse])
async def get_all_doctors(
    specialty: str = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get all doctors with optional filtering by specialty (Admin only).
    """
    query = db.query(DoctorProfile)

    if specialty:
        query = query.filter(DoctorProfile.specialty == specialty)

    doctors = query.order_by(DoctorProfile.created_at.desc()).all()
    return doctors


@router.get("/labs", response_model=List[LabProfileResponse])
async def get_all_labs(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get all labs (Admin only).
    """
    labs = db.query(LabProfile).order_by(LabProfile.created_at.desc()).all()
    return labs


@router.get("/pharmacies", response_model=List[PharmacyProfileResponse])
async def get_all_pharmacies(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get all pharmacies (Admin only).
    """
    pharmacies = db.query(PharmacyProfile).order_by(PharmacyProfile.created_at.desc()).all()
    return pharmacies
