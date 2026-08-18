"""Pydantic schemas for authentication endpoints."""
import re
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserRole

PHONE_REGEX = re.compile(r"^\+?[0-9]{10,15}$")


def validate_password_strength(password: str) -> str:
    """Ensure password has minimum length, an uppercase, a digit, and a special character."""
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[0-9]", password):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        raise ValueError("Password must contain at least one special character")
    return password


class UserRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    phone_number: str
    password: str
    role: UserRole = UserRole.PATIENT

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not PHONE_REGEX.match(v):
            raise ValueError("Invalid phone number format. Expected 10-15 digits, optional leading +")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_password_strength(v)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


# -----------------------------
# NEW: Google OAuth Login Request
# -----------------------------
class GoogleLoginRequest(BaseModel):
    id_token: str = Field(..., description="Google Identity Services ID Token")


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_password_strength(v)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserProfileResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr
    phone_number: str
    role: UserRole
    is_active: bool
    preferred_language: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    message: str


class LanguageUpdateRequest(BaseModel):
    preferred_language: str = Field(
        ...,
        description="One of: en, ta, kn, te, hi"
    )