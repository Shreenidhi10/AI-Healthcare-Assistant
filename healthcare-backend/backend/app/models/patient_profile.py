"""
PatientProfile — replaces the medicalHistory_and_Profile_backend's
in-memory `_in_memory_profiles` dict stub with a real table keyed to
users.id.

Allergies and chronic conditions are stored as JSON string arrays
(portable across SQLite dev and Postgres prod without needing native
array types).
"""
from __future__ import annotations

from typing import List, Optional

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, backref, mapped_column, relationship
from sqlalchemy.types import JSON

from app.database.base import BaseModel, GUID


class PatientProfile(BaseModel):
    __tablename__ = "patient_profiles"

    user_id: Mapped[str] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )

    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    allergies: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    chronic_conditions: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)

    user = relationship("User", backref=backref("patient_profile", uselist=False))
