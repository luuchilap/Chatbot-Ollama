from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime

class FeedbackBase(BaseModel):
    message_id: int
    rating: int
    comment: Optional[str] = None
    
    @validator('rating')
    def rating_must_be_valid(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Rating must be between 1 and 5')
        return v

class FeedbackCreate(FeedbackBase):
    user_id: Optional[int] = None

class Feedback(FeedbackBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class FeedbackResponse(BaseModel):
    id: int
    message_id: int
    user_id: Optional[int] = None
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True 