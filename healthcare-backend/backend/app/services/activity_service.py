"""
app/services/activity_service.py — Shared activity/audit logging helper.

Phase 14 requirement: log authentication, OCR processing, simplification,
translation, and profile updates. Every module calls these two small
helpers instead of hand-rolling DB writes, so the log shape stays
consistent across the app.
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.core.logging_config import get_logger
from app.models.activity_log import ActivityLog
from app.models.audit_log import AuditLog

logger = get_logger(__name__)


def log_activity(
    db: Session,
    user_id: str,
    action: str,
    description: str = "",
    reference_id: Optional[str] = None,
    commit: bool = True,
) -> ActivityLog:
    """Record a user-facing activity feed entry (Dashboard 'recent activity')."""
    entry = ActivityLog(
        user_id=user_id, action=action, description=description, reference_id=reference_id
    )
    db.add(entry)
    if commit:
        db.commit()
        db.refresh(entry)
    logger.info("activity user=%s action=%s: %s", user_id, action, description)
    return entry


def log_audit(
    db: Session,
    event: str,
    user_id: Optional[str] = None,
    detail: str = "",
    ip_address: Optional[str] = None,
    commit: bool = True,
) -> AuditLog:
    """Record a security/compliance audit entry (auth events)."""
    entry = AuditLog(user_id=user_id, event=event, detail=detail, ip_address=ip_address)
    db.add(entry)
    if commit:
        db.commit()
        db.refresh(entry)
    logger.info("audit event=%s user=%s: %s", event, user_id, detail)
    return entry
