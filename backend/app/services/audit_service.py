"""
Audit Logging Service for HIPAA Compliance
Tracks all access and modifications to PHI (Protected Health Information)
"""
from functools import wraps
from typing import Optional, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import Request
from app.models_v2 import AuditLog, AuditAction, User
import logging

logger = logging.getLogger(__name__)


class AuditService:
    """
    Service for creating and managing audit logs
    """

    @staticmethod
    def log_action(
        db: Session,
        user_id: UUID,
        action: AuditAction,
        resource_type: Optional[str] = None,
        resource_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """
        Create an audit log entry

        Args:
            db: Database session
            user_id: User who performed the action
            action: Action performed (VIEW, CREATE, UPDATE, DELETE, etc.)
            resource_type: Type of resource accessed (PATIENT, ENCOUNTER, etc.)
            resource_id: ID of the specific resource
            ip_address: Client IP address
            user_agent: Client user agent string
            session_id: Session identifier
            details: Additional context (endpoint, changes, etc.)

        Returns:
            Created AuditLog instance
        """
        try:
            audit_log = AuditLog(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                ip_address=ip_address,
                user_agent=user_agent,
                session_id=session_id,
                details=details or {}
            )

            db.add(audit_log)
            db.commit()
            db.refresh(audit_log)

            logger.info(
                f"Audit Log: {action.value} {resource_type}:{resource_id} by user {user_id}"
            )

            return audit_log

        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
            db.rollback()
            # Don't fail the request if audit logging fails
            return None

    @staticmethod
    def log_from_request(
        db: Session,
        user: User,
        request: Request,
        action: AuditAction,
        resource_type: Optional[str] = None,
        resource_id: Optional[UUID] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """
        Create audit log from FastAPI request context

        Args:
            db: Database session
            user: Current authenticated user
            request: FastAPI Request object
            action: Action performed
            resource_type: Type of resource
            resource_id: ID of resource
            details: Additional context

        Returns:
            Created AuditLog instance
        """
        # Extract request metadata
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", None)

        # Extract session_id from JWT if available
        session_id = None
        try:
            from jose import jwt
            from app.config import settings

            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header.replace("Bearer ", "")
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                session_id = payload.get("session_id")
        except:
            pass

        # Build details dict
        audit_details = details or {}
        audit_details.update({
            "endpoint": str(request.url.path),
            "method": request.method,
            "query_params": dict(request.query_params) if request.query_params else {}
        })

        return AuditService.log_action(
            db=db,
            user_id=user.user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            details=audit_details
        )


def audit_log(action: AuditAction, resource_type: Optional[str] = None):
    """
    Decorator for automatic audit logging on endpoints

    Usage:
        @router.get("/{patient_id}")
        @audit_log(action=AuditAction.VIEW, resource_type="PATIENT")
        async def get_patient(
            patient_id: UUID,
            current_user: User = Depends(get_current_user),
            db: Session = Depends(get_db),
            request: Request = None
        ):
            ...

    Args:
        action: The audit action (VIEW, CREATE, UPDATE, DELETE, etc.)
        resource_type: Type of resource being accessed (optional, can be inferred)

    Returns:
        Decorated function
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Extract dependencies from kwargs
            db: Optional[Session] = kwargs.get('db')
            current_user: Optional[User] = kwargs.get('current_user')
            request: Optional[Request] = kwargs.get('request')

            # Execute the actual endpoint
            result = await func(*args, **kwargs)

            # Create audit log after successful execution
            if db and current_user and request:
                try:
                    # Try to extract resource_id from kwargs or result
                    resource_id = None

                    # Check common parameter names for IDs
                    for key in ['patient_id', 'encounter_id', 'report_id', 'file_id', 'user_id']:
                        if key in kwargs:
                            resource_id = kwargs[key]
                            break

                    # If result has an ID attribute, use it (for CREATE operations)
                    if resource_id is None and hasattr(result, 'user_id'):
                        resource_id = result.user_id
                    elif resource_id is None and hasattr(result, 'encounter_id'):
                        resource_id = result.encounter_id
                    elif resource_id is None and hasattr(result, 'report_id'):
                        resource_id = result.report_id

                    # Log the action
                    AuditService.log_from_request(
                        db=db,
                        user=current_user,
                        request=request,
                        action=action,
                        resource_type=resource_type,
                        resource_id=resource_id
                    )
                except Exception as e:
                    # Log error but don't fail the request
                    logger.error(f"Audit logging failed in decorator: {e}")

            return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Extract dependencies from kwargs
            db: Optional[Session] = kwargs.get('db')
            current_user: Optional[User] = kwargs.get('current_user')
            request: Optional[Request] = kwargs.get('request')

            # Execute the actual endpoint
            result = func(*args, **kwargs)

            # Create audit log after successful execution
            if db and current_user and request:
                try:
                    # Try to extract resource_id from kwargs or result
                    resource_id = None

                    # Check common parameter names for IDs
                    for key in ['patient_id', 'encounter_id', 'report_id', 'file_id', 'user_id']:
                        if key in kwargs:
                            resource_id = kwargs[key]
                            break

                    # If result has an ID attribute, use it
                    if resource_id is None and hasattr(result, 'user_id'):
                        resource_id = result.user_id
                    elif resource_id is None and hasattr(result, 'encounter_id'):
                        resource_id = result.encounter_id
                    elif resource_id is None and hasattr(result, 'report_id'):
                        resource_id = result.report_id

                    # Log the action
                    AuditService.log_from_request(
                        db=db,
                        user=current_user,
                        request=request,
                        action=action,
                        resource_type=resource_type,
                        resource_id=resource_id
                    )
                except Exception as e:
                    # Log error but don't fail the request
                    logger.error(f"Audit logging failed in decorator: {e}")

            return result

        # Return async wrapper if function is async, sync wrapper otherwise
        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


# Helper function for manual audit logging
def create_audit_log(
    db: Session,
    user: User,
    action: AuditAction,
    resource_type: Optional[str] = None,
    resource_id: Optional[UUID] = None,
    details: Optional[Dict[str, Any]] = None
) -> None:
    """
    Helper function to manually create audit logs

    Usage:
        create_audit_log(
            db=db,
            user=current_user,
            action=AuditAction.DELETE,
            resource_type="ENCOUNTER",
            resource_id=encounter_id,
            details={"reason": "Patient request"}
        )

    Args:
        db: Database session
        user: User performing action
        action: Audit action
        resource_type: Type of resource
        resource_id: ID of resource
        details: Additional context
    """
    try:
        AuditService.log_action(
            db=db,
            user_id=user.user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details
        )
    except Exception as e:
        logger.error(f"Failed to create manual audit log: {e}")
