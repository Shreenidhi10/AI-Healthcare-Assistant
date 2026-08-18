"""
app/utils/file_utils.py — File I/O utilities.

Responsibilities:
  - Validate uploaded files (extension, MIME type, size) before any
    expensive OCR/NLP work is attempted.
  - Convert PDF bytes into per-page BGR images (via PyMuPDF) for OCR.
  - Decode raw image bytes into OpenCV-compatible arrays.
  - Manage temporary file cleanup so /uploads never accumulates junk.
"""
from __future__ import annotations

import hashlib
import os
import shutil
import tempfile
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, List, Optional

import cv2
import fitz  # PyMuPDF
import numpy as np
from fastapi import UploadFile

from app.core.config import settings
from app.utils.exceptions import (
    FileTooLargeError,
    InvalidFileError,
    PasswordProtectedPDFError,
    PDFConversionError,
    UnsupportedFileTypeError,
)
from app.core.logging_config import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Upload validation
# ---------------------------------------------------------------------------

def validate_extension(filename: str) -> str:
    """Validate and return the lowercase file extension."""
    if not filename or "." not in filename:
        raise InvalidFileError("Uploaded file is missing a valid filename/extension.")

    ext = Path(filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise UnsupportedFileTypeError(
            f"File type '{ext}' is not supported. "
            f"Allowed types: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    return ext


def validate_mime_type(content_type: str) -> None:
    if content_type and content_type not in settings.ALLOWED_MIME_TYPES:
        raise UnsupportedFileTypeError(
            f"MIME type '{content_type}' is not supported. "
            f"Allowed types: {', '.join(settings.ALLOWED_MIME_TYPES)}"
        )


def validate_size(size_bytes: int) -> None:
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if size_bytes <= 0:
        raise InvalidFileError("Uploaded file is empty.")
    if size_bytes > max_bytes:
        raise FileTooLargeError(
            f"File exceeds the maximum allowed size of {settings.MAX_FILE_SIZE_MB} MB."
        )


async def validate_upload(file: UploadFile) -> bytes:
    """
    Run full validation on an incoming UploadFile and return its raw bytes.

    Reads the file once into memory (bounded by MAX_FILE_SIZE_MB) so
    downstream services work with bytes directly rather than re-reading
    the stream, which is safer under concurrent request handling.
    """
    validate_extension(file.filename)
    if file.content_type:
        validate_mime_type(file.content_type)

    contents = await file.read()
    validate_size(len(contents))

    logger.info(
        "File validated: name=%s size=%d bytes content_type=%s",
        file.filename,
        len(contents),
        file.content_type,
    )
    return contents


# ---------------------------------------------------------------------------
# Decoding: bytes -> images
# ---------------------------------------------------------------------------

def bytes_to_image(image_bytes: bytes) -> np.ndarray:
    """Decode raw image bytes (JPG/PNG) into a BGR OpenCV array."""
    np_array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
    if image is None:
        raise InvalidFileError("Uploaded file could not be decoded as a valid image.")
    return image


def _open_pdf(pdf_bytes: bytes) -> fitz.Document:
    """
    Open PDF bytes with PyMuPDF, translating the two common failure
    modes (corruption, encryption) into typed exceptions the rest of
    the pipeline can handle distinctly.
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:  # noqa: BLE001
        raise PDFConversionError(f"Unable to open PDF file. It may be corrupted: {exc}") from exc

    if doc.needs_pass:
        doc.close()
        raise PasswordProtectedPDFError()

    if doc.page_count == 0:
        doc.close()
        raise PDFConversionError("PDF contains no pages.")

    if doc.page_count > settings.MAX_PDF_PAGES:
        page_count = doc.page_count
        doc.close()
        raise PDFConversionError(
            f"PDF has {page_count} pages, exceeding the limit of "
            f"{settings.MAX_PDF_PAGES} pages per request."
        )

    return doc


def extract_pdf_native_text(pdf_bytes: bytes) -> Optional[List[str]]:
    """
    Attempt to pull a real text layer straight out of the PDF (e.g. a
    report exported from Word, or any digitally-authored document)
    instead of rasterizing + OCRing it.

    Returns a list of per-page text (index-aligned with page number)
    if the document's average extractable characters per page meet
    settings.PDF_NATIVE_TEXT_MIN_CHARS_PER_PAGE, signalling this is a
    "digital" PDF rather than a scan. Returns None if the PDF looks
    like a scanned/image-only document, in which case the caller
    should fall back to OCR.
    """
    doc = _open_pdf(pdf_bytes)
    try:
        page_texts = [doc.load_page(i).get_text("text") for i in range(doc.page_count)]
    except Exception as exc:  # noqa: BLE001
        logger.warning("Native PDF text extraction failed, will fall back to OCR: %s", exc)
        return None
    finally:
        doc.close()

    total_chars = sum(len(t.strip()) for t in page_texts)
    avg_chars_per_page = total_chars / len(page_texts) if page_texts else 0

    if avg_chars_per_page >= settings.PDF_NATIVE_TEXT_MIN_CHARS_PER_PAGE:
        logger.info(
            "PDF has a native text layer (avg %.0f chars/page) — skipping OCR entirely.",
            avg_chars_per_page,
        )
        return page_texts

    logger.info(
        "PDF has no usable text layer (avg %.0f chars/page) — will rasterize and OCR.",
        avg_chars_per_page,
    )
    return None


def pdf_cache_dir_for(pdf_bytes: bytes, dpi: int) -> Path:
    """
    Deterministic scratch directory for a given PDF's rendered pages,
    keyed by a content hash + DPI. Re-requesting the same PDF at the
    same DPI (e.g. a client retry) resolves to the same directory, so
    already-rendered pages are reused instead of re-rasterized.
    """
    digest = hashlib.sha256(pdf_bytes).hexdigest()[:24]
    return settings.TEMP_IMAGE_DIR / f"{digest}_{dpi}dpi"


def render_pdf_pages_to_png(pdf_bytes: bytes, cache_dir: Path, dpi: int | None = None) -> List[Path]:
    """
    Rasterize every page of a PDF into a 300-DPI (by default) PNG file
    under `cache_dir`, one file per page, and return the resulting
    paths in page order.

    PNG (lossless) is used instead of JPEG to avoid compression
    artifacts that measurably hurt OCR accuracy on small text.

    Pages whose PNG already exists in `cache_dir` (from a prior call
    for this same PDF+DPI, see pdf_cache_dir_for) are left untouched —
    this is what avoids repeated PDF->image conversion.
    """
    dpi = dpi or settings.PDF_RENDER_DPI
    cache_dir.mkdir(parents=True, exist_ok=True)

    doc = _open_pdf(pdf_bytes)
    zoom = dpi / 72.0  # PDF default is 72 DPI
    matrix = fitz.Matrix(zoom, zoom)

    page_paths: List[Path] = []
    try:
        for page_index in range(doc.page_count):
            page_path = cache_dir / f"page_{page_index + 1:04d}.png"
            if page_path.exists() and page_path.stat().st_size > 0:
                page_paths.append(page_path)
                continue
            try:
                page = doc.load_page(page_index)
                pix = page.get_pixmap(matrix=matrix, alpha=False)
                pix.save(str(page_path))
            except Exception as exc:  # noqa: BLE001
                raise PDFConversionError(
                    f"Failed to render page {page_index + 1} to an image: {exc}"
                ) from exc
            page_paths.append(page_path)
    finally:
        doc.close()

    logger.info("Rendered/verified %d PDF page image(s) at %d DPI in %s", len(page_paths), dpi, cache_dir)
    return page_paths


def load_png_as_bgr(path: Path) -> np.ndarray:
    """Load a rendered page PNG back into a BGR OpenCV array for preprocessing/OCR."""
    image = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if image is None:
        raise PDFConversionError(f"Failed to read rendered page image: {path}")
    return image


def cleanup_pdf_page_cache(cache_dir: Path) -> None:
    """Delete a PDF page-image cache directory and everything in it."""
    try:
        if cache_dir.exists():
            shutil.rmtree(cache_dir)
            logger.debug("Cleaned up temporary PDF page images: %s", cache_dir)
    except OSError as exc:  # noqa: BLE001
        logger.warning("Failed to remove temporary PDF page image dir %s: %s", cache_dir, exc)


def pdf_bytes_to_images(pdf_bytes: bytes, dpi: int | None = None) -> List[np.ndarray]:
    """
    Convenience wrapper kept for callers that just want in-memory BGR
    page images without dealing with the on-disk cache directly (e.g.
    ad-hoc scripts/tests). Renders to the standard cache dir, loads
    everything into memory, then cleans the temp files back up.

    The main OCR pipeline uses render_pdf_pages_to_png /
    load_png_as_bgr / cleanup_pdf_page_cache directly instead, so it
    can process pages one at a time (in parallel) and control cleanup
    timing itself.
    """
    dpi = dpi or settings.PDF_RENDER_DPI
    cache_dir = pdf_cache_dir_for(pdf_bytes, dpi)
    try:
        page_paths = render_pdf_pages_to_png(pdf_bytes, cache_dir, dpi)
        return [load_png_as_bgr(p) for p in page_paths]
    finally:
        cleanup_pdf_page_cache(cache_dir)


# ---------------------------------------------------------------------------
# Temporary file management
# ---------------------------------------------------------------------------

@contextmanager
def temp_upload_file(file_bytes: bytes, suffix: str) -> Iterator[Path]:
    """
    Write uploaded bytes to a temp file under settings.UPLOAD_DIR for the
    duration of the `with` block, then guarantee cleanup afterwards
    (even on exception). Some OCR/PDF libraries work more reliably from
    a file path than from an in-memory buffer, so this gives callers a
    safe, auto-cleaned path to use when needed.
    """
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    fd, tmp_path_str = tempfile.mkstemp(suffix=suffix, dir=str(settings.UPLOAD_DIR))
    tmp_path = Path(tmp_path_str)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(file_bytes)
        yield tmp_path
    finally:
        try:
            if tmp_path.exists():
                tmp_path.unlink()
                logger.debug("Cleaned up temp upload file: %s", tmp_path)
        except OSError as exc:  # noqa: BLE001
            logger.warning("Failed to remove temp upload file %s: %s", tmp_path, exc)


def cleanup_stale_uploads(max_age_seconds: int = 3600) -> int:
    """
    Remove any leftover files in UPLOAD_DIR older than max_age_seconds.
    Useful as a periodic maintenance task (e.g. called from a startup
    hook or an external cron) in case a crash prevented normal cleanup.
    Returns the number of files removed.
    """
    removed = 0
    now = time.time()
    if not settings.UPLOAD_DIR.exists():
        return removed

    for path in settings.UPLOAD_DIR.iterdir():
        if not path.is_file() or path.name == ".gitkeep":
            continue
        try:
            age = now - path.stat().st_mtime
            if age > max_age_seconds:
                path.unlink()
                removed += 1
        except OSError as exc:  # noqa: BLE001
            logger.warning("Failed to remove stale upload %s: %s", path, exc)

    if removed:
        logger.info("Cleaned up %d stale upload file(s).", removed)
    return removed
