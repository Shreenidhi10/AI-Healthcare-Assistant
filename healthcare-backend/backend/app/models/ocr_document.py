"""
OCRDocument — one row per uploaded file, associated with the
authenticated user who uploaded it. Kept separate from MedicalReport
(which stores the *result* of processing that file) so a document's
identity and storage details survive independently of reprocessing.
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel, GUID


class OCRDocument(BaseModel):
    __tablename__ = "ocr_documents"

    user_id: Mapped[str] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(10), nullable=False)  # "image" | "pdf"
    content_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    storage_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    user = relationship("User", backref="ocr_documents")
