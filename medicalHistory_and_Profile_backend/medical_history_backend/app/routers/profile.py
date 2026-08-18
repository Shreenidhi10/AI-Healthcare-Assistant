"""
app/routers/profile.py — FastAPI router for Patient Profile APIs.
"""
from __future__ import annotations

from typing import Any, Dict
from fastapi import APIRouter, Request
from app.controllers import profile_controller

router = APIRouter(prefix="/api/profile", tags=["Profile"])


@router.get("")
@router.get("/")
async def get_profile():
    data = await profile_controller.get_profile_data()
    return {"success": True, "data": data}


@router.put("")
@router.put("/")
async def update_profile(request: Request):
    body = await request.json()
    data = await profile_controller.update_profile_data(body)
    return {"success": True, "message": "Profile updated successfully", "data": data}


@router.get("/medical-history")
async def get_medical_history():
    data = await profile_controller.get_medical_history_data()
    return {"success": True, "data": data}


@router.put("/medical-history")
async def update_medical_history(request: Request):
    body = await request.json()
    data = await profile_controller.update_medical_history_data(body)
    return {"success": True, "message": "Medical history updated successfully", "data": data}
