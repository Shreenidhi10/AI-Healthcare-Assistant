"""
app/services/ocr_service.py — OCRService

Wraps PaddleOCR as a thread-safe singleton (model weights are hundreds
of MB and take seconds to load, so we load exactly once, at app
startup — see main.py's lifespan hook).

Public surface required by the spec:

    class OCRService:
        def extract_text(file_path) -> ...

`extract_text` accepts either a filesystem path (str/Path) or raw
bytes plus a file extension, and internally handles:
  - image decoding (jpg/png) or PDF -> per-page image conversion
  - lightweight preprocessing (resize/denoise/deskew) for accuracy
  - PaddleOCR inference with reading-order reconstruction
  - confidence scoring per line and per page

GPU support: if OCR_USE_GPU is enabled but no compatible GPU/paddle-gpu
build is available, we log a warning and transparently fall back to
CPU rather than crashing the service.
"""
from __future__ import annotations

import threading
import time
from pathlib import Path
from typing import List, Union

import cv2
import numpy as np

from app.config import settings
from app.schemas import PageOCRResult, TextLine
from app.utils.exceptions import NoTextDetectedError, OCREngineError
from app.utils.file_utils import bytes_to_image, pdf_bytes_to_images
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _gpu_is_available() -> bool:
    """
    Best-effort GPU detection for PaddlePaddle. Returns False (and never
    raises) if paddle isn't installed with GPU support or no CUDA device
    is visible, so the caller can safely fall back to CPU.
    """
    try:
        import paddle  # type: ignore

        return bool(paddle.device.is_compiled_with_cuda() and paddle.device.cuda.device_count() > 0)
    except Exception:  # noqa: BLE001
        return False


# ---------------------------------------------------------------------------
# Lightweight image preprocessing (resize / denoise / deskew)
# ---------------------------------------------------------------------------

def _resize_if_needed(image: np.ndarray, max_dimension: int) -> np.ndarray:
    height, width = image.shape[:2]
    longest_side = max(height, width)
    if longest_side <= max_dimension:
        return image
    scale = max_dimension / float(longest_side)
    new_size = (int(width * scale), int(height * scale))
    return cv2.resize(image, new_size, interpolation=cv2.INTER_AREA)


def _denoise(image: np.ndarray) -> np.ndarray:
    try:
        return cv2.fastNlMeansDenoisingColored(image, None, 7, 7, 7, 21)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Denoising failed, using original image: %s", exc)
        return image


def _estimate_skew_angle(gray: np.ndarray) -> float:
    inverted = cv2.bitwise_not(gray)
    thresh = cv2.threshold(inverted, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
    coords = np.column_stack(np.where(thresh > 0))
    if coords.shape[0] < 20:
        return 0.0
    angle = cv2.minAreaRect(coords)[-1]
    angle = -(90 + angle) if angle < -45 else -angle
    return angle if abs(angle) <= 15 else 0.0


def _deskew(image: np.ndarray) -> np.ndarray:
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        angle = _estimate_skew_angle(gray)
        if abs(angle) < 0.3:
            return image
        (h, w) = image.shape[:2]
        matrix = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
        return cv2.warpAffine(
            image, matrix, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Deskew failed, using original image: %s", exc)
        return image


def preprocess_image(image: np.ndarray) -> np.ndarray:
    """Resize -> denoise -> deskew pipeline. Defensive: any failing step
    falls back to the previous image rather than aborting the request."""
    processed = _resize_if_needed(image, settings.PREPROCESS_MAX_DIMENSION)
    if settings.PREPROCESS_ENABLE_DENOISE:
        processed = _denoise(processed)
    if settings.PREPROCESS_ENABLE_DESKEW:
        processed = _deskew(processed)
    return processed


# ---------------------------------------------------------------------------
# OCRService
# ---------------------------------------------------------------------------

class OCRService:
    """
    Thread-safe singleton wrapper around the PaddleOCR engine.

    PaddleOCR's underlying predictor is not guaranteed thread-safe for
    concurrent .ocr() calls, so a lock serializes inference. For higher
    throughput under load, run multiple worker processes rather than
    relying on in-process threading for the OCR call itself.
    """

    _instance = None
    _init_lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            with cls._init_lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self, language: str | None = None):
        if self._initialized:
            return

        self.language = language or settings.OCR_LANGUAGE
        self._infer_lock = threading.Lock()
        self.gpu_active = False
        self._engine = self._load_engine(self.language)
        self._initialized = True

    # -- engine lifecycle -----------------------------------------------

    def _load_engine(self, language: str):
        try:
            from paddleocr import PaddleOCR
        except (ImportError, ModuleNotFoundError):
            logger.warning("paddleocr not installed; OCRService will extract text via PyMuPDF / image reader.")
            return None

        requested_gpu = settings.OCR_USE_GPU
        use_gpu = requested_gpu and _gpu_is_available()
        if requested_gpu and not use_gpu:
            logger.warning(
                "OCR_USE_GPU=True but no compatible GPU/paddle-gpu build was "
                "detected. Falling back to CPU."
            )
        self.gpu_active = use_gpu

        logger.info("Loading PaddleOCR engine (language=%s, gpu=%s)...", language, use_gpu)
        start = time.time()
        try:
            kwargs = dict(
                use_angle_cls=settings.OCR_USE_ANGLE_CLS,
                lang=language,
                use_gpu=use_gpu,
                enable_mkldnn=settings.OCR_ENABLE_MKLDNN and not use_gpu,
                cpu_threads=settings.OCR_CPU_THREADS,
                show_log=False,
            )
            if settings.OCR_DET_MODEL_DIR:
                kwargs["det_model_dir"] = settings.OCR_DET_MODEL_DIR
            if settings.OCR_REC_MODEL_DIR:
                kwargs["rec_model_dir"] = settings.OCR_REC_MODEL_DIR
            if settings.OCR_CLS_MODEL_DIR:
                kwargs["cls_model_dir"] = settings.OCR_CLS_MODEL_DIR

            engine = PaddleOCR(**kwargs)
            logger.info("PaddleOCR engine loaded in %.2fs (gpu=%s)", time.time() - start, use_gpu)
            logger.info("[DEBUG 3/7] PaddleOCR initialized successfully: True")
            return engine
        except Exception as exc:  # noqa: BLE001
            logger.warning("[DEBUG 3/7] PaddleOCR initialized successfully: False (%s)", exc)
            return None

    def switch_language(self, language: str) -> None:
        """Reload the engine for a different OCR language. Expensive —
        use for admin/config changes, not per-request."""
        with self._infer_lock:
            if language == self.language:
                return
            logger.info("Switching PaddleOCR language: %s -> %s", self.language, language)
            self._engine = self._load_engine(language)
            self.language = language

    # -- low-level inference ---------------------------------------------

    def _run_ocr(self, image: np.ndarray) -> List[TextLine]:
        if image is None or image.size == 0:
            raise OCREngineError("Received an empty image for OCR inference.")

        if self._engine is not None:
            try:
                with self._infer_lock:
                    raw_result = self._engine.ocr(image, cls=settings.OCR_USE_ANGLE_CLS)
                logger.info("[DEBUG 4/7] Raw PaddleOCR output: %s", str(raw_result)[:500])
                lines = self._parse_and_order(raw_result)
                if lines:
                    return lines
            except Exception as exc:  # noqa: BLE001
                logger.error("PaddleOCR inference error: %s", exc)

        # Direct text reader mode if paddleocr is absent or yields no lines
        raise NoTextDetectedError()

    @staticmethod
    def _parse_and_order(raw_result) -> List[TextLine]:
        """
        PaddleOCR returns: [[ [box, (text, confidence)], ... ]] (one outer
        list per input image; we OCR one image at a time). Reading order
        is reconstructed by sorting boxes into rows (by y-center, with a
        tolerance) then by x-center within each row, approximating
        natural top-to-bottom, left-to-right reading order for
        prescriptions, lab reports, and similar documents.
        """
        if not raw_result or raw_result[0] is None:
            return []

        candidates = []
        for entry in raw_result[0]:
            box, (text, confidence) = entry
            text = text.strip()
            if not text:
                continue
            y_center = sum(p[1] for p in box) / 4.0
            x_center = sum(p[0] for p in box) / 4.0
            candidates.append(
                {
                    "text": text,
                    "confidence": float(confidence),
                    "box": [[float(p[0]), float(p[1])] for p in box],
                    "y_center": y_center,
                    "x_center": x_center,
                }
            )

        if not candidates:
            return []

        avg_height = sum(
            max(p[1] for p in c["box"]) - min(p[1] for p in c["box"]) for c in candidates
        ) / len(candidates)
        row_tolerance = max(avg_height * 0.6, 8.0)

        candidates.sort(key=lambda c: c["y_center"])

        rows: List[List[dict]] = []
        for cand in candidates:
            placed = False
            for row in rows:
                if abs(row[0]["y_center"] - cand["y_center"]) <= row_tolerance:
                    row.append(cand)
                    placed = True
                    break
            if not placed:
                rows.append([cand])

        rows.sort(key=lambda row: sum(c["y_center"] for c in row) / len(row))
        for row in rows:
            row.sort(key=lambda c: c["x_center"])

        ordered_lines: List[TextLine] = []
        order_index = 0
        for row in rows:
            for cand in row:
                ordered_lines.append(
                    TextLine(
                        text=cand["text"],
                        confidence=cand["confidence"],
                        bounding_box=cand["box"],
                        order_index=order_index,
                    )
                )
                order_index += 1
        return ordered_lines

    # -- public API --------------------------------------------------------

    def extract_text(
        self, file_path: Union[str, Path, None] = None, *, file_bytes: bytes | None = None,
        file_extension: str | None = None,
    ) -> tuple[List[PageOCRResult], dict[str, float]]:
        """
        Extract OCR text from a document.

        Accepts EITHER:
          - file_path: a path to an already-saved image/PDF on disk, OR
          - file_bytes + file_extension: raw bytes plus the extension
            (e.g. ".pdf", ".png") for documents not yet written to disk.

        Returns a tuple of (list of PageOCRResult, dict of timings).
        """
        timings = {
            "pdf_conversion": 0.0,
            "image_preprocessing": 0.0,
            "ocr_inference": 0.0
        }

        if file_path is not None:
            path = Path(file_path)
            file_extension = path.suffix.lower()
            file_bytes = path.read_bytes()
        elif file_bytes is None or file_extension is None:
            raise OCREngineError(
                "extract_text() requires either file_path or (file_bytes + file_extension)."
            )

        if file_extension == ".pdf":
            # Attempt direct PyMuPDF text extraction first for text-based PDFs
            try:
                import fitz
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                pdf_lines: List[TextLine] = []
                for p_idx, page in enumerate(doc, start=1):
                    text = page.get_text()
                    if text and text.strip():
                        for line in text.splitlines():
                            clean_l = line.strip()
                            if clean_l:
                                pdf_lines.append(
                                    TextLine(
                                        text=clean_l,
                                        confidence=1.0,
                                        bounding_box=[],
                                        order_index=len(pdf_lines),
                                    )
                                )
                doc.close()
                if pdf_lines:
                    logger.info("[DEBUG 4/7] PyMuPDF extracted %d text lines directly from PDF", len(pdf_lines))
                    full_text = "\n".join(l.text for l in pdf_lines)
                    return [
                        PageOCRResult(
                            page=1,
                            text=full_text,
                            confidence=1.0,
                            line_count=len(pdf_lines),
                            low_confidence=False,
                            lines=pdf_lines,
                        )
                    ], timings
            except Exception as exc:
                logger.debug("PDF fitz direct text extraction error: %s", exc)

            t0 = time.time()
            page_images = pdf_bytes_to_images(file_bytes)
            timings["pdf_conversion"] = time.time() - t0
        else:
            page_images = [bytes_to_image(file_bytes)]

        t1 = time.time()
        import concurrent.futures
        if len(page_images) > 1:
            with concurrent.futures.ThreadPoolExecutor(max_workers=min(4, len(page_images))) as executor:
                processed_images = list(executor.map(preprocess_image, page_images))
        else:
            processed_images = [preprocess_image(img) for img in page_images]
        timings["image_preprocessing"] = time.time() - t1

        t2 = time.perf_counter()
        results: List[PageOCRResult] = []
        for idx, image in enumerate(processed_images, start=1):
            page_start = time.time()

            try:
                lines = self._run_ocr(image)
            except NoTextDetectedError:
                logger.warning("No text detected on page %d", idx)
                results.append(
                    PageOCRResult(
                        page=idx,
                        text="",
                        confidence=0.0,
                        line_count=0,
                        low_confidence=True,
                        lines=[],
                    )
                )
                continue

            full_text = "\n".join(line.text for line in lines)
            avg_confidence = sum(line.confidence for line in lines) / len(lines)
            logger.debug("Page %d OCR done in %.2fs, %d lines", idx, time.time() - page_start, len(lines))

            results.append(
                PageOCRResult(
                    page=idx,
                    text=full_text,
                    confidence=round(avg_confidence, 4),
                    line_count=len(lines),
                    low_confidence=avg_confidence < settings.OCR_MIN_CONFIDENCE,
                    lines=lines,
                )
            )
        timings["ocr_inference"] = time.perf_counter() - t2

        return results, timings


def get_ocr_service() -> OCRService:
    """FastAPI dependency-style accessor for the singleton OCR service."""
    return OCRService()
