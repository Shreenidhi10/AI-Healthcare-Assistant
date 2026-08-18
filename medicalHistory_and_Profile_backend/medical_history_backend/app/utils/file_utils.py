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

import os
import tempfile
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, List

import cv2
import fitz  # PyMuPDF
import numpy as np
from fastapi import UploadFile

from app.config import settings
from app.utils.exceptions import (
    FileTooLargeError,
    InvalidFileError,
    PDFConversionError,
    UnsupportedFileTypeError,
)
from app.utils.logger import get_logger

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
    validate_extension(file.filename)
    if file.content_type:
        validate_mime_type(file.content_type)

    contents = await file.read()
    validate_size(len(contents))

    logger.info("[DEBUG 1/7] Uploaded file received correctly: name=%s, size=%d bytes, mime=%s", file.filename, len(contents), file.content_type)
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
    logger.info("[DEBUG 2/7] Image dimensions after decoding: width=%d, height=%d, channels=%d", image.shape[1], image.shape[0], image.shape[2] if len(image.shape) > 2 else 1)
    return image


def pdf_bytes_to_images(pdf_bytes: bytes) -> List[np.ndarray]:
    """
    Convert PDF bytes into a list of BGR numpy images, one per page,
    using PyMuPDF (fitz). No external poppler binary required, which
    keeps the service container-friendly.
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:  # noqa: BLE001
        raise PDFConversionError(f"Unable to open PDF file. It may be corrupted: {exc}") from exc

    if doc.page_count == 0:
        doc.close()
        raise PDFConversionError("PDF contains no pages.")

    if doc.page_count > settings.MAX_PDF_PAGES:
        doc.close()
        raise PDFConversionError(
            f"PDF has {doc.page_count} pages, exceeding the limit of "
            f"{settings.MAX_PDF_PAGES} pages per request."
        )

    zoom = settings.PDF_RENDER_DPI / 72.0  # PDF default is 72 DPI
    matrix = fitz.Matrix(zoom, zoom)

    images: List[np.ndarray] = []
    try:
        for page_index in range(doc.page_count):
            page = doc.load_page(page_index)
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
                pix.height, pix.width, pix.n
            )
            if pix.n == 3:
                bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            elif pix.n == 4:
                bgr = cv2.cvtColor(img_array, cv2.COLOR_RGBA2BGR)
            else:
                bgr = cv2.cvtColor(img_array, cv2.COLOR_GRAY2BGR)
            images.append(bgr)
    except Exception as exc:  # noqa: BLE001
        raise PDFConversionError(f"Failed to render PDF pages to images: {exc}") from exc
    finally:
        doc.close()

    logger.info("Converted PDF into %d page image(s) at %d DPI", len(images), settings.PDF_RENDER_DPI)
    return images


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
