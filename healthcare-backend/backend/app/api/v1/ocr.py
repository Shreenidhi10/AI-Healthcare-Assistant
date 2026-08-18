"""
OCR / Medical Report API (Phase 5-6).

Every upload is run through the full pipeline (OCR -> NLP ->
Simplification -> Translation -> DB storage) and associated with the
authenticated user via ReportPipelineService.
"""
from __future__ import annotations

import traceback
import uuid
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.medical_report import MedicalReport
from app.models.simplification import Simplification
from app.models.translation import Translation
from app.models.user import User
from app.schemas.reports import (
    MedicalReportListItem,
    MedicalReportResponse,
    SimplifiedReportResponse,
    TranslateRequest,
    TranslateResponse,
)
from app.services.report_pipeline_service import get_report_pipeline_service
from app.services.translation_service import SUPPORTED_LANGUAGES

router = APIRouter(prefix="/ocr", tags=["OCR & Medical Reports"])


def _get_owned_report(
    db: Session,
    user: User,
    report_id: uuid.UUID,
) -> MedicalReport:
    report = (
        db.query(MedicalReport)
        .filter(
            MedicalReport.id == str(report_id),
            MedicalReport.user_id == user.id,
        )
        .first()
    )

    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medical report not found",
        )

    return report


# ----------------------------------------------------------------------
# Upload + OCR Pipeline
# ----------------------------------------------------------------------
@router.post(
    "/extract",
    response_model=MedicalReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a prescription/report/label; runs OCR -> NLP -> Simplify -> Translate -> DB",
)
async def extract(
    file: UploadFile = File(..., description="JPG, JPEG, PNG, or PDF"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        pipeline = get_report_pipeline_service(db)

        report = await pipeline.process_upload(
            file=file,
            user_id=str(current_user.id),
            preferred_language=current_user.preferred_language,
        )

        return report

    except Exception as e:
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("", response_model=List[MedicalReportListItem])
@router.get("/", response_model=List[MedicalReportListItem], include_in_schema=False)
def list_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reports = (
        db.query(MedicalReport)
        .filter(MedicalReport.user_id == current_user.id)
        .order_by(MedicalReport.created_at.desc())
        .all()
    )

    return [
        MedicalReportListItem(
            id=r.id,
            filename=r.document.filename if r.document else None,
            primary_medication=r.primary_medication,
            doctor_name=r.doctor_name,
            hospital=r.hospital,
            status=r.status,
            needs_review=r.needs_review,
            ocr_confidence=r.ocr_confidence,
            created_at=r.created_at,
        )
        for r in reports
    ]


@router.get("/{report_id}", response_model=MedicalReportResponse)
def get_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = _get_owned_report(db, current_user, report_id)
    data = MedicalReportResponse.model_validate(report).model_dump()
    data["filename"] = report.document.filename if report.document else None
    return data


@router.delete("/{report_id}")
def delete_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = _get_owned_report(db, current_user, report_id)

    simplification = report.simplification

    if simplification is not None:
        db.query(Translation).filter(
            Translation.source_type == "simplification",
            Translation.source_id == simplification.id,
        ).delete(synchronize_session=False)

        db.delete(simplification)

    db.query(Translation).filter(
        Translation.source_type == "report",
        Translation.source_id == report.id,
    ).delete(synchronize_session=False)

    document = report.document

    db.delete(report)

    if document is not None:
        db.delete(document)

    db.commit()

    return {
        "success": True,
        "message": "Medical report deleted successfully.",
    }


@router.get("/{report_id}/simplified", response_model=SimplifiedReportResponse)
def get_simplified_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = _get_owned_report(db, current_user, report_id)

    pipeline = get_report_pipeline_service(db)

    text = pipeline.get_or_create_translation(report, "en")

    return SimplifiedReportResponse(
        report_id=report.id,
        language="en",
        simplified_text=text,
    )


@router.post("/{report_id}/translate", response_model=TranslateResponse)
def translate_report(
    report_id: uuid.UUID,
    payload: TranslateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.target_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported language. Supported: {list(SUPPORTED_LANGUAGES)}",
        )

    report = _get_owned_report(db, current_user, report_id)

    pipeline = get_report_pipeline_service(db)

    translated = pipeline.get_or_create_translation(
        report,
        payload.target_language,
    )

    return TranslateResponse(
        report_id=report.id,
        target_language=payload.target_language,
        translated_text=translated,
    )