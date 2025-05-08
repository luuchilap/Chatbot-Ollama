# Initialize database and create tables
python -m app.db.create_db

# Run the FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload 