"""
app/routers/prescriptions.py — FastAPI router for Prescriptions & Stats APIs.
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Query, Request
from app.controllers import prescription_controller

router = APIRouter(prefix="/api/prescriptions", tags=["Prescriptions"])


@router.get("")
@router.get("/")
async def list_prescriptions(
    search: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    doctor: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort: Optional[str] = Query("-createdAt"),
):
    data = await prescription_controller.list_prescriptions(
        search=search, language=language, doctor=doctor, status=status, sort=sort
    )
    return {"success": True, "count": len(data), "data": data}


@router.get("/stats")
async def get_stats():
    data = await prescription_controller.get_stats()
    return {"success": True, "data": data}


@router.get("/{id}")
async def get_prescription(id: str):
    data = await prescription_controller.get_prescription(id)
    return {"success": True, "data": data}


@router.post("")
@router.post("/")
async def create_prescription(request: Request):
    body = await request.json()
    data = await prescription_controller.create_prescription(body)
    return {"success": True, "message": "Prescription created successfully", "data": data}


@router.delete("/{id}")
async def delete_prescription(id: str):
    await prescription_controller.delete_prescription(id)
    return {"success": True, "message": "Prescription deleted successfully"}
