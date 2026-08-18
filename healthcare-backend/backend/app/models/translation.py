"""
Translation — a translated variant of either a MedicalReport's OCR
text or its Simplification, in one of the five supported languages
(en, ta, kn, te, hi). `source_type` + `source_id` form a lightweight
polymorphic reference instead of two nullable foreign keys, since a
translation is always of exactly one of the two source kinds.

Unique on (source_type, source_id, target_language) so re-requesting a
translation that already exists returns the cached row instead of
creating a duplicate.
"""
from __future__ import annotations

from sqlalchemy import String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import BaseModel, GUID


class Translation(BaseModel):
    __tablename__ = "translations"
    __table_args__ = (
        UniqueConstraint("source_type", "source_id", "target_language", name="uq_translation_source_lang"),
    )

    source_type: Mapped[str] = mapped_column(String(20), nullable=False)  # "report" | "simplification"
    source_id: Mapped[str] = mapped_column(GUID(), index=True, nullable=False)
    target_language: Mapped[str] = mapped_column(String(5), nullable=False)
    translated_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
