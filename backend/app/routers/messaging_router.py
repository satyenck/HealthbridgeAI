"""
Messaging Router - Doctor-Patient Messaging
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, desc
from typing import List
from uuid import UUID
from pydantic import BaseModel

from app.database import get_db
from app.auth import get_current_active_user
from app.models_v2 import Message, User, UserRole

router = APIRouter(prefix="/api/messages", tags=["Messaging"])


# ============================================================================
# SCHEMAS
# ============================================================================

class MessageCreate(BaseModel):
    recipient_id: UUID
    content: str


class MessageResponse(BaseModel):
    message_id: UUID
    sender_id: UUID
    recipient_id: UUID
    sender_name: str
    recipient_name: str
    content: str
    is_read: bool
    created_at: str

    class Config:
        from_attributes = True


class ConversationSummary(BaseModel):
    user_id: UUID
    user_name: str
    user_role: str
    last_message: str
    last_message_time: str
    unread_count: int


class UnreadByUser(BaseModel):
    user_id: UUID
    user_name: str
    user_role: str
    unread_count: int


class UnreadCountResponse(BaseModel):
    total_unread: int
    unread_by_user: List[UnreadByUser]


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/", response_model=MessageResponse)
async def send_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send a message to another user"""

    # Verify recipient exists
    recipient = db.query(User).filter(User.user_id == message_data.recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    # Create message
    message = Message(
        sender_id=current_user.user_id,
        recipient_id=message_data.recipient_id,
        content=message_data.content,
        is_read=False
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    # Build response
    return MessageResponse(
        message_id=message.message_id,
        sender_id=message.sender_id,
        recipient_id=message.recipient_id,
        sender_name=f"{current_user.first_name} {current_user.last_name}",
        recipient_name=f"{recipient.first_name} {recipient.last_name}",
        content=message.content,
        is_read=message.is_read,
        created_at=message.created_at.isoformat()
    )


@router.get("/conversation/{other_user_id}", response_model=List[MessageResponse])
async def get_conversation(
    other_user_id: UUID,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get conversation with a specific user"""

    # Get messages between current user and other user
    messages = db.query(Message).filter(
        or_(
            and_(Message.sender_id == current_user.user_id, Message.recipient_id == other_user_id),
            and_(Message.sender_id == other_user_id, Message.recipient_id == current_user.user_id)
        )
    ).order_by(desc(Message.created_at)).limit(limit).all()

    # Get user details
    other_user = db.query(User).filter(User.user_id == other_user_id).first()
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Build responses
    result = []
    for msg in reversed(messages):  # Reverse to show oldest first
        sender = current_user if msg.sender_id == current_user.user_id else other_user
        recipient = other_user if msg.recipient_id == other_user_id else current_user

        result.append(MessageResponse(
            message_id=msg.message_id,
            sender_id=msg.sender_id,
            recipient_id=msg.recipient_id,
            sender_name=f"{sender.first_name} {sender.last_name}",
            recipient_name=f"{recipient.first_name} {recipient.last_name}",
            content=msg.content,
            is_read=msg.is_read,
            created_at=msg.created_at.isoformat()
        ))

    return result


@router.post("/conversation/{other_user_id}/mark-read")
async def mark_conversation_as_read(
    other_user_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark all messages from a user as read"""

    db.query(Message).filter(
        Message.sender_id == other_user_id,
        Message.recipient_id == current_user.user_id,
        Message.is_read == False
    ).update({"is_read": True})

    db.commit()

    return {"message": "Conversation marked as read"}


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get total unread message count and breakdown by user"""

    # Get all unread messages for current user
    unread_messages = db.query(Message, User).join(
        User, Message.sender_id == User.user_id
    ).filter(
        Message.recipient_id == current_user.user_id,
        Message.is_read == False
    ).all()

    # Group by sender
    unread_by_user_map = {}
    for msg, sender in unread_messages:
        if sender.user_id not in unread_by_user_map:
            unread_by_user_map[sender.user_id] = {
                "user_id": sender.user_id,
                "user_name": f"{sender.first_name} {sender.last_name}",
                "user_role": sender.role,
                "unread_count": 0
            }
        unread_by_user_map[sender.user_id]["unread_count"] += 1

    unread_by_user = [UnreadByUser(**data) for data in unread_by_user_map.values()]

    return UnreadCountResponse(
        total_unread=len(unread_messages),
        unread_by_user=unread_by_user
    )


@router.get("/conversations", response_model=List[ConversationSummary])
async def get_conversations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get list of all conversations with other users"""

    # Get all users the current user has messaged or been messaged by
    sent_to = db.query(Message.recipient_id).filter(
        Message.sender_id == current_user.user_id
    ).distinct().subquery()

    received_from = db.query(Message.sender_id).filter(
        Message.recipient_id == current_user.user_id
    ).distinct().subquery()

    # Get unique user IDs
    user_ids = db.query(User.user_id).filter(
        or_(
            User.user_id.in_(sent_to),
            User.user_id.in_(received_from)
        )
    ).all()

    conversations = []
    for (user_id,) in user_ids:
        user = db.query(User).filter(User.user_id == user_id).first()

        # Get last message
        last_message = db.query(Message).filter(
            or_(
                and_(Message.sender_id == current_user.user_id, Message.recipient_id == user_id),
                and_(Message.sender_id == user_id, Message.recipient_id == current_user.user_id)
            )
        ).order_by(desc(Message.created_at)).first()

        if not last_message:
            continue

        # Get unread count
        unread_count = db.query(Message).filter(
            Message.sender_id == user_id,
            Message.recipient_id == current_user.user_id,
            Message.is_read == False
        ).count()

        conversations.append(ConversationSummary(
            user_id=user.user_id,
            user_name=f"{user.first_name} {user.last_name}",
            user_role=user.role,
            last_message=last_message.content,
            last_message_time=last_message.created_at.isoformat(),
            unread_count=unread_count
        ))

    # Sort by last message time
    conversations.sort(key=lambda x: x.last_message_time, reverse=True)

    return conversations
