"""
app/schemas/medical_history.py — Pydantic schemas for Medical History & OCR/NLP APIs.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TextLineSchema(BaseModel):
    text: str
    confidence: float
    bounding_box: List[Any] = Field(default_factory=list)
    order_index: int = 0


class PageOCRResultSchema(BaseModel):
    page: int
    text: str
    confidence: float
    line_count: int
    low_confidence: bool = False
    lines: List[TextLineSchema] = Field(default_factory=list)


class StructuredMedicineSchema(BaseModel):
    name: str
    dosage: Optional[str] = ""
    frequency: Optional[str] = ""
    frequency_human: Optional[str] = ""
    duration: Optional[str] = ""
    form: Optional[str] = ""
    route: Optional[str] = ""


class MedicalEntitiesSchema(BaseModel):
    patient_name: Optional[str] = ""
    age: Optional[str] = ""
    gender: Optional[str] = ""
    doctor_name: Optional[str] = ""
    hospital_clinic: Optional[str] = ""
    dates: List[str] = Field(default_factory=list)
    disease: List[str] = Field(default_factory=list)
    diagnosis: List[str] = Field(default_factory=list)
    symptoms: List[str] = Field(default_factory=list)
    lab_tests: List[str] = Field(default_factory=list)
    medicines: List[StructuredMedicineSchema] = Field(default_factory=list)
    dosage: List[str] = Field(default_factory=list)
    frequency: List[str] = Field(default_factory=list)
    duration: List[str] = Field(default_factory=list)
    needs_manual_review: bool = False
    review_reasons: List[str] = Field(default_factory=list)


class ExtractResponse(BaseModel):
    success: bool = True
    filename: str
    file_type: str
    total_pages: int = 0
    language: str = "en"
    ocr_confidence: float = 1.0
    ocr_lines_count: int = 0
    low_confidence: bool = False
    ocr_text: str = ""
    entities: MedicalEntitiesSchema
    pages: List[PageOCRResultSchema] = Field(default_factory=list)
    timing_seconds: Dict[str, float] = Field(default_factory=dict)
    processing_time: float = 0.0
    ocr_time: float = 0.0
    nlp_time: float = 0.0
    output_saved_path: Optional[str] = None


class HistoryRecordResponse(BaseModel):
    id: str
    userId: str = "demo-user"
    filename: str
    fileType: str = "pdf"
    originalOCRText: str
    ocrConfidence: float = 1.0
    language: str = "en"
    medication: str = ""
    doctor: str = ""
    doctorName: str = ""
    patientName: str = ""
    hospital: str = ""
    medicines: List[Dict[str, Any]] = Field(default_factory=list)
    disease: List[str] = Field(default_factory=list)
    diagnosis: List[str] = Field(default_factory=list)
    symptoms: List[str] = Field(default_factory=list)
    labTests: List[str] = Field(default_factory=list)
    status: List[str] = Field(default_factory=list)
    processingStatus: str = "completed"
    processingTime: float = 0.0
    ocrTime: float = 0.0
    nlpTime: float = 0.0
    createdAt: str = ""
    updatedAt: str = ""


class APIResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Optional[Any] = None
    count: Optional[int] = None


class PrescriptionCreate(BaseModel):
    date: str = Field(..., min_length=1, description="Date is required")
    medication: str = Field(..., min_length=1, description="Medication is required")
    language: str = Field(..., min_length=1, description="Language is required")
    doctor: str = Field(..., min_length=1, description="Doctor is required")
    status: Optional[List[str]] = Field(default_factory=list, description="Status must be an array")
