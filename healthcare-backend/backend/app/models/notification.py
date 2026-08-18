"""
Notification — replaces Dashboard_Backend_API's fake, seeded
Notification model (no user_id, hardcoded sample rows) with a real,
per-user table.
"""
from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel, GUID


class Notification(BaseModel):
    __tablename__ = "notifications"

    user_id: Mapped[str] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user = relationship("User", backref="notifications")
