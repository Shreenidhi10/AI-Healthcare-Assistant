"""Medical History CRUD API (Phase 4). All routes require authentication
and operate only on the current user's own history entries."""
from __future__ import annotations

import uuid

from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.profile import (
    MedicalHistoryEntryCreate,
    MedicalHistoryEntryResponse,
    MedicalHistoryEntryUpdate,
)
from app.services.profile_service import get_profile_service

router = APIRouter(prefix="/medical-history", tags=["Medical History"])


@router.get("", response_model=List[MedicalHistoryEntryResponse])
@router.get("/", response_model=List[MedicalHistoryEntryResponse], include_in_schema=False)
def list_medical_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = get_profile_service(db)
    return service.list_history(str(current_user.id))


@router.post("", response_model=MedicalHistoryEntryResponse, status_code=status.HTTP_201_CREATED)
@router.post(
    "/", response_model=MedicalHistoryEntryResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False
)
def create_medical_history_entry(
    payload: MedicalHistoryEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = get_profile_service(db)
    return service.create_history_entry(str(current_user.id), payload)


@router.put("/{entry_id}", response_model=MedicalHistoryEntryResponse)
def update_medical_history_entry(
    entry_id: uuid.UUID,
    payload: MedicalHistoryEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = get_profile_service(db)
    return service.update_history_entry(str(current_user.id), str(entry_id), payload)


@router.delete("/{entry_id}", status_code=status.HTTP_200_OK)
def delete_medical_history_entry(
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = get_profile_service(db)
    service.delete_history_entry(str(current_user.id), str(entry_id))
    return {"success": True, "message": "Medical history entry deleted successfully."}

