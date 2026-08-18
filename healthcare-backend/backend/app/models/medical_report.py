"""
MedicalReport — the real, DB-backed result of the OCR -> NLP pipeline
for one OCRDocument.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, backref, mapped_column, relationship
from sqlalchemy.types import JSON

from app.database.base import BaseModel, GUID


class MedicalReport(BaseModel):
    __tablename__ = "medical_reports"

    user_id: Mapped[str] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    document_id: Mapped[str] = mapped_column(
        GUID(),
        ForeignKey("ocr_documents.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )

    # ---------------- OCR ----------------

    ocr_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )

    ocr_confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    language: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="en",
    )

    # ---------------- Extracted fields ----------------

    patient_name: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True,
    )

    doctor_name: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True,
    )

    hospital: Mapped[Optional[str]] = mapped_column(
        String(200),
        nullable=True,
    )

    primary_medication: Mapped[Optional[str]] = mapped_column(
        String(200),
        nullable=True,
    )

    # ---------------- Structured NLP Output ----------------

    entities: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )

    # ⭐ NEW FEATURE
    prescription_summary: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        default=None,
        nullable=True,
    )

    status: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    needs_review: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
    )

    # ---------------- Timings ----------------

    processing_time: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    ocr_time: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    nlp_time: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    # ---------------- Relationships ----------------

    user = relationship(
        "User",
        backref="medical_reports",
    )

    document = relationship(
        "OCRDocument",
        backref=backref(
            "medical_report",
            uselist=False,
        ),
    )