from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models_v2 import User, PatientProfile, UserRole
from app.schemas_v2 import (
    PatientProfileCreate, PatientProfileResponse, PatientProfileUpdate,
    VoiceTranscriptionRequest
)
from app.auth import get_current_active_user, get_current_patient
from app.services.openai_service import openai_service
import json

router = APIRouter(prefix="/api/profile", tags=["Profile"])


@router.post("/", response_model=PatientProfileResponse)
async def create_profile(
    profile: PatientProfileCreate,
    current_patient: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    Create patient profile (Patient only).
    """
    existing_profile = db.query(PatientProfile).filter(
        PatientProfile.user_id == current_patient.user_id
    ).first()

    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile already exists. Use update endpoint."
        )

    new_profile = PatientProfile(
        user_id=current_patient.user_id,
        first_name=profile.first_name,
        last_name=profile.last_name,
        date_of_birth=profile.date_of_birth,
        gender=profile.gender,
        general_health_issues=profile.general_health_issues
    )

    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)

    return new_profile


@router.get("/", response_model=PatientProfileResponse)
async def get_profile(
    current_patient: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    Get current patient's profile.
    """
    profile = db.query(PatientProfile).filter(
        PatientProfile.user_id == current_patient.user_id
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    return profile


@router.patch("/", response_model=PatientProfileResponse)
async def update_profile(
    profile_update: PatientProfileUpdate,
    current_patient: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    Update patient profile (Patient only).
    """
    profile = db.query(PatientProfile).filter(
        PatientProfile.user_id == current_patient.user_id
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    # Update only provided fields
    if profile_update.first_name is not None:
        profile.first_name = profile_update.first_name
    if profile_update.last_name is not None:
        profile.last_name = profile_update.last_name
    if profile_update.date_of_birth is not None:
        profile.date_of_birth = profile_update.date_of_birth
    if profile_update.gender is not None:
        profile.gender = profile_update.gender
    if profile_update.general_health_issues is not None:
        profile.general_health_issues = profile_update.general_health_issues

    db.commit()
    db.refresh(profile)

    return profile


@router.post("/transcribe-voice")
async def transcribe_voice(
    voice_request: VoiceTranscriptionRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Transcribe voice input to text for profile creation
    """
    try:
        transcription = openai_service.transcribe_audio(voice_request.audio_base64)
        return {"transcription": transcription}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/parse-voice-profile")
async def parse_voice_profile(
    voice_request: VoiceTranscriptionRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Transcribe voice and extract profile information using AI
    """
    try:
        transcription = openai_service.transcribe_audio(voice_request.audio_base64)

        prompt = f"""Extract the following profile information from this transcription: "{transcription}"

Please extract and return a JSON object with these fields:
- first_name: string
- last_name: string
- date_of_birth: string (YYYY-MM-DD format)
- gender: string (Male, Female, Other, or Prefer Not to Say)
- general_health_issues: string (any mentioned health conditions or null if not mentioned)

If any field is not mentioned, use null."""

        response = openai_service.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that extracts structured profile information from text."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )

        profile_data = json.loads(response.choices[0].message.content)

        return {
            "transcription": transcription,
            "profile_data": profile_data
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
