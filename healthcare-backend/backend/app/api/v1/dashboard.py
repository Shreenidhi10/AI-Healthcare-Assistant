"""Dashboard API (Phase 3). All routes require authentication and are
scoped to the current user's own real data."""
from __future__ import annotations

import uuid

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.dashboard import DashboardOverview, NotificationResponse
from app.services.dashboard_service import get_dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardOverview)
@router.get("/", response_model=DashboardOverview, include_in_schema=False)
def get_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = get_dashboard_service(db)
    return service.get_overview(current_user)


@router.get("/notifications", response_model=List[NotificationResponse])
def list_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return notifications


@router.put("/notifications/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    from fastapi import HTTPException, status

    notification = (
        db.query(Notification)
        .filter(Notification.id == str(notification_id), Notification.user_id == current_user.id)
        .first()
    )
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notification.is_read = True
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification

