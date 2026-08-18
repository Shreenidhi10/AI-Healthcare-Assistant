"""
Standalone Simplify & Translate API.

Complements the automatic OCR -> NLP -> Simplify -> Translate pipeline
(app/api/v1/ocr.py) with two directly-callable endpoints:
  POST /simplify  — simplify a stored report OR raw ad-hoc text
  POST /translate — translate a stored report's simplification OR raw text
into the user's preferred language.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.medical_report import MedicalReport
from app.models.user import User
from app.services.report_pipeline_service import get_report_pipeline_service
from app.services.simplification_service import get_simplification_service
from app.services.translation_service import SUPPORTED_LANGUAGES, get_translation_service

router = APIRouter(tags=["Simplification & Translation"])


class SimplifyRequest(BaseModel):
    report_id: str | None = Field(None, description="Simplify an existing stored medical report")
    text: str | None = Field(None, description="Or simplify raw ad-hoc text instead")

    @model_validator(mode="after")
    def _one_of(self):
        if not self.report_id and not self.text:
            raise ValueError("Provide either report_id or text.")
        return self


class SimplifyResponse(BaseModel):
    simplified_text: str


class TranslateTextRequest(BaseModel):
    report_id: str | None = Field(None, description="Translate an existing stored report's simplification")
    text: str | None = Field(None, description="Or translate raw ad-hoc text instead")
    target_language: str = Field(..., description="One of: en, ta, kn, te, hi")

    @model_validator(mode="after")
    def _one_of(self):
        if not self.report_id and not self.text:
            raise ValueError("Provide either report_id or text.")
        return self


class TranslateTextResponse(BaseModel):
    target_language: str
    translated_text: str


@router.post("/simplify", response_model=SimplifyResponse)
def simplify(
    payload: SimplifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.report_id:
        report = (
            db.query(MedicalReport)
            .filter(MedicalReport.id == payload.report_id, MedicalReport.user_id == current_user.id)
            .first()
        )
        if report is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical report not found")
        pipeline = get_report_pipeline_service(db)
        text = pipeline.get_or_create_translation(report, "en")
        return SimplifyResponse(simplified_text=text)

    service = get_simplification_service()
    text = service.simplify(payload.text or "", entities={})
    return SimplifyResponse(simplified_text=text)


@router.post("/translate", response_model=TranslateTextResponse)
def translate(
    payload: TranslateTextRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.target_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported language. Supported: {list(SUPPORTED_LANGUAGES)}",
        )

    if payload.report_id:
        report = (
            db.query(MedicalReport)
            .filter(MedicalReport.id == payload.report_id, MedicalReport.user_id == current_user.id)
            .first()
        )
        if report is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical report not found")
        pipeline = get_report_pipeline_service(db)
        translated = pipeline.get_or_create_translation(report, payload.target_language)
        return TranslateTextResponse(target_language=payload.target_language, translated_text=translated)

    service = get_translation_service()
    translated = service.translate(payload.text or "", payload.target_language)
    return TranslateTextResponse(target_language=payload.target_language, translated_text=translated)
