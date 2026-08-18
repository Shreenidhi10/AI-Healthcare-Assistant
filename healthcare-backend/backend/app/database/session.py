"""
app/database/session.py — SQLAlchemy engine + session management.

DATABASE_URL is read from Settings (app/core/config.py). Defaults to a
local SQLite file so the app runs out of the box; set DATABASE_URL to a
Postgres DSN (e.g. postgresql+psycopg2://user:pass@host/db) in
production via the .env file.
"""
from __future__ import annotations

from typing import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.database.base import Base

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, future=True)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a request-scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables that don't exist yet.

    NOTE: this is a dev-friendly bootstrap. For real production
    deployments, replace with Alembic migrations so schema changes are
    versioned and reversible.
    """
    # Import models here (not at module top) so every model class is
    # registered on Base.metadata before create_all runs, without
    # creating circular imports.
    from app.models import (  # noqa: F401
        activity_log,
        audit_log,
        medical_history,
        medical_report,
        notification,
        ocr_document,
        patient_profile,
        simplification,
        token_blocklist,
        translation,
        user,
    )

    Base.metadata.create_all(bind=engine)

    # Ensure `prescription_summary` column exists on `medical_reports`.
    # Older DBs created before this feature won't have the column; add it
    # as a nullable JSON-compatible column. SQLite does not have a native
    # JSON type, so use TEXT there.
    try:
        inspector = inspect(engine)
        cols = [c["name"] for c in inspector.get_columns("medical_reports")]
        if "prescription_summary" not in cols:
            col_type = "TEXT" if engine.dialect.name == "sqlite" else "JSON"
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE medical_reports ADD COLUMN prescription_summary {col_type} NULL"))
    except Exception:
        # Be conservative: log nothing here to avoid circular imports; if the
        # ALTER fails in some environments (permissions, older SQLite), the
        # application can still run but writes may fail until DB is migrated.
        pass


def close_db() -> None:
    engine.dispose()
