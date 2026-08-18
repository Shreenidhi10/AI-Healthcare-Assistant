"""
app/routers/base.py — FastAPI base routes (/health, /, /extract).
"""
from __future__ import annotations

import datetime
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from app.config.settings import settings
from app.services.pipeline import get_pipeline
from app.utils.exceptions import InvalidFileError, MedicalAIError

router = APIRouter(tags=["Base"])


@router.get("/")
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "endpoints": [
            "POST /extract",
            "GET /api/health",
            "POST /api/medical-history/upload",
            "GET /api/medical-history",
            "GET /api/medical-history/{id}",
            "DELETE /api/medical-history/{id}",
            "GET /api/profile",
            "PUT /api/profile",
            "GET /api/profile/medical-history",
            "PUT /api/profile/medical-history",
            "GET /api/prescriptions",
            "GET /api/prescriptions/stats",
            "GET /api/prescriptions/{id}",
            "POST /api/prescriptions",
            "DELETE /api/prescriptions/{id}",
        ],
    }


@router.get("/api/health")
async def health_check():
    return {
        "success": True,
        "message": "Medical History & Profile backend is running",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
    }


@router.post("/extract")
async def extract_prescription(file: UploadFile = File(...)):
    pipeline = get_pipeline()
    try:
        return await pipeline.run(file)
    except InvalidFileError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    except MedicalAIError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc
