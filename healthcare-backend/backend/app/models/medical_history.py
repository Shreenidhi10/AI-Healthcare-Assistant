"""
MedicalHistoryEntry — a real, DB-backed timeline of a patient's
diagnosed conditions, replacing the profile_controller's in-memory
`bloodGroup` / `chronicConditions` snapshot with proper individual
records that can be created, listed, and deleted independently
(each with its own diagnosis date, status, and notes).
"""
from __future__ import annotations

from datetime import date as date_type
from typing import Optional

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel, GUID


class MedicalHistoryEntry(BaseModel):
    __tablename__ = "medical_history_entries"

    user_id: Mapped[str] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    condition: Mapped[str] = mapped_column(String(200), nullable=False)
    diagnosed_date: Mapped[Optional[date_type]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)  # active/resolved/chronic
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    user = relationship("User", backref="medical_history_entries")
