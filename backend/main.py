import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base
from routers import themes, documents, conversations, settings, chat

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="KB Knowledge Base API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Register routers
app.include_router(themes.router)
app.include_router(documents.router)
app.include_router(conversations.router)
app.include_router(settings.router)
app.include_router(chat.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
