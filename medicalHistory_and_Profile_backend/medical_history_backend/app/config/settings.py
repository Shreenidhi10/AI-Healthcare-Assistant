"""
app/config/settings.py — Centralised configuration for the FastAPI Medical AI & Profile API.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import List


def _env_bool(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")


def _env_list(name: str, default: List[str]) -> List[str]:
    val = os.getenv(name)
    if not val:
        return default
    return [item.strip() for item in val.split(",") if item.strip()]


class Settings:
    # ---- General ----
    APP_NAME: str = "Medical AI & Profile API"
    APP_VERSION: str = "1.0.0"
    ENV: str = os.getenv("ENV", "development")
    PORT: int = int(os.getenv("PORT", "8000"))


    # ---- Paths ----
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent  # project root
    MODELS_DIR: Path = Path(os.getenv("MODELS_DIR", BASE_DIR / "models"))
    PADDLEOCR_MODEL_DIR: Path = Path(
        os.getenv("PADDLEOCR_MODEL_DIR", MODELS_DIR / "PaddleOCR")
    )
    BIOCLINICALBERT_MODEL_DIR: Path = Path(
        os.getenv("BIOCLINICALBERT_MODEL_DIR", MODELS_DIR / "BioClinicalBERT")
    )
    UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR", BASE_DIR / "uploads"))
    OUTPUT_DIR: Path = Path(os.getenv("OUTPUT_DIR", BASE_DIR / "outputs"))
    LOG_DIR: Path = Path(os.getenv("LOG_DIR", BASE_DIR / "logs"))

    # ---- Upload constraints ----
    ALLOWED_EXTENSIONS: List[str] = _env_list(
        "ALLOWED_EXTENSIONS", [".jpg", ".jpeg", ".png", ".pdf"]
    )
    ALLOWED_MIME_TYPES: List[str] = _env_list(
        "ALLOWED_MIME_TYPES",
        ["image/jpeg", "image/png", "application/pdf"],
    )
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "25"))
    MAX_PDF_PAGES: int = int(os.getenv("MAX_PDF_PAGES", "30"))

    # ---- PaddleOCR ----
    OCR_LANGUAGE: str = os.getenv("OCR_LANGUAGE", "en")
    OCR_USE_ANGLE_CLS: bool = _env_bool("OCR_USE_ANGLE_CLS", True)
    OCR_USE_GPU: bool = _env_bool("OCR_USE_GPU", False)
    OCR_MIN_CONFIDENCE: float = float(os.getenv("OCR_MIN_CONFIDENCE", "0.50"))
    PDF_RENDER_DPI: int = int(os.getenv("PDF_RENDER_DPI", "300"))
    OCR_ENABLE_MKLDNN: bool = _env_bool("OCR_ENABLE_MKLDNN", False)
    OCR_CPU_THREADS: int = int(os.getenv("OCR_CPU_THREADS", "4"))
    OCR_DET_MODEL_DIR: str | None = os.getenv("OCR_DET_MODEL_DIR")
    OCR_REC_MODEL_DIR: str | None = os.getenv("OCR_REC_MODEL_DIR")
    OCR_CLS_MODEL_DIR: str | None = os.getenv("OCR_CLS_MODEL_DIR")

    # ---- Image preprocessing ----
    PREPROCESS_MAX_DIMENSION: int = int(os.getenv("PREPROCESS_MAX_DIMENSION", "2400"))
    PREPROCESS_ENABLE_DESKEW: bool = _env_bool("PREPROCESS_ENABLE_DESKEW", True)
    PREPROCESS_ENABLE_DENOISE: bool = _env_bool("PREPROCESS_ENABLE_DENOISE", False)

    # ---- BioClinicalBERT / NLP ----
    NLP_MODEL_NAME: str = os.getenv("NLP_MODEL_NAME", "emilyalsentzer/Bio_ClinicalBERT")
    NLP_AGGREGATION_STRATEGY: str = os.getenv("NLP_AGGREGATION_STRATEGY", "simple")
    NLP_MAX_TOKEN_LENGTH: int = int(os.getenv("NLP_MAX_TOKEN_LENGTH", "512"))
    NLP_MAX_INPUT_CHARS: int = int(os.getenv("NLP_MAX_INPUT_CHARS", "4000"))
    NLP_DEVICE_OVERRIDE: str = os.getenv("NLP_DEVICE_OVERRIDE", "")

    # ---- Pipeline behaviour ----
    REVIEW_CONFIDENCE_THRESHOLD: float = float(
        os.getenv("REVIEW_CONFIDENCE_THRESHOLD", "0.70")
    )
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    def ensure_directories(self) -> None:
        for directory in (
            self.UPLOAD_DIR,
            self.OUTPUT_DIR,
            self.LOG_DIR,
            self.PADDLEOCR_MODEL_DIR,
            self.BIOCLINICALBERT_MODEL_DIR,
        ):
            directory.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_directories()
