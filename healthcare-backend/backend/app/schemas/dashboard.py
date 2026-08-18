"""Pydantic schemas for the Dashboard API (Phase 3)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class DashboardUserSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    welcome_message: str
    subtitle: str
    preferred_language: str


class DashboardStats(BaseModel):
    total_reports: int
    pending_reviews: int
    verified_reports: int
    total_medicines_tracked: int
    latest_update: Optional[datetime] = None


class RecentReportItem(BaseModel):
    id: uuid.UUID
    title: str
    language: str
    status: List[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationResponse(BaseModel):
    id: uuid.UUID
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityItem(BaseModel):
    id: uuid.UUID
    action: str
    description: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DashboardOverview(BaseModel):
    user: DashboardUserSummary
    stats: DashboardStats
    recent_reports: List[RecentReportItem]
    notifications: List[NotificationResponse]
    recent_activity: List[ActivityItem]
    health_tip: str
