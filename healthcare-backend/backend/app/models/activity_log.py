"""
ActivityLog — a user-facing feed of feature usage (OCR upload,
simplification, translation, profile update, medical history change)
that powers the Dashboard's "recent activity" list. Distinct from
AuditLog, which is the security/compliance-oriented record of
authentication events (see audit_log.py).
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel, GUID


class ActivityLog(BaseModel):
    __tablename__ = "activity_logs"

    user_id: Mapped[str] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "ocr_upload", "simplify", "translate"
    description: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    reference_id: Mapped[Optional[str]] = mapped_column(GUID(), nullable=True)  # e.g. related MedicalReport.id

    user = relationship("User", backref="activity_logs")
