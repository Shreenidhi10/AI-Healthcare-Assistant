"""Patient Profile API (Phase 4). All routes require authentication and
operate only on the current user's own profile."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.profile import PatientProfileResponse, PatientProfileUpdate
from app.services.profile_service import get_profile_service

router = APIRouter(prefix="/profile", tags=["Patient Profile"])


@router.get("", response_model=PatientProfileResponse)
@router.get("/", response_model=PatientProfileResponse, include_in_schema=False)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = get_profile_service(db)
    return service.get_or_create_profile(str(current_user.id))


@router.put("", response_model=PatientProfileResponse)
@router.put("/", response_model=PatientProfileResponse, include_in_schema=False)
def update_profile(
    payload: PatientProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = get_profile_service(db)
    return service.update_profile(str(current_user.id), payload)
