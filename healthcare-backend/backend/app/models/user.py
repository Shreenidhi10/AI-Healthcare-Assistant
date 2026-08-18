"""User model: authentication + role-based access control."""

import enum

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import BaseModel


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    HEALTHCARE_WORKER = "healthcare_worker"
    PATIENT = "patient"


SUPPORTED_LANGUAGE_CODES = ("en", "ta", "kn", "te", "hi")


class User(BaseModel):
    __tablename__ = "users"

    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        index=True,
        nullable=False,
    )

    # Optional for Google users
    phone_number: Mapped[str | None] = mapped_column(
        String(20),
        unique=True,
        index=True,
        nullable=True,
    )

    # Optional for Google users
    hashed_password: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # Google Account ID (sub claim)
    google_id: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
    )

    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole),
        default=UserRole.PATIENT,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    preferred_language: Mapped[str] = mapped_column(
        String(5),
        default="en",
        nullable=False,
    )