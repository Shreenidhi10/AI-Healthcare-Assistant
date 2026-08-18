"""
app/services/dashboard_service.py — Dashboard business logic (Phase 3).

Replaces Dashboard_Backend_API's fake, seeded User/Prescription/
Notification models (disconnected from real users, hardcoded sample
rows) with real queries against MedicalReport, Notification, and
ActivityLog, scoped to the authenticated user.
"""
from __future__ import annotations

from typing import List

from sqlalchemy.orm import Session

from app.models.activity_log import ActivityLog
from app.models.medical_report import MedicalReport
from app.models.notification import Notification
from app.models.user import User
from app.schemas.dashboard import (
    ActivityItem,
    DashboardOverview,
    DashboardStats,
    DashboardUserSummary,
    NotificationResponse,
    RecentReportItem,
)

_HEALTH_TIPS = [
    "Take your medicines at the same time every day to build a routine.",
    "Stay hydrated — aim for at least 8 glasses of water a day.",
    "Complete the full course of any antibiotic, even if you feel better.",
    "Keep a copy of your prescriptions in your Health Explained profile.",
]


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def get_overview(self, user: User) -> DashboardOverview:
        reports = (
            self.db.query(MedicalReport)
            .filter(MedicalReport.user_id == user.id)
            .order_by(MedicalReport.created_at.desc())
            .all()
        )
        notifications = (
            self.db.query(Notification)
            .filter(Notification.user_id == user.id)
            .order_by(Notification.created_at.desc())
            .limit(20)
            .all()
        )
        activity = (
            self.db.query(ActivityLog)
            .filter(ActivityLog.user_id == user.id)
            .order_by(ActivityLog.created_at.desc())
            .limit(20)
            .all()
        )

        stats = self._compute_stats(reports)

        return DashboardOverview(
            user=DashboardUserSummary(
                id=user.id,
                full_name=user.full_name,
                welcome_message=f"Welcome back, {user.full_name.split(' ')[0]}!",
                subtitle="Your healthcare, made simpler.",
                preferred_language=user.preferred_language,
            ),
            stats=stats,
            recent_reports=[
                RecentReportItem(
                    id=r.id,
                    title=r.primary_medication or (r.document.filename if r.document else "Medical report"),
                    language=r.language,
                    status=r.status,
                    created_at=r.created_at,
                )
                for r in reports[:10]
            ],
            notifications=[NotificationResponse.model_validate(n) for n in notifications],
            recent_activity=[ActivityItem.model_validate(a) for a in activity],
            health_tip=_HEALTH_TIPS[len(reports) % len(_HEALTH_TIPS)],
        )

    @staticmethod
    def _compute_stats(reports: List[MedicalReport]) -> DashboardStats:
        total = len(reports)
        pending = sum(1 for r in reports if r.needs_review)
        verified = sum(1 for r in reports if "Verified" in (r.status or []))
        medicines = sum(len((r.entities or {}).get("medicines", [])) for r in reports)
        latest = reports[0].created_at if reports else None
        return DashboardStats(
            total_reports=total,
            pending_reviews=pending,
            verified_reports=verified,
            total_medicines_tracked=medicines,
            latest_update=latest,
        )


def get_dashboard_service(db: Session) -> DashboardService:
    return DashboardService(db)
