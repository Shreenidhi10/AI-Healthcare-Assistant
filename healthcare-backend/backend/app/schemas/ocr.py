"""
app/schemas/ocr.py

Pydantic request/response contracts.

Keeping these separate from business logic gives a single source of
truth for the API contract, which FastAPI also uses to auto-generate
the OpenAPI/Swagger docs.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.prescription_summary import PrescriptionSummaryResponse


# ---------------------------------------------------------------------------
# OCR Models
# ---------------------------------------------------------------------------

class TextLine(BaseModel):
    """Single OCR text line."""

    text: str

    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
    )

    bounding_box: List[List[float]] = Field(
        default_factory=list,
        description="Detected text bounding box.",
    )

    order_index: int


class PageOCRResult(BaseModel):
    """OCR result for a single page."""

    page: int = Field(..., ge=1)

    text: str

    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
    )

    line_count: int

    low_confidence: bool = False

    lines: List[TextLine] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# NLP Models
# ---------------------------------------------------------------------------

class Medicine(BaseModel):
    """
    Structured medicine extracted by the NLP pipeline.
    """

    name: str

    strength: Optional[str] = None

    dosage: Optional[str] = None

    frequency: Optional[str] = None

    frequency_human: Optional[str] = None

    duration: Optional[str] = None

    form: Optional[str] = None

    route: Optional[str] = None


class MedicalEntities(BaseModel):
    """
    Structured medical entities extracted from OCR text.
    """

    patient_name: Optional[str] = None

    doctor_name: Optional[str] = None

    hospital: Optional[str] = None

    age: Optional[str] = None

    gender: Optional[str] = None

    disease: List[str] = Field(default_factory=list)

    symptoms: List[str] = Field(default_factory=list)

    diagnosis: List[str] = Field(default_factory=list)

    medicines: List[Medicine] = Field(default_factory=list)

    lab_tests: List[str] = Field(default_factory=list)

    dates: List[str] = Field(default_factory=list)

    needs_review: bool = False


# ---------------------------------------------------------------------------
# OCR Pipeline Response
# ---------------------------------------------------------------------------

class ExtractResponse(BaseModel):
    """
    Response returned from the OCR + NLP pipeline.
    """

    success: bool = True

    filename: str

    file_type: str

    total_pages: int

    language: str

    ocr_text: str

    ocr_confidence: float

    pages: List[PageOCRResult] = Field(default_factory=list)

    entities: MedicalEntities

    # ------------------------------------------------------------------
    # NEW FEATURE
    # Patient-Friendly Prescription Summary
    # ------------------------------------------------------------------
    prescription_summary: Optional[PrescriptionSummaryResponse] = None

    processing_time: float

    ocr_time: float

    nlp_time: float

    stage_timings: Optional[dict] = None

    output_saved_path: Optional[str] = None


# ---------------------------------------------------------------------------
# Error Response
# ---------------------------------------------------------------------------

class ErrorResponse(BaseModel):
    success: bool = False

    error: str

    detail: Optional[str] = None


# ---------------------------------------------------------------------------
# Health Check Response
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str

    ocr_engine_loaded: bool

    nlp_engine_loaded: bool

    version: str

    gpu_available: bool