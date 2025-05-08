from fastapi import APIRouter, HTTPException, Depends, Path, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.db.database import get_db
from app.models.models import Message, ChatSession
from app.schemas.message import MessageCreate, Message as MessageSchema, MessageResponse, SessionMessagesResponse
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.models.models import Feedback

# Create router
router = APIRouter(prefix="/api/messages", tags=["messages"])

@router.post("/save", response_model=MessageResponse)
async def save_message(message: MessageCreate, db: Session = Depends(get_db)):
    """
    Save a message to the database
    """
    # Check if the chat session exists
    session = db.query(ChatSession).filter(ChatSession.id == message.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Create new message
    db_message = Message(
        session_id=message.session_id,
        sender=message.sender,
        content=message.content,
        message_type=message.message_type,
        sources=message.sources
    )
    
    # Add to database
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    return db_message

@router.post("/save-response", response_model=MessageResponse)
async def save_response(message: MessageCreate, db: Session = Depends(get_db)):
    """
    Save an assistant response to the database
    """
    # Make sure it's an assistant message
    if message.sender != "assistant":
        raise HTTPException(status_code=400, detail="Invalid sender, must be 'assistant'")
    
    # Check if the chat session exists
    session = db.query(ChatSession).filter(ChatSession.id == message.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Create new message
    db_message = Message(
        session_id=message.session_id,
        sender=message.sender,
        content=message.content,
        message_type=message.message_type,
        sources=message.sources
    )
    
    # Add to database
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    return db_message

@router.get("/get-session/{session_id}", response_model=SessionMessagesResponse)
async def get_session_messages(
    session_id: int = Path(...),
    db: Session = Depends(get_db)
):
    """
    Get all messages for a session
    """
    # Check if the chat session exists
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Get all messages for the session
    messages = db.query(Message).filter(Message.session_id == session_id).order_by(Message.created_at).all()
    
    return {"session_id": session_id, "messages": messages}

@router.post("/save-feedback", response_model=FeedbackResponse)
async def save_feedback(feedback: FeedbackCreate, db: Session = Depends(get_db)):
    """
    Save feedback for a message
    """
    # Check if the message exists
    message = db.query(Message).filter(Message.id == feedback.message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Create new feedback
    db_feedback = Feedback(
        message_id=feedback.message_id,
        user_id=feedback.user_id,
        rating=feedback.rating,
        comment=feedback.comment
    )
    
    # Add to database
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    
    return db_feedback

@router.get("/get-feedback/{message_id}", response_model=FeedbackResponse)
async def get_feedback(
    message_id: int = Path(...),
    db: Session = Depends(get_db)
):
    """
    Get feedback for a message
    """
    # Get feedback for the message
    feedback = db.query(Feedback).filter(Feedback.message_id == message_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    return feedback 