"""
Centralized logging configuration for the application.

Single source of truth for logging across every module: auth, OCR,
NLP, simplification, translation, profile, dashboard, and errors all
log through get_logger(__name__) once configure_logging() has run at
app startup (see app/main.py's lifespan). A rotating file handler is
added in addition to the console handler so production deployments
keep a durable, size-capped log trail (Phase 14 requirement).
"""
import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

_CONFIGURED = False


def configure_logging(debug: bool = True, log_dir=None) -> None:
    """Configure root logger with a consistent format across the app."""
    global _CONFIGURED

    level = logging.DEBUG if debug else logging.INFO
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handlers = []

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    handlers.append(console_handler)

    if log_dir:
        try:
            log_path = Path(log_dir)
            log_path.mkdir(parents=True, exist_ok=True)
            file_handler = RotatingFileHandler(
                log_path / "app.log", maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
            )
            file_handler.setFormatter(formatter)
            handlers.append(file_handler)
        except OSError:  # pragma: no cover - read-only filesystem, etc.
            pass

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    # Avoid duplicate handlers on reload
    root_logger.handlers = handlers

    # Quiet down noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    _CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    """Return a named logger instance."""
    if not _CONFIGURED:
        configure_logging()
    return logging.getLogger(name)
