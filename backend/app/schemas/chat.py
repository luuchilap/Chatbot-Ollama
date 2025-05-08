from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ChatOptions(BaseModel):
    temperature: Optional[float] = 1.0

class ChatBody(BaseModel):
    model: str
    system: Optional[str] = None
    options: Optional[ChatOptions] = None
    prompt: str

class ChatSessionBase(BaseModel):
    session_title: Optional[str] = None
    session_metadata: Optional[Dict[str, Any]] = None

class ChatSessionCreate(ChatSessionBase):
    user_id: int

class ChatSessionUpdate(ChatSessionBase):
    ended_at: Optional[datetime] = None

class ChatSession(ChatSessionBase):
    id: int
    user_id: int
    started_at: datetime
    ended_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class OllamaModel(BaseModel):
    name: str
    modified_at: datetime
    size: int

class OllamaModelDetails(BaseModel):
    license: Optional[str] = None
    modelfile: Optional[str] = None
    parameters: Optional[str] = None
    template: Optional[str] = None
    system: Optional[str] = None 