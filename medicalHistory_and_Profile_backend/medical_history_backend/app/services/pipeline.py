"""
app/services/pipeline.py — PipelineService

Orchestrates the full request lifecycle:

    upload -> validate -> OCR (PaddleOCR) -> merge/clean text
           -> NLP (BioClinicalBERT) -> structured JSON response

Kept deliberately thin: all real logic lives in OCRService, NLPService,
and the utils modules. This class's only job is sequencing, timing,
confidence-based decisions (e.g. what counts as "clean" text), and
persisting the final JSON output for auditability.
"""
from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Optional

from fastapi import UploadFile

from app.config import settings
from app.schemas import ExtractResponse, MedicalEntities
from app.services.nlp_service import NLPService
from app.services.ocr_service import OCRService
from app.utils.file_utils import validate_upload
from app.utils.logger import get_logger
from app.utils.text_cleaner import clean_ocr_text, filter_low_confidence_lines, merge_ocr_lines

logger = get_logger(__name__)


class PipelineService:
    """Coordinates OCR and NLP to fulfil a single /extract request."""

    def __init__(self, ocr_service: OCRService, nlp_service: NLPService):
        self.ocr_service = ocr_service
        self.nlp_service = nlp_service

    async def process(self, file: UploadFile) -> ExtractResponse:
        """
        Full pipeline for an UploadFile as received by FastAPI:
        validate -> OCR -> clean -> NLP -> assemble response -> persist.
        """
        return await self.run(file)

    async def run(self, file: UploadFile) -> ExtractResponse:
        """Alias for process()."""
        overall_start = time.time()

        file_bytes = await validate_upload(file)
        file_extension = Path(file.filename).suffix.lower()
        file_type = "pdf" if file_extension == ".pdf" else "image"

        # ---- Step 1-4: OCR + merge -------------------------------------
        t_upload_validate = time.time() - overall_start

        ocr_start = time.perf_counter()
        page_results, ocr_timings = self.ocr_service.extract_text(
            file_bytes=file_bytes, file_extension=file_extension
        )
        ocr_time = time.perf_counter() - ocr_start

        overall_confidence = self._average_confidence(page_results)

        # Confidence filtering: build the "clean" merged text only from
        # lines that meet the minimum OCR confidence, while still
        # reporting every detected line (low-confidence included) in the
        # `pages` field for transparency/debugging.
        t_merge_start = time.time()
        all_line_dicts = [
            {"text": line.text, "confidence": line.confidence}
            for page in page_results
            for line in page.lines
        ]
        confident_lines = filter_low_confidence_lines(all_line_dicts, settings.OCR_MIN_CONFIDENCE)
        merged_raw_text = merge_ocr_lines(line["text"] for line in confident_lines)

        # ---- Step 5: Clean text -----------------------------------------
        cleaned_text = clean_ocr_text(merged_raw_text)
        t_merge = time.time() - t_merge_start
        logger.info("[DEBUG 5/7] Cleaned OCR text: '%s'", cleaned_text)

        # ---- Step 6: NLP entity extraction -------------------------------
        nlp_start = time.time()
        entities_dict = self.nlp_service.extract_entities(
            cleaned_text, ocr_confidence=overall_confidence
        )
        nlp_time = time.time() - nlp_start

        total_time = time.time() - overall_start
        
        timing_seconds = {
            "upload_validation": round(t_upload_validate, 3),
            "pdf_conversion": round(ocr_timings.get("pdf_conversion", 0.0), 3),
            "image_preprocessing": round(ocr_timings.get("image_preprocessing", 0.0), 3),
            "ocr": ocr_time,
            "text_merging": round(t_merge, 3),
            "nlp": round(nlp_time, 3),
            "total": round(total_time, 3)
        }

        response = ExtractResponse(
            success=True,
            filename=file.filename,
            file_type=file_type,
            total_pages=len(page_results),
            language=self.ocr_service.language,
            ocr_text=cleaned_text,
            ocr_confidence=overall_confidence,
            pages=page_results,
            entities=MedicalEntities(**entities_dict),
            timing_seconds=timing_seconds,
            processing_time=round(total_time, 3),
            ocr_time=ocr_time,
            nlp_time=round(nlp_time, 3),
        )

        output_path = self._persist_output(response)
        response.output_saved_path = str(output_path) if output_path else None

        logger.info(
            "Pipeline complete: filename=%s pages=%d ocr_time=%.2fs nlp_time=%.2fs total=%.2fs",
            file.filename, len(page_results), ocr_time, nlp_time, total_time,
        )
        return response

    # -- helpers ----------------------------------------------------------

    @staticmethod
    def _average_confidence(page_results) -> float:
        confidences = [p.confidence for p in page_results if p.line_count > 0]
        if not confidences:
            return 0.0
        return round(sum(confidences) / len(confidences), 4)

    @staticmethod
    def _persist_output(response: ExtractResponse) -> Optional[Path]:
        """Persist the structured response as JSON under OUTPUT_DIR so
        results are auditable and can be reprocessed without re-running
        OCR/NLP."""
        try:
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            safe_name = Path(response.filename).stem.replace(" ", "_")
            output_file = settings.OUTPUT_DIR / f"{safe_name}_{timestamp}.json"
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(response.model_dump(), f, ensure_ascii=False, indent=2)
            logger.info("Pipeline output saved to %s", output_file)
            return output_file
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to persist pipeline output JSON: %s", exc)
            return None


def get_pipeline_service(
    ocr_service: OCRService, nlp_service: NLPService
) -> PipelineService:
    return PipelineService(ocr_service=ocr_service, nlp_service=nlp_service)


_pipeline_instance: Optional[PipelineService] = None


def get_pipeline() -> PipelineService:
    global _pipeline_instance
    if _pipeline_instance is None:
        from app.services.nlp_service import get_nlp_service
        from app.services.ocr_service import get_ocr_service

        _pipeline_instance = PipelineService(
            ocr_service=get_ocr_service(),
            nlp_service=get_nlp_service(),
        )
    return _pipeline_instance
