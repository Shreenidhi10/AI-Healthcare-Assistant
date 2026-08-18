"""
app/core/config.py — Centralized application settings.

Everything the app needs from the environment (secrets, DB URL, CORS
origins, token lifetimes) is defined here as a single `settings`
object, loaded once from `.env`. This replaces the old file, which
only exposed three loose constants and had no SECRET_KEY / DATABASE_URL
at all (app/core/security.py already expected a `settings` object that
didn't exist -- that was a broken import before this fix).
"""
from __future__ import annotations

from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/


class Settings(BaseSettings):
    # --- General ---
    APP_NAME: str = "Health Explained API"
    API_VERSION: str = "v1"
    ENV: str = "development"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    # --- Frontend / CORS ---
    FRONTEND_URL: str = "http://localhost:5173"
    ALLOWED_ORIGINS: str = ""  # comma-separated, e.g. "https://app.example.com,https://admin.example.com"

    # --- Database (single shared connection for every module) ---
    DATABASE_URL: str = "sqlite:///./health_explained.db"

    # --- Auth / JWT ---
    SECRET_KEY: str = "CHANGE_ME_ACCESS_SECRET_DO_NOT_USE_IN_PRODUCTION"
    REFRESH_SECRET_KEY: str = "CHANGE_ME_REFRESH_SECRET_DO_NOT_USE_IN_PRODUCTION"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- Google OAuth ---
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # --- Storage paths (OCR uploads, rendered PDF pages, persisted JSON) ---
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    OUTPUT_DIR: Path = BASE_DIR / "outputs"
    LOG_DIR: Path = BASE_DIR / "logs"
    MODELS_DIR: Path = BASE_DIR / "models"
    PADDLEOCR_MODEL_DIR: Path = MODELS_DIR / "PaddleOCR"
    BIOCLINICALBERT_MODEL_DIR: Path = MODELS_DIR / "BioClinicalBERT"
    TEMP_IMAGE_DIR: Path = UPLOAD_DIR / "pdf_pages"

    # --- Upload constraints ---
    ALLOWED_EXTENSIONS: list[str] = [".jpg", ".jpeg", ".png", ".pdf"]
    ALLOWED_MIME_TYPES: list[str] = ["image/jpeg", "image/png", "application/pdf"]
    MAX_FILE_SIZE_MB: int = 25
    MAX_PDF_PAGES: int = 30

    # --- PDF text-layer detection ---
    PDF_NATIVE_TEXT_MIN_CHARS_PER_PAGE: int = 20

    # --- PaddleOCR ---
    OCR_LANGUAGE: str = "en"
    OCR_USE_ANGLE_CLS: bool = True
    OCR_USE_GPU: bool = False
    OCR_DET_MODEL_DIR: str = ""
    OCR_REC_MODEL_DIR: str = ""
    OCR_CLS_MODEL_DIR: str = ""
    OCR_ENABLE_MKLDNN: bool = False
    OCR_CPU_THREADS: int = 4
    OCR_MIN_CONFIDENCE: float = 0.50
    OCR_MAX_WORKERS: int = 4
    # When PaddleOCR isn't installed (e.g. this dev/CI sandbox has no
    # internet access to download the multi-hundred-MB model weights),
    # OCRService transparently falls back to a stub engine so the rest
    # of the pipeline (DB storage, simplification, translation) stays
    # fully testable. Set to False to force a hard failure instead.
    OCR_ALLOW_STUB_ENGINE: bool = True

    # --- PDF rendering ---
    PDF_RENDER_DPI: int = 300

    # --- Image preprocessing ---
    PREPROCESS_MAX_DIMENSION: int = 2400
    PREPROCESS_ENABLE_DESKEW: bool = True
    PREPROCESS_ENABLE_DENOISE: bool = True
    PREPROCESS_ENABLE_GRAYSCALE: bool = True
    PREPROCESS_ENABLE_THRESHOLD: bool = False

    # --- BioClinicalBERT / NLP ---
    NLP_MODEL_NAME: str = "emilyalsentzer/Bio_ClinicalBERT"
    NLP_AGGREGATION_STRATEGY: str = "simple"
    NLP_MAX_TOKEN_LENGTH: int = 512
    NLP_MAX_INPUT_CHARS: int = 4000
    NLP_DEVICE_OVERRIDE: str = ""

    # --- Pipeline behaviour ---
    REVIEW_CONFIDENCE_THRESHOLD: float = 0.70

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @model_validator(mode="after")
    def validate_production_settings(self):
        if self.ENV.lower() == "production":
            default_access = "CHANGE_ME_ACCESS_SECRET_DO_NOT_USE_IN_PRODUCTION"
            default_refresh = "CHANGE_ME_REFRESH_SECRET_DO_NOT_USE_IN_PRODUCTION"
            if self.SECRET_KEY == default_access or self.REFRESH_SECRET_KEY == default_refresh:
                raise ValueError("Production requires non-default SECRET_KEY and REFRESH_SECRET_KEY.")
            if self.OCR_ALLOW_STUB_ENGINE:
                raise ValueError("Production requires OCR_ALLOW_STUB_ENGINE=False with a real OCR engine installed.")
        return self
    def get_allowed_origins(self) -> list[str]:
        configured = [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
        defaults = [self.FRONTEND_URL, "http://127.0.0.1:5173", "http://localhost:5173"]
        for origin in defaults:
            if origin not in configured:
                configured.append(origin)
        return configured

    def ensure_directories(self) -> None:
        for directory in (
            self.UPLOAD_DIR,
            self.OUTPUT_DIR,
            self.LOG_DIR,
            self.TEMP_IMAGE_DIR,
        ):
            Path(directory).mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_directories()

# --- Backward-compatible module-level names (old code imported these directly) ---
APP_NAME = settings.APP_NAME
API_VERSION = settings.API_VERSION
FRONTEND_URL = settings.FRONTEND_URL


def get_allowed_origins() -> list[str]:
    return settings.get_allowed_origins()

