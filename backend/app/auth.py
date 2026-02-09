from datetime import datetime, timedelta
from typing import Optional, Tuple
from uuid import UUID
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models_v2 import User, UserRole
from app.schemas_v2 import TokenData
from app.services.session_manager import get_session_manager

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> Tuple[str, str]:
    """
    Create JWT access token with session tracking

    Args:
        data: Token payload data (must include 'sub' for user_id and 'role')
        expires_delta: Optional custom expiration time

    Returns:
        Tuple of (jwt_token, session_id)
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    # Create session for HIPAA compliance tracking
    session_manager = get_session_manager()
    user_id = UUID(data["sub"])
    role = data.get("role", "")
    session_id = session_manager.create_session(user_id, role)

    # Add session_id to JWT payload
    to_encode.update({
        "exp": expire,
        "session_id": session_id
    })

    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt, session_id


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current user from JWT token with session validation

    Validates both JWT token and active session.
    Extends session TTL on each request (sliding window).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    session_expired_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session expired. Please login again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode JWT token
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        role_str: str = payload.get("role")
        session_id: str = payload.get("session_id")

        if user_id_str is None:
            raise credentials_exception

        # Validate session (HIPAA compliance - 15 min timeout with activity renewal)
        if session_id:
            session_manager = get_session_manager()
            session_data = session_manager.validate_session(session_id)

            if session_data is None:
                # Session expired or invalid
                raise session_expired_exception

            # Verify session user_id matches token user_id
            if session_data.get("user_id") != user_id_str:
                raise credentials_exception

        # Convert string UUID to UUID object
        user_id = UUID(user_id_str)
        token_data = TokenData(user_id=user_id, role=role_str)
    except JWTError:
        raise credentials_exception
    except ValueError:
        raise credentials_exception

    # Get user from database
    user = db.query(User).filter(User.user_id == token_data.user_id).first()
    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_doctor(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor access required"
        )
    return current_user


async def get_current_doctor_or_assistant(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Allows both DOCTOR and DOCTOR_ASSISTANT roles.
    Use this for endpoints that assistants should access.
    """
    if current_user.role not in [UserRole.DOCTOR, UserRole.DOCTOR_ASSISTANT]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor or Doctor Assistant access required"
        )
    return current_user


async def get_current_patient(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient access required"
        )
    return current_user


async def get_current_lab(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role != UserRole.LAB:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lab access required"
        )
    return current_user


async def get_current_pharmacy(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role != UserRole.PHARMACY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pharmacy access required"
        )
    return current_user


async def get_current_admin(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
