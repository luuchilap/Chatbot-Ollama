from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables if not already loaded
load_dotenv()

# Database connection configuration
DB_USER = os.getenv("PG_USER", "postgres")
DB_PASSWORD = os.getenv("PG_PASSWORD", "lap20040106")
DB_HOST = os.getenv("PG_HOST", "localhost")
DB_PORT = os.getenv("PG_PORT", "5432")
DB_NAME = os.getenv("PG_DATABASE", "chatbot_ollama")

# Create SQLAlchemy database URL
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Function to validate DB config
def validate_db_config():
    """Validates the database configuration and warns about missing env variables"""
    if not os.getenv("PG_USER"):
        print("Warning: PG_USER environment variable not set, using default: postgres")
    
    if not os.getenv("PG_HOST"):
        print("Warning: PG_HOST environment variable not set, using default: localhost")
    
    if not os.getenv("PG_DATABASE"):
        print("Warning: PG_DATABASE environment variable not set, using default: chatbot_ollama")
    
    if not os.getenv("PG_PASSWORD"):
        print("Warning: PG_PASSWORD environment variable not set, using default password")
    
    if not os.getenv("PG_PORT"):
        print("Warning: PG_PORT environment variable not set, using default: 5432")
    
    return True 