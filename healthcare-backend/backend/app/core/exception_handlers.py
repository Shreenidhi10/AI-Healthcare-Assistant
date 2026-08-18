"""
app/core/exception_handlers.py — Consistent JSON error responses.

Phase 14 requirement: validation errors, auth errors, DB errors, 404,
and 500 should all come back in the same predictable shape:

    {"success": false, "error": "<message>", "detail": "<ErrorType>"}
"""
from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.utils.exceptions import MedicalAIError

logger = logging.getLogger("app.errors")


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        # exc.errors() can contain raw exception objects inside 'ctx' (e.g. our own
        # field_validator ValueErrors), which json.dumps can't serialize directly.
        # jsonable_encoder with a fallback stringifies anything it doesn't recognize.
        safe_errors = jsonable_encoder(exc.errors(), custom_encoder={Exception: str})
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"success": False, "error": "Validation failed", "detail": safe_errors},
        )

    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "error": exc.detail, "detail": "HTTPException"},
        )

    app.exception_handler(HTTPException)(http_exception_handler)
    app.exception_handler(StarletteHTTPException)(http_exception_handler)

    @app.exception_handler(MedicalAIError)
    async def medical_ai_exception_handler(request: Request, exc: MedicalAIError) -> JSONResponse:
        logger.warning("%s on %s: %s", type(exc).__name__, request.url.path, exc.message)
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "error": exc.message, "detail": type(exc).__name__},
        )

    @app.exception_handler(SQLAlchemyError)
    async def db_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        logger.error("Database error on %s: %s", request.url.path, exc, exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "error": "A database error occurred", "detail": "DatabaseError"},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "error": "An unexpected internal error occurred", "detail": "InternalServerError"},
        )
