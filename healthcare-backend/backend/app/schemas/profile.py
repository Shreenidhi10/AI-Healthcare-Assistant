"""Pydantic schemas for Patient Profile & Medical History APIs (Phase 4)."""
from __future__ import annotations

import uuid
from datetime import date as date_type
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

_VALID_GENDERS = {"Male", "Female", "Other", "Prefer not to say"}
_VALID_BLOOD_GROUPS = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}


class PatientProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    allergies: List[str] = Field(default_factory=list)
    chronic_conditions: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PatientProfileUpdate(BaseModel):
    age: Optional[int] = Field(None, ge=0, le=150)
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    allergies: Optional[List[str]] = None
    chronic_conditions: Optional[List[str]] = None

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v):
        if v is not None and v not in _VALID_GENDERS:
            raise ValueError(f"Invalid gender. Must be one of: {sorted(_VALID_GENDERS)}")
        return v

    @field_validator("blood_group")
    @classmethod
    def validate_blood_group(cls, v):
        if v is not None and v not in _VALID_BLOOD_GROUPS:
            raise ValueError(f"Invalid blood group. Must be one of: {sorted(_VALID_BLOOD_GROUPS)}")
        return v


class MedicalHistoryEntryResponse(BaseModel):
    id: uuid.UUID
    condition: str
    diagnosed_date: Optional[date_type] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MedicalHistoryEntryCreate(BaseModel):
    condition: str = Field(..., min_length=1, max_length=200)
    diagnosed_date: Optional[date_type] = None
    status: str = Field("active", description="active | resolved | chronic")
    notes: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        allowed = {"active", "resolved", "chronic"}
        if v not in allowed:
            raise ValueError(f"Invalid status. Must be one of: {sorted(allowed)}")
        return v


class MedicalHistoryEntryUpdate(BaseModel):
    condition: Optional[str] = None
    diagnosed_date: Optional[date_type] = None
    status: Optional[str] = None
    notes: Optional[str] = None
