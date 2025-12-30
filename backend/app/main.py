import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base

# Import new v2 models to register with SQLAlchemy
from app import models_v2

# Import all routers
from app.routers import (
    auth_router,
    profile_router,
    encounter_router,
    doctor_router,
    admin_router,
    lab_router,
    pharmacy_router,
    health_assistant_router
)

# Database tables created via SQL migration (init_v2_schema.sql)
# Base.metadata.create_all(bind=engine)  # Commented out - using SQL migrations

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered healthcare consultation platform with voice-first architecture",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Create necessary directories on startup"""
    os.makedirs("uploads/encounters", exist_ok=True)
    os.makedirs("uploads/media", exist_ok=True)


# Include routers
app.include_router(auth_router.router)
app.include_router(profile_router.router)
app.include_router(encounter_router.router)
app.include_router(doctor_router.router)
app.include_router(admin_router.router)
app.include_router(lab_router.router)
app.include_router(pharmacy_router.router)
app.include_router(health_assistant_router.router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to HealthbridgeAI API v2",
        "version": "2.0.0",
        "status": "active",
        "features": [
            "UUID-based architecture",
            "5 user roles (Patient, Doctor, Lab, Pharmacy, Admin)",
            "Longitudinal health tracking",
            "Voice-first design",
            "Media upload support"
        ]
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
