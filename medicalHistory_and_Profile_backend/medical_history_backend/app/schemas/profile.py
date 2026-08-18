"""
app/schemas/profile.py — Pydantic schemas for Patient Profile APIs.
"""
from __future__ import annotations

from typing import List, Optional, Any
from pydantic import BaseModel, Field, field_validator


class ProfileBase(BaseModel):
    name: Optional[str] = ""
    age: Optional[int] = None
    gender: Optional[str] = ""
    bloodGroup: Optional[str] = ""
    preferredLanguage: Optional[str] = "English"
    phone: Optional[str] = ""
    email: Optional[str] = ""
    allergies: Optional[List[str]] = Field(default_factory=list)
    chronicConditions: Optional[List[str]] = Field(default_factory=list)


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[Any] = None
    gender: Optional[str] = None
    bloodGroup: Optional[str] = None
    preferredLanguage: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    allergies: Optional[Any] = None
    chronicConditions: Optional[Any] = None

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v):
        if v not in ["Male", "Female", "Other", "Prefer not to say", "", None]:
            raise ValueError("Invalid gender value")
        return v

    @field_validator("bloodGroup")
    @classmethod
    def validate_blood_group(cls, v):
        if v not in ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "", None]:
            raise ValueError("Invalid blood group")
        return v

    @field_validator("preferredLanguage")
    @classmethod
    def validate_language(cls, v):
        if v not in ["English", "Hindi", "Tamil", "Telugu", "Kannada", "", None]:
            raise ValueError("Invalid language")
        return v


class ProfileResponse(BaseModel):
    success: bool = True
    data: ProfileBase


class MedicalHistoryUpdate(BaseModel):
    bloodGroup: Optional[str] = None
    allergies: Optional[Any] = None
    chronicConditions: Optional[Any] = None

    @field_validator("bloodGroup")
    @classmethod
    def validate_blood_group(cls, v):
        if v not in ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "", None]:
            raise ValueError("Invalid blood group")
        return v


class MedicalHistoryProfileResponse(BaseModel):
    success: bool = True
    data: dict
