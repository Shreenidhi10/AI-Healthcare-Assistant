"""
app/main.py — FastAPI Application Entrypoint for Medical History & Profile Backend.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings
from app.database import close_db, init_db
from app.middleware.error_handler import global_exception_handler, validation_exception_handler
from app.routers import base, medical_history, prescriptions, profile
from app.services.nlp_service import get_nlp_service
from app.services.ocr_service import get_ocr_service
from app.utils.logger import setup_logging

setup_logging(settings.LOG_LEVEL)
logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("%s starting...", settings.APP_NAME)

    # 1. Database Initialization
    await init_db()

    # 2. Pre-load OCR and NLP engines lazily
    ocr_service = get_ocr_service()
    nlp_service = get_nlp_service()
    logger.info("OCR engine status: preloaded (gpu=%s)", settings.OCR_USE_GPU)
    logger.info("NLP engine status: preloaded (loaded=%s)", nlp_service.is_model_loaded)
    logger.info("Application ready.")

    yield

    logger.info("Shutting down %s...", settings.APP_NAME)
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Unified FastAPI Backend for Patient Profile and Medical History processing (OCR + NLP)",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware (allows Vite dev server and proxy requests)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Exception Handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Include Routers
app.include_router(base.router)
app.include_router(profile.router)
app.include_router(prescriptions.router)
app.include_router(medical_history.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
