from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.ddl import CreateTable
import os
import logging

from app.db.database import Base, engine, validate_db_config
from app.models.models import User, ChatSession, Message, Feedback, BusinessDocument, DocumentSection, RetrievalLog

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Special handling for PostgreSQL vector extension
@compiles(CreateTable, "postgresql")
def compile_create_table(create, compiler, **kw):
    sql = compiler.visit_create_table(create, **kw)
    if "document_sections" in sql and "embedding" in sql:
        logger.info("Modifying CREATE TABLE for document_sections to handle vector type")
        # Replace VECTOR with TEXT temporarily, we'll alter it later
        sql = sql.replace("embedding VECTOR(768)", "embedding TEXT")
    return sql

def create_tables():
    """Create all database tables if they don't exist"""
    # Validate database configuration
    validate_db_config()
    
    # Create extension for vector support
    try:
        with engine.connect() as conn:
            # First check if pgvector extension exists
            try:
                logger.info("Checking for pgvector extension...")
                result = conn.execute(text("SELECT * FROM pg_extension WHERE extname = 'vector';"))
                extension_exists = result.fetchone() is not None
                if not extension_exists:
                    logger.info("Creating pgvector extension...")
                    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                    conn.commit()
                    logger.info("Vector extension created successfully")
                else:
                    logger.info("Vector extension already exists")
            except Exception as e:
                logger.error(f"Error checking for vector extension: {e}")
                logger.warning("Will try to create the extension anyway...")
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                conn.commit()
                logger.info("Attempted to create vector extension")
    except Exception as e:
        logger.error(f"Error creating vector extension: {e}")
        logger.warning("Continuing without vector extension. Vector search functionality will not work.")
    
    # Create all tables
    try:
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        
        # Try to alter the document_sections table to use vector type if needed
        try:
            with engine.connect() as conn:
                # Check if the column exists and is of type TEXT
                result = conn.execute(text(
                    "SELECT data_type FROM information_schema.columns "
                    "WHERE table_name = 'document_sections' AND column_name = 'embedding';"
                ))
                column_type = result.scalar()
                
                if column_type and column_type.upper() == 'TEXT':
                    logger.info("Converting embedding column from TEXT to VECTOR type")
                    # Alter the column to use vector type
                    conn.execute(text("ALTER TABLE document_sections ALTER COLUMN embedding TYPE vector(768);"))
                    conn.commit()
                    logger.info("Column type altered successfully")
                else:
                    logger.info("Embedding column already has correct type or doesn't exist")
        except Exception as e:
            logger.error(f"Error altering embedding column type: {e}")
            logger.warning("Vector operations may not work correctly")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise

# Create admin user if it doesn't exist
def create_admin_user():
    """Create admin user if it doesn't exist"""
    from sqlalchemy.orm import sessionmaker
    from app.utils.auth import get_password_hash
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if admin user exists
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            logger.info("Creating admin user...")
            admin_user = User(
                username="admin",
                password_hash=get_password_hash("admin"),  # Change in production!
                email="admin@example.com",
                role="admin"
            )
            db.add(admin_user)
            db.commit()
            logger.info("Admin user created successfully")
        else:
            logger.info("Admin user already exists")
    except Exception as e:
        logger.error(f"Error creating admin user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_tables()
    create_admin_user() 