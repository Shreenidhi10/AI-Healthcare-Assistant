"""Pydantic schemas for the OCR / Medical Report API (Phase 5-6)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from app.schemas.prescription_summary import PrescriptionSummaryResponse


class MedicalReportResponse(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    filename: Optional[str] = None
    ocr_text: str
    ocr_confidence: float
    language: str
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    hospital: Optional[str] = None
    primary_medication: Optional[str] = None
    entities: Dict[str, Any]
    prescription_summary: Optional[PrescriptionSummaryResponse] = None
    status: List[str]
    needs_review: bool
    processing_time: float
    ocr_time: float
    nlp_time: float
    created_at: datetime

    model_config = {"from_attributes": True}


class MedicalReportListItem(BaseModel):
    id: uuid.UUID
    filename: Optional[str] = None
    primary_medication: Optional[str] = None
    doctor_name: Optional[str] = None
    hospital: Optional[str] = None
    status: List[str]
    needs_review: bool
    ocr_confidence: float
    created_at: datetime

    model_config = {"from_attributes": True}


class SimplifiedReportResponse(BaseModel):
    report_id: uuid.UUID
    language: str
    simplified_text: str


class TranslateRequest(BaseModel):
    target_language: str


class TranslateResponse(BaseModel):
    report_id: uuid.UUID
    target_language: str
    translated_text: str


class APIResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Optional[Any] = None
    count: Optional[int] = None
