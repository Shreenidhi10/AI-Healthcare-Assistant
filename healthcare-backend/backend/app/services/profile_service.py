"""
app/services/profile_service.py — business logic for Patient Profile &
Medical History (Phase 4). Replaces
medicalHistory_and_Profile_backend's in-memory `_in_memory_profiles`
stub controller with real, DB-backed CRUD keyed to users.id.
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.medical_history import MedicalHistoryEntry
from app.models.patient_profile import PatientProfile
from app.schemas.profile import (
    MedicalHistoryEntryCreate,
    MedicalHistoryEntryUpdate,
    PatientProfileUpdate,
)
from app.services.activity_service import log_activity


class ProfileService:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create_profile(self, user_id: str) -> PatientProfile:
        profile = self.db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()
        if profile is None:
            profile = PatientProfile(user_id=user_id, allergies=[], chronic_conditions=[])
            self.db.add(profile)
            self.db.commit()
            self.db.refresh(profile)
        return profile

    def update_profile(self, user_id: str, payload: PatientProfileUpdate) -> PatientProfile:
        profile = self.get_or_create_profile(user_id)
        updates = payload.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(profile, field, value)
        self.db.add(profile)
        log_activity(self.db, user_id, "profile_update", "Updated patient profile.", commit=False)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    # -- Medical History entries ------------------------------------------

    def list_history(self, user_id: str) -> List[MedicalHistoryEntry]:
        return (
            self.db.query(MedicalHistoryEntry)
            .filter(MedicalHistoryEntry.user_id == user_id)
            .order_by(MedicalHistoryEntry.created_at.desc())
            .all()
        )

    def create_history_entry(self, user_id: str, payload: MedicalHistoryEntryCreate) -> MedicalHistoryEntry:
        entry = MedicalHistoryEntry(user_id=user_id, **payload.model_dump())
        self.db.add(entry)
        log_activity(
            self.db, user_id, "medical_history_update", f"Added condition '{payload.condition}'.", commit=False
        )
        self.db.commit()
        self.db.refresh(entry)
        return entry

    def update_history_entry(
        self, user_id: str, entry_id: str, payload: MedicalHistoryEntryUpdate
    ) -> MedicalHistoryEntry:
        entry = self._get_owned_entry(user_id, entry_id)
        updates = payload.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(entry, field, value)
        self.db.add(entry)
        log_activity(
            self.db, user_id, "medical_history_update", f"Updated condition '{entry.condition}'.", commit=False
        )
        self.db.commit()
        self.db.refresh(entry)
        return entry

    def delete_history_entry(self, user_id: str, entry_id: str) -> None:
        entry = self._get_owned_entry(user_id, entry_id)
        self.db.delete(entry)
        log_activity(
            self.db, user_id, "medical_history_update", f"Removed condition '{entry.condition}'.", commit=False
        )
        self.db.commit()

    def _get_owned_entry(self, user_id: str, entry_id: str) -> MedicalHistoryEntry:
        entry = (
            self.db.query(MedicalHistoryEntry)
            .filter(MedicalHistoryEntry.id == entry_id, MedicalHistoryEntry.user_id == user_id)
            .first()
        )
        if entry is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical history entry not found")
        return entry


def get_profile_service(db: Session) -> ProfileService:
    return ProfileService(db)
