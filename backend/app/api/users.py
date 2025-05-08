from fastapi import APIRouter, HTTPException, Depends, Path, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta

from app.db.database import get_db
from app.models.models import User, ChatSession
from app.schemas.user import UserCreate, User as UserSchema, UserLogin, Token, UserUpdate
from app.utils.auth import authenticate_user, create_access_token, get_password_hash, get_current_active_user

# Constants
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Create router
router = APIRouter(prefix="/api/users", tags=["users"])

@router.post("/register", response_model=UserSchema)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user
    """
    # Check if username already exists
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Check if email already exists if provided
    if user.email:
        db_email = db.query(User).filter(User.email == user.email).first()
        if db_email:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        role=user.role
    )
    
    # Add to database
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Remove password from response
    user_response = UserSchema.from_orm(db_user)
    return user_response

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Get access token for user login
    """
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserSchema)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Get current user information
    """
    return current_user

@router.put("/me", response_model=UserSchema)
async def update_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update current user information
    """
    # Update user fields
    if user_update.username is not None:
        # Check if username already exists
        db_user = db.query(User).filter(User.username == user_update.username).first()
        if db_user and db_user.id != current_user.id:
            raise HTTPException(status_code=400, detail="Username already registered")
        current_user.username = user_update.username
    
    if user_update.email is not None:
        # Check if email already exists
        db_user = db.query(User).filter(User.email == user_update.email).first()
        if db_user and db_user.id != current_user.id:
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = user_update.email
    
    if user_update.password is not None:
        current_user.password_hash = get_password_hash(user_update.password)
    
    # Only admin can change role
    if user_update.role is not None and current_user.role == "admin":
        current_user.role = user_update.role
    
    # Update in database
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.get("/sessions", response_model=List[int])
async def get_user_sessions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all session IDs for the current user
    """
    sessions = db.query(ChatSession.id).filter(ChatSession.user_id == current_user.id).all()
    return [session.id for session in sessions] 