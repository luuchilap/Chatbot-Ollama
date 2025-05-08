from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class MessageBase(BaseModel):
    session_id: int
    sender: str  # 'user' or 'assistant'
    content: str
    message_type: Optional[str] = "text"
    sources: Optional[Dict[str, Any]] = None

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class MessageResponse(BaseModel):
    id: int
    content: str
    sender: str
    created_at: datetime
    message_type: str
    sources: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

class SessionMessagesResponse(BaseModel):
    session_id: int
    messages: List[MessageResponse] 