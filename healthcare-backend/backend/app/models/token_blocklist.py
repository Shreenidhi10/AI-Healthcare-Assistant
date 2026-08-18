"""
TokenBlocklist — supports real /auth/logout.

JWTs are stateless by design, so "logout" for a JWT-based API normally
does nothing on the server (the old /auth/logout endpoint just returned
a message and left the access token valid until it expired). To make
logout actually revoke a token, we record its `jti` (JWT ID) here until
it would have expired anyway; get_current_user checks this table on
every request.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import BaseModel


class TokenBlocklist(BaseModel):
    __tablename__ = "token_blocklist"

    jti: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
