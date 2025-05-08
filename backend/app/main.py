from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Chatbot-Ollama API",
    description="FastAPI backend for Chatbot-Ollama",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from app.api.chat import router as chat_router
from app.api.messages import router as messages_router
from app.api.models import router as models_router
from app.api.users import router as users_router

app.include_router(chat_router)
app.include_router(messages_router)
app.include_router(models_router)
app.include_router(users_router)

@app.get("/")
async def root():
    return {"message": "Welcome to Chatbot-Ollama API"}

# Run the server with uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 