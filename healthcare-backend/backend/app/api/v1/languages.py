"""Language Management API (Phase 9). PUT /auth/profile/language already
lives in auth.py (it needs the auth dependency); this router exposes the
public, no-auth-required list of supported languages.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.models.user import SUPPORTED_LANGUAGE_CODES
from app.services.translation_service import SUPPORTED_LANGUAGES

router = APIRouter(prefix="/languages", tags=["Languages"])


@router.get("", summary="List supported languages for translation and preferred_language")
@router.get("/", include_in_schema=False)
def list_languages():
    assert set(SUPPORTED_LANGUAGE_CODES) == set(SUPPORTED_LANGUAGES), (
        "app.models.user.SUPPORTED_LANGUAGE_CODES and "
        "app.services.translation_service.SUPPORTED_LANGUAGES have drifted apart."
    )
    return {
        "success": True,
        "data": [{"code": code, "name": name} for code, name in SUPPORTED_LANGUAGES.items()],
    }
