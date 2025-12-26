"""
Pharmacy Router - Pharmacy portal functionality
Handles prescriptions, status updates, and fulfillment
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models_v2 import (
    User, Prescription, OrderStatus, Encounter, PatientProfile, PharmacyProfile
)
from app.schemas_v2 import (
    PrescriptionCreate, PrescriptionResponse, PrescriptionUpdate, PharmacyProfileResponse
)
from app.auth import get_current_pharmacy, get_current_doctor

router = APIRouter(prefix="/api/pharmacy", tags=["Pharmacy Portal"])


# ============================================================================
# PRESCRIPTION MANAGEMENT
# ============================================================================

@router.post("/prescriptions", response_model=PrescriptionResponse)
async def create_prescription(
    prescription: PrescriptionCreate,
    current_doctor: User = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Create a new prescription (Doctor only).
    Sends prescription to specified pharmacy.
    """
    # Verify encounter exists
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == prescription.encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Verify pharmacy exists
    pharmacy = db.query(User).filter(
        User.user_id == prescription.pharmacy_id,
        User.role == "PHARMACY"
    ).first()

    if not pharmacy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pharmacy not found"
        )

    # Create prescription
    new_prescription = Prescription(
        encounter_id=prescription.encounter_id,
        pharmacy_id=prescription.pharmacy_id,
        instructions=prescription.instructions,
        status=OrderStatus.SENT
    )

    db.add(new_prescription)
    db.commit()
    db.refresh(new_prescription)

    return new_prescription


@router.get("/prescriptions", response_model=List[PrescriptionResponse])
async def get_prescriptions(
    status_filter: Optional[OrderStatus] = None,
    current_pharmacy: User = Depends(get_current_pharmacy),
    db: Session = Depends(get_db)
):
    """
    Get all prescriptions for current pharmacy.
    Can filter by status (SENT, RECEIVED, COMPLETED).
    """
    query = db.query(Prescription).filter(
        Prescription.pharmacy_id == current_pharmacy.user_id
    )

    # Apply status filter if provided
    if status_filter:
        query = query.filter(Prescription.status == status_filter)

    prescriptions = query.order_by(Prescription.created_at.desc()).all()
    return prescriptions


@router.get("/prescriptions/{prescription_id}", response_model=PrescriptionResponse)
async def get_prescription(
    prescription_id: UUID,
    current_pharmacy: User = Depends(get_current_pharmacy),
    db: Session = Depends(get_db)
):
    """
    Get specific prescription details.
    """
    prescription = db.query(Prescription).filter(
        Prescription.prescription_id == prescription_id,
        Prescription.pharmacy_id == current_pharmacy.user_id
    ).first()

    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found"
        )

    return prescription


@router.patch("/prescriptions/{prescription_id}", response_model=PrescriptionResponse)
async def update_prescription_status(
    prescription_id: UUID,
    update_data: PrescriptionUpdate,
    current_pharmacy: User = Depends(get_current_pharmacy),
    db: Session = Depends(get_db)
):
    """
    Update prescription status (Pharmacy only).
    Statuses: SENT -> RECEIVED -> COMPLETED
    """
    prescription = db.query(Prescription).filter(
        Prescription.prescription_id == prescription_id,
        Prescription.pharmacy_id == current_pharmacy.user_id
    ).first()

    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found"
        )

    # Update status
    prescription.status = update_data.status
    db.commit()
    db.refresh(prescription)

    return prescription


@router.get("/prescriptions/{prescription_id}/patient-info")
async def get_prescription_patient_info(
    prescription_id: UUID,
    current_pharmacy: User = Depends(get_current_pharmacy),
    db: Session = Depends(get_db)
):
    """
    Get patient information for a prescription.
    Returns basic patient demographics for the pharmacy to fulfill the prescription.
    """
    prescription = db.query(Prescription).filter(
        Prescription.prescription_id == prescription_id,
        Prescription.pharmacy_id == current_pharmacy.user_id
    ).first()

    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found"
        )

    # Get encounter to find patient
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == prescription.encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Get patient profile
    patient = db.query(PatientProfile).filter(
        PatientProfile.user_id == encounter.patient_id
    ).first()

    if not patient:
        return {
            "patient_id": encounter.patient_id,
            "message": "Patient profile not found"
        }

    return {
        "patient_id": patient.user_id,
        "first_name": patient.first_name,
        "last_name": patient.last_name,
        "date_of_birth": patient.date_of_birth,
        "gender": patient.gender,
        "prescription_instructions": prescription.instructions
    }


# ============================================================================
# PHARMACY STATISTICS
# ============================================================================

@router.get("/stats")
async def get_pharmacy_stats(
    current_pharmacy: User = Depends(get_current_pharmacy),
    db: Session = Depends(get_db)
):
    """
    Get statistics for current pharmacy.
    Shows prescription counts by status.
    """
    from sqlalchemy import func

    # Count prescriptions by status
    sent_count = db.query(func.count(Prescription.prescription_id)).filter(
        Prescription.pharmacy_id == current_pharmacy.user_id,
        Prescription.status == OrderStatus.SENT
    ).scalar()

    received_count = db.query(func.count(Prescription.prescription_id)).filter(
        Prescription.pharmacy_id == current_pharmacy.user_id,
        Prescription.status == OrderStatus.RECEIVED
    ).scalar()

    completed_count = db.query(func.count(Prescription.prescription_id)).filter(
        Prescription.pharmacy_id == current_pharmacy.user_id,
        Prescription.status == OrderStatus.COMPLETED
    ).scalar()

    total_prescriptions = db.query(func.count(Prescription.prescription_id)).filter(
        Prescription.pharmacy_id == current_pharmacy.user_id
    ).scalar()

    return {
        "total_prescriptions": total_prescriptions,
        "sent": sent_count,
        "received": received_count,
        "completed": completed_count,
        "pending": sent_count + received_count
    }


# ============================================================================
# PHARMACY PROFILE
# ============================================================================

@router.get("/profile", response_model=PharmacyProfileResponse)
async def get_pharmacy_profile(
    current_pharmacy: User = Depends(get_current_pharmacy),
    db: Session = Depends(get_db)
):
    """
    Get current pharmacy's profile information.
    """
    profile = db.query(PharmacyProfile).filter(
        PharmacyProfile.user_id == current_pharmacy.user_id
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pharmacy profile not found"
        )

    return profile
