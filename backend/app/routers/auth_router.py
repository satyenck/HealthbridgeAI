from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models_v2 import User, UserRole
from app.schemas_v2 import (
    UserCreate, UserResponse, Token,
    GoogleLoginRequest, PhoneSendCodeRequest, PhoneLoginRequest
)
from app.auth import create_access_token, get_current_user
from app.services.google_auth import GoogleAuthService
from app.services.phone_auth import phone_auth_service
from datetime import timedelta
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/google", response_model=Token)
async def google_login(
    auth_request: GoogleLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate user with Google OAuth.
    New users are created as PATIENT role by default.
    """
    try:
        google_auth = GoogleAuthService()
        user_info = google_auth.verify_google_token(auth_request.id_token)

        # Look up user by email
        user = db.query(User).filter(User.email == user_info['email']).first()

        if not user:
            # Create new user with PATIENT role
            user = User(
                email=user_info['email'],
                role=UserRole.PATIENT,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.user_id), "role": user.role.value},
            expires_delta=access_token_expires
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.user_id,
            "role": user.role
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google authentication failed: {str(e)}"
        )


@router.post("/phone/send-code")
async def send_phone_verification(
    phone_request: PhoneSendCodeRequest,
    db: Session = Depends(get_db)
):
    """
    Send verification code to phone number.
    Works for all user roles - patients create accounts on first login.
    """
    try:
        phone_auth_service.send_verification_code(phone_request.phone_number)
        return {"message": "Verification code sent successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/phone/verify", response_model=Token)
async def verify_phone_code(
    verify_request: PhoneLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Verify phone number with code and authenticate user.
    New users are created as PATIENT role by default.
    """
    is_valid = phone_auth_service.verify_code(
        verify_request.phone_number,
        verify_request.verification_code
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid verification code"
        )

    user = db.query(User).filter(User.phone_number == verify_request.phone_number).first()

    if not user:
        # Create new user with PATIENT role
        user = User(
            phone_number=verify_request.phone_number,
            role=UserRole.PATIENT,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.user_id), "role": user.role.value},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.user_id,
        "role": user.role
    }


@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current authenticated user's information.
    Returns user_id, role, phone_number, and email.
    """
    return {
        "user_id": str(current_user.user_id),
        "role": current_user.role.value,
        "phone_number": current_user.phone_number,
        "email": current_user.email,
        "is_active": current_user.is_active
    }
