"""
AuditLog — security/compliance-oriented record: register, login,
login failure, logout, password change, language change, profile
change. Kept separate from ActivityLog (the user-facing feature-usage
feed) because audit entries need to be immutable and queryable by
security/compliance tooling independent of what the Dashboard chooses
to show a patient.
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import BaseModel, GUID


class AuditLog(BaseModel):
    __tablename__ = "audit_logs"

    user_id: Mapped[Optional[str]] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True
    )
    event: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "login_success", "login_failed"
    detail: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    user = relationship("User", backref="audit_logs")
