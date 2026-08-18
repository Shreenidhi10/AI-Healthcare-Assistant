"""
app/utils/logger.py — Centralized logging configuration.

Provides a single get_logger() factory so every module (OCR, NLP,
pipeline, routes) logs consistently to both console and a rotating
file. This is essential for tracing a request across the OCR -> clean
-> NLP pipeline when debugging production issues.
"""
import logging
import sys
from logging.handlers import RotatingFileHandler

from app.config import settings

_CONFIGURED = False


def _configure_root_logger() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    root = logging.getLogger()
    root.setLevel(settings.LOG_LEVEL)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root.addHandler(console_handler)

    # Rotating file handler (10 MB per file, keep 5 backups)
    log_file = settings.LOG_DIR / "medical_ai_api.log"
    file_handler = RotatingFileHandler(
        log_file, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)

    _CONFIGURED = True


def setup_logging(level=None) -> None:
    _configure_root_logger()


def get_logger(name: str) -> logging.Logger:
    _configure_root_logger()
    return logging.getLogger(name)
