"""
app/services/report_pipeline_service.py — end-to-end AI medical
processing pipeline (Phase 6):

    OCR -> NLP -> Entity Extraction -> Simplification -> Translation
        -> Database Storage -> API Response

This is the module the OCR router (app/api/v1/ocr.py) calls. It wraps
the lower-level PipelineService (pure OCR+NLP, no DB, no user) with
everything the rest of the app needs: persisting an OCRDocument +
MedicalReport row associated with the authenticated user, generating
and storing the patient-friendly Simplification, eagerly translating
the simplified summary into the user's preferred_language, and writing
an ActivityLog entry — all in one DB transaction per upload.
"""
from __future__ import annotations

import time
from pathlib import Path
from typing import Optional

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.medical_report import MedicalReport
from app.models.ocr_document import OCRDocument
from app.models.simplification import Simplification
from app.models.translation import Translation
from app.services.activity_service import log_activity
from app.services.nlp_service import get_nlp_service
from app.services.ocr_service import get_ocr_service
from app.services.pipeline import PipelineService
from app.services.simplification_service import get_simplification_service
from app.services.translation_service import get_translation_service

logger = get_logger(__name__)


class ReportPipelineService:
    def __init__(self, db: Session):
        self.db = db
        self.ocr_service = get_ocr_service()
        self.nlp_service = get_nlp_service()
        self.pipeline = PipelineService(ocr_service=self.ocr_service, nlp_service=self.nlp_service)
        self.simplification_service = get_simplification_service()
        self.translation_service = get_translation_service()

    async def process_upload(
        self, file: UploadFile, user_id: str, preferred_language: str = "en"
    ) -> MedicalReport:
        """Run the full pipeline for one upload and persist every stage."""
        start = time.time()

        # ---- Stage 1-2: OCR + NLP (pure, no DB) ----------------------
        extract_result = await self.pipeline.process(file)
        entities_dict = extract_result.entities.model_dump()

        # Patient-Friendly Prescription Summary
        prescription_summary = (
            extract_result.prescription_summary.model_dump()
            if extract_result.prescription_summary
        else None
      )

        # ---- Persist the source document -------------------------------
        document = OCRDocument(
            user_id=user_id,
            filename=extract_result.filename,
            file_type=extract_result.file_type,
            content_type=file.content_type,
            size_bytes=None,
            storage_path=extract_result.output_saved_path,
        )
        self.db.add(document)
        self.db.flush()  # assign document.id without committing yet

        medicines_for_protection = [m.get("name") for m in entities_dict.get("medicines", []) if m.get("name")]
        needs_review = bool(entities_dict.get("needs_review")) or extract_result.ocr_confidence < settings.REVIEW_CONFIDENCE_THRESHOLD

        status_tags = ["Processed"]
        status_tags.append("Needs Review" if needs_review else "Verified")

        report = MedicalReport(
            user_id=user_id,
            document_id=document.id,
            ocr_text=extract_result.ocr_text,
            ocr_confidence=extract_result.ocr_confidence,
            language=extract_result.language,
            patient_name=entities_dict.get("patient_name"),
            doctor_name=entities_dict.get("doctor_name"),
            hospital=entities_dict.get("hospital"),
            primary_medication=self._primary_medication(entities_dict, file.filename),

            entities=entities_dict,

            # NEW FEATURE
            prescription_summary=prescription_summary,

            status=status_tags,
            needs_review=needs_review,
            processing_time=extract_result.processing_time,
            ocr_time=extract_result.ocr_time,
            nlp_time=extract_result.nlp_time,
 )
        self.db.add(report)
        self.db.flush()

        # ---- Stage 3: Simplification ------------------------------------
        simplified_text = self.simplification_service.simplify(extract_result.ocr_text, entities_dict)
        simplification = Simplification(report_id=report.id, simplified_text=simplified_text)
        self.db.add(simplification)
        self.db.flush()

        # ---- Stage 4: Translation (eagerly translate to the user's
        # preferred language if it isn't English; other languages are
        # translated on-demand via GET /ocr/{id}/translations/{lang}) --
        if preferred_language and preferred_language != "en":
            translated = self.translation_service.translate(
                simplified_text, preferred_language, protect_terms=medicines_for_protection
            )
            self.db.add(
                Translation(
                    source_type="simplification",
                    source_id=simplification.id,
                    target_language=preferred_language,
                    translated_text=translated,
                )
            )

        # ---- Activity log -------------------------------------------------
        log_activity(
            self.db,
            user_id=user_id,
            action="ocr_upload",
            description=f"Processed '{extract_result.filename}' ({len(entities_dict.get('medicines', []))} medicine(s) found).",
            reference_id=report.id,
            commit=False,
        )

        self.db.commit()
        self.db.refresh(report)

        logger.info(
            "Report pipeline complete: user=%s report=%s total=%.2fs",
            user_id, report.id, time.time() - start,
        )
        return report

    @staticmethod
    def _primary_medication(entities: dict, filename: str) -> Optional[str]:
        medicines = entities.get("medicines") or []
        if medicines:
            return medicines[0].get("name")
        if entities.get("diagnosis"):
            return entities["diagnosis"][0]
        if entities.get("disease"):
            return entities["disease"][0]
        return Path(filename).stem.replace("_", " ").title() if filename else None

    def get_or_create_translation(self, report: MedicalReport, target_lang: str) -> str:
        """Translate (and cache) the report's simplified text into target_lang on demand."""
        simplification = report.simplification
        if simplification is None:
            simplified_text = self.simplification_service.simplify(report.ocr_text, report.entities)
            simplification = Simplification(report_id=report.id, simplified_text=simplified_text)
            self.db.add(simplification)
            self.db.flush()

        if target_lang == "en":
            return simplification.simplified_text

        existing = (
            self.db.query(Translation)
            .filter(
                Translation.source_type == "simplification",
                Translation.source_id == simplification.id,
                Translation.target_language == target_lang,
            )
            .first()
        )
        if existing:
            return existing.translated_text

        medicines_for_protection = [m.get("name") for m in (report.entities or {}).get("medicines", []) if m.get("name")]
        translated = self.translation_service.translate(
            simplification.simplified_text, target_lang, protect_terms=medicines_for_protection
        )
        self.db.add(
            Translation(
                source_type="simplification",
                source_id=simplification.id,
                target_language=target_lang,
                translated_text=translated,
            )
        )
        self.db.commit()
        return translated


def get_report_pipeline_service(db: Session) -> ReportPipelineService:
    return ReportPipelineService(db)
