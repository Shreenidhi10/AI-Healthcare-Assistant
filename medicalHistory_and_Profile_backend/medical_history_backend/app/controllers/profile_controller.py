"""
app/controllers/profile_controller.py — Controller logic for Patient Profile CRUD.
"""
from __future__ import annotations

import logging
from typing import Any, Dict
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from app.database import _in_memory_profiles
from app.schemas.profile import ProfileUpdate, MedicalHistoryUpdate

logger = logging.getLogger("app.controllers.profile")
USER_ID = "demo-user"


async def get_profile_data() -> Dict[str, Any]:
    profile = _in_memory_profiles.get(USER_ID)

    if not profile:
        return {
            "name": "",
            "age": None,
            "gender": "",
            "bloodGroup": "",
            "preferredLanguage": "English",
            "phone": "",
            "email": "",
            "allergies": [],
            "chronicConditions": [],
        }

    return {
        "name": profile.get("name", ""),
        "age": profile.get("age"),
        "gender": profile.get("gender", ""),
        "bloodGroup": profile.get("bloodGroup", ""),
        "preferredLanguage": profile.get("preferredLanguage", "English"),
        "phone": profile.get("phone", ""),
        "email": profile.get("email", ""),
        "allergies": profile.get("allergies", []),
        "chronicConditions": profile.get("chronicConditions", []),
    }


async def update_profile_data(body: Dict[str, Any]) -> Dict[str, Any]:
    try:
        # Pydantic validation handles gender, bloodGroup, preferredLanguage enums
        validated = ProfileUpdate(**body).model_dump(exclude_unset=True)
    except ValidationError as e:
        raise RequestValidationError(e.errors())

    update_data: Dict[str, Any] = {}

    if "name" in validated and validated["name"] is not None:
        update_data["name"] = str(validated["name"]).strip()

    if "age" in validated:
        raw_age = validated["age"]
        if raw_age == "" or raw_age is None:
            update_data["age"] = None
        else:
            try:
                update_data["age"] = int(raw_age)
            except (ValueError, TypeError):
                # Format an error compatible with Pydantic's RequestValidationError
                err = [{"loc": ("age",), "msg": "Age must be a number", "type": "value_error"}]
                raise RequestValidationError(err)

    for field in ("gender", "bloodGroup", "preferredLanguage", "phone", "email"):
        if field in validated and validated[field] is not None:
            update_data[field] = str(validated[field])

    # Handle string vs list for allergies & chronicConditions
    for field in ("allergies", "chronicConditions"):
        if field in validated and validated[field] is not None:
            val = validated[field]
            if isinstance(val, list):
                update_data[field] = [str(x).strip() for x in val if str(x).strip()]
            elif isinstance(val, str):
                update_data[field] = [x.strip() for x in val.split(",") if x.strip()]

    current = _in_memory_profiles.get(USER_ID, {"userId": USER_ID})
    current.update(update_data)
    _in_memory_profiles[USER_ID] = current
    res = current

    return {
        "name": res.get("name", ""),
        "age": res.get("age"),
        "gender": res.get("gender", ""),
        "bloodGroup": res.get("bloodGroup", ""),
        "preferredLanguage": res.get("preferredLanguage", "English"),
        "phone": res.get("phone", ""),
        "email": res.get("email", ""),
        "allergies": res.get("allergies", []),
        "chronicConditions": res.get("chronicConditions", []),
    }


async def get_medical_history_data() -> Dict[str, Any]:
    profile = await get_profile_data()
    return {
        "bloodGroup": profile.get("bloodGroup", ""),
        "allergies": profile.get("allergies", []),
        "chronicConditions": profile.get("chronicConditions", []),
    }


async def update_medical_history_data(body: Dict[str, Any]) -> Dict[str, Any]:
    try:
        validated = MedicalHistoryUpdate(**body).model_dump(exclude_unset=True)
    except ValidationError as e:
        raise RequestValidationError(e.errors())
        
    update_data: Dict[str, Any] = {}
    if "bloodGroup" in validated and validated["bloodGroup"] is not None:
        update_data["bloodGroup"] = str(validated["bloodGroup"])

    for field in ("allergies", "chronicConditions"):
        if field in validated and validated[field] is not None:
            val = validated[field]
            if isinstance(val, list):
                update_data[field] = [str(x).strip() for x in val if str(x).strip()]
            elif isinstance(val, str):
                update_data[field] = [x.strip() for x in val.split(",") if x.strip()]

    profile = await update_profile_data(update_data)
    return {
        "bloodGroup": profile.get("bloodGroup", ""),
        "allergies": profile.get("allergies", []),
        "chronicConditions": profile.get("chronicConditions", []),
    }
