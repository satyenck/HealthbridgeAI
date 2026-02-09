"""
Audit Log Router - HIPAA Compliance
Endpoints for viewing and managing audit logs
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta

from app.database import get_db
from app.models_v2 import User, AuditLog, AuditAction, UserRole
from app.auth import get_current_user, get_current_admin
from pydantic import BaseModel

router = APIRouter(prefix="/api/audit", tags=["Audit Logs"])


# ============================================================================
# SCHEMAS
# ============================================================================

class AuditLogResponse(BaseModel):
    log_id: UUID
    user_id: UUID
    action: str
    resource_type: Optional[str]
    resource_id: Optional[UUID]
    ip_address: Optional[str]
    user_agent: Optional[str]
    session_id: Optional[str]
    details: Optional[dict]
    timestamp: datetime

    # User information (joined)
    user_email: Optional[str] = None
    user_phone: Optional[str] = None
    user_role: Optional[str] = None

    class Config:
        from_attributes = True


class AuditLogStats(BaseModel):
    """Statistics about audit logs"""
    total_logs: int
    logs_last_24h: int
    logs_last_7d: int
    top_actions: List[dict]
    top_users: List[dict]
    top_resources: List[dict]


# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

@router.get("/logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    user_id: Optional[UUID] = None,
    action: Optional[AuditAction] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get audit logs with optional filtering (Admin only)

    Filters:
    - user_id: Filter by user
    - action: Filter by action type (VIEW, CREATE, UPDATE, DELETE, etc.)
    - resource_type: Filter by resource type (PATIENT, ENCOUNTER, etc.)
    - resource_id: Filter by specific resource ID
    - start_date: Filter logs after this date
    - end_date: Filter logs before this date
    - limit: Number of logs to return (max 1000)
    - offset: Pagination offset
    """
    query = db.query(AuditLog).join(User, AuditLog.user_id == User.user_id)

    # Apply filters
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    if action:
        query = query.filter(AuditLog.action == action)

    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)

    if resource_id:
        query = query.filter(AuditLog.resource_id == resource_id)

    if start_date:
        query = query.filter(AuditLog.timestamp >= start_date)

    if end_date:
        query = query.filter(AuditLog.timestamp <= end_date)

    # Order by most recent first
    query = query.order_by(desc(AuditLog.timestamp))

    # Apply pagination
    logs = query.limit(limit).offset(offset).all()

    # Build response with user info
    result = []
    for log in logs:
        log_dict = {
            "log_id": log.log_id,
            "user_id": log.user_id,
            "action": log.action.value,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "session_id": log.session_id,
            "details": log.details,
            "timestamp": log.timestamp,
            "user_email": log.user.email,
            "user_phone": log.user.phone_number,
            "user_role": log.user.role.value
        }
        result.append(AuditLogResponse(**log_dict))

    return result


@router.get("/logs/user/{user_id}", response_model=List[AuditLogResponse])
async def get_user_audit_logs(
    user_id: UUID,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get all audit logs for a specific user (Admin only)
    """
    logs = (
        db.query(AuditLog)
        .join(User, AuditLog.user_id == User.user_id)
        .filter(AuditLog.user_id == user_id)
        .order_by(desc(AuditLog.timestamp))
        .limit(limit)
        .offset(offset)
        .all()
    )

    result = []
    for log in logs:
        log_dict = {
            "log_id": log.log_id,
            "user_id": log.user_id,
            "action": log.action.value,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "session_id": log.session_id,
            "details": log.details,
            "timestamp": log.timestamp,
            "user_email": log.user.email,
            "user_phone": log.user.phone_number,
            "user_role": log.user.role.value
        }
        result.append(AuditLogResponse(**log_dict))

    return result


@router.get("/logs/resource/{resource_type}/{resource_id}", response_model=List[AuditLogResponse])
async def get_resource_audit_logs(
    resource_type: str,
    resource_id: UUID,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get all audit logs for a specific resource (Admin only)

    Example: All logs for encounter ID "abc-123"
    """
    logs = (
        db.query(AuditLog)
        .join(User, AuditLog.user_id == User.user_id)
        .filter(
            and_(
                AuditLog.resource_type == resource_type.upper(),
                AuditLog.resource_id == resource_id
            )
        )
        .order_by(desc(AuditLog.timestamp))
        .limit(limit)
        .offset(offset)
        .all()
    )

    result = []
    for log in logs:
        log_dict = {
            "log_id": log.log_id,
            "user_id": log.user_id,
            "action": log.action.value,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "session_id": log.session_id,
            "details": log.details,
            "timestamp": log.timestamp,
            "user_email": log.user.email,
            "user_phone": log.user.phone_number,
            "user_role": log.user.role.value
        }
        result.append(AuditLogResponse(**log_dict))

    return result


@router.get("/stats", response_model=AuditLogStats)
async def get_audit_stats(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get audit log statistics (Admin only)

    Returns:
    - Total number of logs
    - Logs in last 24 hours
    - Logs in last 7 days
    - Top 10 actions
    - Top 10 users by activity
    - Top 10 accessed resources
    """
    from sqlalchemy import func

    # Total logs
    total_logs = db.query(func.count(AuditLog.log_id)).scalar()

    # Logs in last 24 hours
    yesterday = datetime.utcnow() - timedelta(days=1)
    logs_24h = db.query(func.count(AuditLog.log_id)).filter(
        AuditLog.timestamp >= yesterday
    ).scalar()

    # Logs in last 7 days
    week_ago = datetime.utcnow() - timedelta(days=7)
    logs_7d = db.query(func.count(AuditLog.log_id)).filter(
        AuditLog.timestamp >= week_ago
    ).scalar()

    # Top actions
    top_actions = (
        db.query(
            AuditLog.action,
            func.count(AuditLog.log_id).label('count')
        )
        .group_by(AuditLog.action)
        .order_by(desc('count'))
        .limit(10)
        .all()
    )

    top_actions_list = [
        {"action": action.value, "count": count}
        for action, count in top_actions
    ]

    # Top users
    top_users = (
        db.query(
            AuditLog.user_id,
            User.email,
            User.phone_number,
            User.role,
            func.count(AuditLog.log_id).label('count')
        )
        .join(User, AuditLog.user_id == User.user_id)
        .group_by(AuditLog.user_id, User.email, User.phone_number, User.role)
        .order_by(desc('count'))
        .limit(10)
        .all()
    )

    top_users_list = [
        {
            "user_id": str(user_id),
            "email": email,
            "phone": phone,
            "role": role.value,
            "count": count
        }
        for user_id, email, phone, role, count in top_users
    ]

    # Top resources
    top_resources = (
        db.query(
            AuditLog.resource_type,
            func.count(AuditLog.log_id).label('count')
        )
        .filter(AuditLog.resource_type.isnot(None))
        .group_by(AuditLog.resource_type)
        .order_by(desc('count'))
        .limit(10)
        .all()
    )

    top_resources_list = [
        {"resource_type": resource_type, "count": count}
        for resource_type, count in top_resources
    ]

    return AuditLogStats(
        total_logs=total_logs or 0,
        logs_last_24h=logs_24h or 0,
        logs_last_7d=logs_7d or 0,
        top_actions=top_actions_list,
        top_users=top_users_list,
        top_resources=top_resources_list
    )


# ============================================================================
# USER ENDPOINTS (Own Audit Logs)
# ============================================================================

@router.get("/my-logs", response_model=List[AuditLogResponse])
async def get_my_audit_logs(
    action: Optional[AuditAction] = None,
    resource_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get your own audit logs (All authenticated users)

    Users can view their own activity for transparency and compliance.
    """
    query = db.query(AuditLog).filter(AuditLog.user_id == current_user.user_id)

    # Apply filters
    if action:
        query = query.filter(AuditLog.action == action)

    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)

    if start_date:
        query = query.filter(AuditLog.timestamp >= start_date)

    if end_date:
        query = query.filter(AuditLog.timestamp <= end_date)

    # Order by most recent first
    logs = query.order_by(desc(AuditLog.timestamp)).limit(limit).offset(offset).all()

    result = []
    for log in logs:
        log_dict = {
            "log_id": log.log_id,
            "user_id": log.user_id,
            "action": log.action.value,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "session_id": log.session_id,
            "details": log.details,
            "timestamp": log.timestamp,
            "user_email": current_user.email,
            "user_phone": current_user.phone_number,
            "user_role": current_user.role.value
        }
        result.append(AuditLogResponse(**log_dict))

    return result
