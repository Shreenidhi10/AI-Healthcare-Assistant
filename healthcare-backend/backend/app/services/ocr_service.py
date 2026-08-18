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
  - image decoding (jpg/png) sent straight to preprocessing + OCR
  - PDFs: a selectable-text check first (native PyMuPDF text layer is
    used directly, skipping OCR entirely when available); otherwise
    per-page rasterization to 300 DPI PNGs, cached on disk so the same
    PDF is never re-rendered mid-request
  - preprocessing (resize/denoise/deskew/grayscale/threshold) for
    accuracy
  - PaddleOCR inference with reading-order reconstruction, with pages
    preprocessed and OCR'd concurrently via a thread pool
  - confidence scoring per line and per page
  - per-stage timing (load, conversion, preprocessing, OCR) reported
    back to the caller for observability

GPU support: if OCR_USE_GPU is enabled but no compatible GPU/paddle-gpu
build is available, we log a warning and transparently fall back to
CPU rather than crashing the service.
"""
from __future__ import annotations

import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Dict, List, Optional, Union

import cv2
import numpy as np

from app.core.config import settings
from app.schemas.ocr import PageOCRResult, TextLine
from app.utils.exceptions import NoTextDetectedError, OCREngineError
from app.utils.file_utils import (
    bytes_to_image,
    cleanup_pdf_page_cache,
    extract_pdf_native_text,
    load_png_as_bgr,
    pdf_cache_dir_for,
    render_pdf_pages_to_png,
)
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class _StubOCREngine:
    """Drop-in stand-in for a PaddleOCR engine instance.

    Only used when `paddleocr` isn't installed (see OCRService._load_engine).
    Implements the same `.ocr(image, cls=...)` call signature and return
    shape PaddleOCR uses (`[[ [box, (text, confidence)], ... ]]`) so every
    downstream line, ordering, and merging in this file exercises real
    code paths. It does not perform real text recognition — it reports a
    single low-confidence placeholder line covering the full image so
    callers can see at a glance (confidence + text) that this was a stub
    run, and the pipeline's "needs_review" flag will correctly trip.
    """

    def ocr(self, image: "np.ndarray", cls: bool = True):
        height, width = image.shape[:2]
        box = [[0.0, 0.0], [float(width), 0.0], [float(width), float(height)], [0.0, float(height)]]
        placeholder = (
            "[OCR_STUB_ENGINE_ACTIVE: paddleocr is not installed in this "
            "environment; no real text was extracted from this document. "
            "Install paddlepaddle + paddleocr for production use.]"
        )
        return [[[box, (placeholder, 0.01)]]]


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


def _grayscale(image: np.ndarray) -> np.ndarray:
    """Convert to grayscale, then back to 3-channel BGR so downstream
    consumers (PaddleOCR's detector/classifier) get a consistent shape
    whether or not grayscale/threshold are enabled."""
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        return cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Grayscale conversion failed, using original image: %s", exc)
        return image


def _adaptive_threshold(image: np.ndarray) -> np.ndarray:
    """Binarize via adaptive thresholding. Off by default (see
    settings.PREPROCESS_ENABLE_THRESHOLD) because it can reduce
    PaddleOCR accuracy on low-contrast or shaded medical documents."""
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 11
        )
        return cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Adaptive thresholding failed, using original image: %s", exc)
        return image


def preprocess_image(image: np.ndarray) -> np.ndarray:
    """Resize -> denoise -> deskew -> grayscale -> threshold pipeline.
    Defensive: any failing step falls back to the previous image
    rather than aborting the request. Denoise/deskew run on the color
    image (denoise needs 3 channels; deskew's angle estimate is more
    stable before binarization), grayscale/threshold run last since
    they're what actually gets handed to the OCR engine."""
    processed = _resize_if_needed(image, settings.PREPROCESS_MAX_DIMENSION)
    if settings.PREPROCESS_ENABLE_DENOISE:
        processed = _denoise(processed)
    if settings.PREPROCESS_ENABLE_DESKEW:
        processed = _deskew(processed)
    if settings.PREPROCESS_ENABLE_THRESHOLD:
        # Thresholding already implies/needs a grayscale pass.
        processed = _adaptive_threshold(processed)
    elif settings.PREPROCESS_ENABLE_GRAYSCALE:
        processed = _grayscale(processed)
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
        self._stub_mode = False
        self._engine = self._load_engine(self.language)
        self._initialized = True

    # -- engine lifecycle -----------------------------------------------

    def _load_engine(self, language: str):
        try:
            from paddleocr import PaddleOCR  # imported lazily so app startup
            # doesn't hard-fail before logging is configured.
        except ImportError as exc:
            if not settings.OCR_ALLOW_STUB_ENGINE:
                raise OCREngineError(
                    "paddleocr is not installed and OCR_ALLOW_STUB_ENGINE=False."
                ) from exc
            logger.warning(
                "paddleocr is not installed (%s). Falling back to a stub OCR "
                "engine so the rest of the pipeline (upload validation, DB "
                "persistence, NLP, simplification, translation) stays "
                "testable. Install paddlepaddle + paddleocr and set "
                "OCR_ALLOW_STUB_ENGINE=False for real text extraction.",
                exc,
            )
            self.gpu_active = False
            self._stub_mode = True
            return _StubOCREngine()

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
            return engine
        except Exception as exc:  # noqa: BLE001
            if settings.OCR_ALLOW_STUB_ENGINE:
                logger.warning(
                    "Failed to initialize PaddleOCR engine (%s). Falling back to stub OCR engine because OCR_ALLOW_STUB_ENGINE=True.",
                    exc,
                    exc_info=True,
                )
                self.gpu_active = False
                self._stub_mode = True
                return _StubOCREngine()
            logger.error("Failed to initialize PaddleOCR engine: %s", exc, exc_info=True)
            raise OCREngineError(f"Failed to initialize PaddleOCR engine: {exc}") from exc

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

        try:
            with self._infer_lock:
                raw_result = self._engine.ocr(image, cls=settings.OCR_USE_ANGLE_CLS)
        except Exception as exc:  # noqa: BLE001
            logger.error("PaddleOCR inference failed: %s", exc, exc_info=True)
            raise OCREngineError(f"OCR inference failed: {exc}") from exc

        lines = self._parse_and_order(raw_result)
        if not lines:
            raise NoTextDetectedError()
        return lines

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

    # -- per-page worker (runs inside the thread pool) --------------------

    def _process_page_image(self, idx: int, raw_image: np.ndarray) -> PageOCRResult:
        """Preprocess + OCR a single page image. Safe to call from
        multiple threads concurrently — the cv2 preprocessing steps
        release the GIL, and the OCR call itself is serialized via
        self._infer_lock."""
        image = preprocess_image(raw_image)

        try:
            lines = self._run_ocr(image)
        except NoTextDetectedError:
            logger.warning("No text detected on page %d", idx)
            return PageOCRResult(
                page=idx, text="", confidence=0.0, line_count=0, low_confidence=True, lines=[]
            )

        full_text = "\n".join(line.text for line in lines)
        avg_confidence = sum(line.confidence for line in lines) / len(lines)

        return PageOCRResult(
            page=idx,
            text=full_text,
            confidence=round(avg_confidence, 4),
            line_count=len(lines),
            low_confidence=avg_confidence < settings.OCR_MIN_CONFIDENCE,
            lines=lines,
        )

    def _process_page_path(self, idx: int, page_path: Path) -> PageOCRResult:
        raw_image = load_png_as_bgr(page_path)
        return self._process_page_image(idx, raw_image)

    @staticmethod
    def _native_text_page_result(idx: int, text: str) -> PageOCRResult:
        """Build a PageOCRResult straight from a PDF's own text layer —
        no OCR was run, so confidence is 1.0 and there's no bounding-box
        geometry to report."""
        text = text.strip()
        line_count = len([ln for ln in text.splitlines() if ln.strip()])
        return PageOCRResult(
            page=idx,
            text=text,
            confidence=1.0,
            line_count=line_count,
            low_confidence=False,
            lines=[],
        )

    # -- public API --------------------------------------------------------

    def extract_text(
        self,
        file_path: Union[str, Path, None] = None,
        *,
        file_bytes: bytes | None = None,
        file_extension: str | None = None,
        stage_timings: Optional[Dict[str, float]] = None,
    ) -> List[PageOCRResult]:
        """
        Extract OCR text from a document.

        Accepts EITHER:
          - file_path: a path to an already-saved image/PDF on disk, OR
          - file_bytes + file_extension: raw bytes plus the extension
            (e.g. ".pdf", ".png") for documents not yet written to disk.

        If `stage_timings` (a dict) is passed, it is populated in-place
        with wall-clock seconds for each stage this call performs
        (subset of: "loading", "native_text_extraction", "conversion",
        "preprocessing_and_ocr") for performance logging by the caller.

        Returns a list of PageOCRResult (length 1 for images, N for
        an N-page PDF), each with cleaned reading-order lines,
        per-line confidence, and a page-level average confidence.
        """
        timings: Dict[str, float] = stage_timings if stage_timings is not None else {}

        load_start = time.time()
        if file_path is not None:
            path = Path(file_path)
            file_extension = path.suffix.lower()
            file_bytes = path.read_bytes()
        elif file_bytes is None or file_extension is None:
            raise OCREngineError(
                "extract_text() requires either file_path or (file_bytes + file_extension)."
            )
        timings["loading"] = round(time.time() - load_start, 4)

        if file_extension != ".pdf":
            # Images go straight to preprocessing + OCR.
            raw_image = bytes_to_image(file_bytes)
            ocr_start = time.time()
            result = self._process_page_image(1, raw_image)
            timings["preprocessing_and_ocr"] = round(time.time() - ocr_start, 4)
            return [result]

        # ---- PDF: check for a selectable text layer first -------------
        native_start = time.time()
        native_page_texts = extract_pdf_native_text(file_bytes)
        timings["native_text_extraction"] = round(time.time() - native_start, 4)

        if native_page_texts is not None:
            timings["conversion"] = 0.0
            timings["preprocessing_and_ocr"] = 0.0
            return [
                self._native_text_page_result(idx, text)
                for idx, text in enumerate(native_page_texts, start=1)
            ]

        # ---- Scanned PDF: rasterize to cached 300 DPI PNGs -------------
        cache_dir = pdf_cache_dir_for(file_bytes, settings.PDF_RENDER_DPI)
        conversion_start = time.time()
        try:
            page_paths = render_pdf_pages_to_png(file_bytes, cache_dir, settings.PDF_RENDER_DPI)
            timings["conversion"] = round(time.time() - conversion_start, 4)

            # ---- Preprocess + OCR pages in parallel --------------------
            ocr_start = time.time()
            results_by_index: Dict[int, PageOCRResult] = {}
            max_workers = max(1, min(settings.OCR_MAX_WORKERS, len(page_paths)))
            with ThreadPoolExecutor(max_workers=max_workers) as pool:
                futures = {
                    pool.submit(self._process_page_path, idx, page_path): idx
                    for idx, page_path in enumerate(page_paths, start=1)
                }
                for future in futures:
                    idx = futures[future]
                    results_by_index[idx] = future.result()
            timings["preprocessing_and_ocr"] = round(time.time() - ocr_start, 4)

            # Preserve original page order regardless of completion order.
            return [results_by_index[idx] for idx in sorted(results_by_index)]
        finally:
            # Delete cached page images once this document is fully
            # processed (success or failure) rather than leaving them
            # for the periodic stale-upload sweep.
            cleanup_pdf_page_cache(cache_dir)


def get_ocr_service() -> OCRService:
    """FastAPI dependency-style accessor for the singleton OCR service."""
    return OCRService()

