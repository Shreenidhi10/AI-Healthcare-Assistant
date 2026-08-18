"""
Simplification — patient-friendly rewrite of a MedicalReport's OCR
text/entities, produced by SimplificationService (Phase 7). Stored so
a report's simplified text doesn't need to be regenerated on every
read, and so Translation rows can reference it as a source.
"""
from __future__ import annotations

from sqlalchemy import ForeignKey, Text
from sqlalchemy.orm import Mapped, backref, mapped_column, relationship

from app.database.base import BaseModel, GUID


class Simplification(BaseModel):
    __tablename__ = "simplifications"

    report_id: Mapped[str] = mapped_column(
        GUID(), ForeignKey("medical_reports.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )

    simplified_text: Mapped[str] = mapped_column(Text, nullable=False, default="")

    report = relationship("MedicalReport", backref=backref("simplification", uselist=False))
