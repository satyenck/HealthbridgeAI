"""
Lab Router - Lab portal functionality
Handles lab orders, status updates, and result uploads
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models_v2 import (
    User, LabOrder, OrderStatus, Encounter, PatientProfile, LabProfile
)
from app.schemas_v2 import (
    LabOrderCreate, LabOrderResponse, LabOrderUpdate, LabProfileResponse
)
from app.auth import get_current_lab, get_current_doctor

router = APIRouter(prefix="/api/lab", tags=["Lab Portal"])


# ============================================================================
# LAB ORDER MANAGEMENT
# ============================================================================

@router.post("/orders", response_model=LabOrderResponse)
async def create_lab_order(
    order: LabOrderCreate,
    current_doctor: User = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Create a new lab order (Doctor only).
    Sends order to specified lab.
    """
    # Verify encounter exists
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == order.encounter_id
    ).first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encounter not found"
        )

    # Verify lab exists
    lab = db.query(User).filter(
        User.user_id == order.lab_id,
        User.role == "LAB"
    ).first()

    if not lab:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lab not found"
        )

    # Create lab order
    new_order = LabOrder(
        encounter_id=order.encounter_id,
        lab_id=order.lab_id,
        instructions=order.instructions,
        status=OrderStatus.SENT
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    return new_order


@router.get("/orders", response_model=List[LabOrderResponse])
async def get_lab_orders(
    status_filter: Optional[OrderStatus] = None,
    current_lab: User = Depends(get_current_lab),
    db: Session = Depends(get_db)
):
    """
    Get all lab orders for current lab.
    Can filter by status (SENT, RECEIVED, COMPLETED).
    """
    query = db.query(LabOrder).filter(LabOrder.lab_id == current_lab.user_id)

    # Apply status filter if provided
    if status_filter:
        query = query.filter(LabOrder.status == status_filter)

    orders = query.order_by(LabOrder.created_at.desc()).all()
    return orders


@router.get("/orders/{order_id}", response_model=LabOrderResponse)
async def get_lab_order(
    order_id: UUID,
    current_lab: User = Depends(get_current_lab),
    db: Session = Depends(get_db)
):
    """
    Get specific lab order details.
    """
    order = db.query(LabOrder).filter(
        LabOrder.order_id == order_id,
        LabOrder.lab_id == current_lab.user_id
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lab order not found"
        )

    return order


@router.patch("/orders/{order_id}", response_model=LabOrderResponse)
async def update_lab_order_status(
    order_id: UUID,
    update_data: LabOrderUpdate,
    current_lab: User = Depends(get_current_lab),
    db: Session = Depends(get_db)
):
    """
    Update lab order status (Lab only).
    Statuses: SENT -> RECEIVED -> COMPLETED
    """
    order = db.query(LabOrder).filter(
        LabOrder.order_id == order_id,
        LabOrder.lab_id == current_lab.user_id
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lab order not found"
        )

    # Update status
    order.status = update_data.status
    db.commit()
    db.refresh(order)

    return order


@router.get("/orders/{order_id}/patient-info")
async def get_order_patient_info(
    order_id: UUID,
    current_lab: User = Depends(get_current_lab),
    db: Session = Depends(get_db)
):
    """
    Get patient information for a lab order.
    Returns basic patient demographics for the lab to process the order.
    """
    order = db.query(LabOrder).filter(
        LabOrder.order_id == order_id,
        LabOrder.lab_id == current_lab.user_id
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lab order not found"
        )

    # Get encounter to find patient
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == order.encounter_id
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
        "order_instructions": order.instructions
    }


# ============================================================================
# LAB STATISTICS
# ============================================================================

@router.get("/stats")
async def get_lab_stats(
    current_lab: User = Depends(get_current_lab),
    db: Session = Depends(get_db)
):
    """
    Get statistics for current lab.
    Shows order counts by status.
    """
    from sqlalchemy import func

    # Count orders by status
    sent_count = db.query(func.count(LabOrder.order_id)).filter(
        LabOrder.lab_id == current_lab.user_id,
        LabOrder.status == OrderStatus.SENT
    ).scalar()

    received_count = db.query(func.count(LabOrder.order_id)).filter(
        LabOrder.lab_id == current_lab.user_id,
        LabOrder.status == OrderStatus.RECEIVED
    ).scalar()

    completed_count = db.query(func.count(LabOrder.order_id)).filter(
        LabOrder.lab_id == current_lab.user_id,
        LabOrder.status == OrderStatus.COMPLETED
    ).scalar()

    total_orders = db.query(func.count(LabOrder.order_id)).filter(
        LabOrder.lab_id == current_lab.user_id
    ).scalar()

    return {
        "total_orders": total_orders,
        "sent": sent_count,
        "received": received_count,
        "completed": completed_count,
        "pending": sent_count + received_count
    }


# ============================================================================
# LAB PROFILE
# ============================================================================

@router.get("/profile", response_model=LabProfileResponse)
async def get_lab_profile(
    current_lab: User = Depends(get_current_lab),
    db: Session = Depends(get_db)
):
    """
    Get current lab's profile information.
    """
    profile = db.query(LabProfile).filter(
        LabProfile.user_id == current_lab.user_id
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lab profile not found"
        )

    return profile
