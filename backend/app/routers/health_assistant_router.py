from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models_v2 import User
from app.auth import get_current_patient
from app.services.gemini_service import gemini_service
from pydantic import BaseModel

router = APIRouter(prefix="/api/health-assistant", tags=["Health Assistant"])


class Message(BaseModel):
    role: str  # "assistant" or "user"
    content: str


class InterviewRequest(BaseModel):
    conversation_history: List[Message]


class InterviewResponse(BaseModel):
    next_question: Optional[str] = None
    is_complete: bool
    summary: Optional[str] = None


@router.post("/interview", response_model=InterviewResponse)
async def conduct_interview(
    request: InterviewRequest,
    current_patient: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """
    Conduct intelligent symptom interview with the patient.

    The AI will:
    1. Ask up to 6 intelligent follow-up questions
    2. Base questions on patient's previous responses
    3. Generate comprehensive symptoms summary after 6 questions

    Args:
        conversation_history: List of messages with role ("assistant" or "user") and content

    Returns:
        - next_question: The next question to ask (if not complete)
        - is_complete: Whether the interview is complete
        - summary: Comprehensive symptoms summary (if complete)
    """
    try:
        # Convert to dict format expected by service
        conversation_history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversation_history
        ]

        # Get response from AI
        result = gemini_service.conduct_symptom_interview(conversation_history)

        return InterviewResponse(
            next_question=result.get("next_question"),
            is_complete=result.get("is_complete"),
            summary=result.get("summary")
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
