"""
app/middleware/error_handler.py — Custom exception handling middleware.
"""
from __future__ import annotations

import logging
from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("app.middleware.error")


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = [f"{err.get('loc', [])}: {err.get('msg', '')}" for err in exc.errors()]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"success": False, "message": "Validation failed", "errors": errors},
    )


async def global_exception_handler(request: Request, exc: Exception):
    logger.error("[Global Error] %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "message": "Internal server error"},
    )
