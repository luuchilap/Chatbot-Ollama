from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean, JSON, ARRAY, func, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declared_attr
import pgvector.sqlalchemy

from app.db.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    email = Column(String(255), unique=True)
    role = Column(String(50), default="user")
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    sessions = relationship("ChatSession", back_populates="user")
    feedbacks = relationship("Feedback", back_populates="user")

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    session_title = Column(String(255))
    started_at = Column(DateTime, default=func.now())
    ended_at = Column(DateTime, nullable=True)
    session_metadata = Column(JSON, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")
    retrieval_logs = relationship("RetrievalLog", back_populates="session", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"))
    sender = Column(String(50), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())
    message_type = Column(String(50), default="text")
    sources = Column(JSON, nullable=True)
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    feedbacks = relationship("Feedback", back_populates="message", cascade="all, delete-orphan")

class Feedback(Base):
    __tablename__ = "feedbacks"
    
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    rating = Column(Integer)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    # Add check constraint to ensure rating is between 1 and 5
    __table_args__ = (
        CheckConstraint('rating BETWEEN 1 AND 5', name='check_rating_range'),
    )
    
    # Relationships
    message = relationship("Message", back_populates="feedbacks")
    user = relationship("User", back_populates="feedbacks")

class BusinessDocument(Base):
    __tablename__ = "business_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String(20), default="active")  # active / archived
    created_at = Column(DateTime, default=func.now())
    tags = Column(ARRAY(String), nullable=True)
    
    # Relationships
    sections = relationship("DocumentSection", back_populates="document", cascade="all, delete-orphan")

class DocumentSection(Base):
    __tablename__ = "document_sections"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("business_documents.id", ondelete="CASCADE"))
    section_title = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    embedding = Column(pgvector.sqlalchemy.Vector(768), nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    document = relationship("BusinessDocument", back_populates="sections")

class RetrievalLog(Base):
    __tablename__ = "retrieval_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"))
    user_question = Column(Text, nullable=False)
    retrieved_section_ids = Column(ARRAY(Integer), nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    session = relationship("ChatSession", back_populates="retrieval_logs") 