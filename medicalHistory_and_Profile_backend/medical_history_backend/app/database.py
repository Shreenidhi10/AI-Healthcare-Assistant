"""
app/database.py — In-memory database client.
"""
from __future__ import annotations

import logging
from typing import Any, Dict

logger = logging.getLogger("app.database")

# In-memory store promoted to primary database
_in_memory_medical_history: Dict[str, Dict[str, Any]] = {}
_in_memory_profiles: Dict[str, Dict[str, Any]] = {}

async def init_db() -> None:
    logger.info("[DB] Using in-memory data store.")

async def close_db() -> None:
    logger.info("[DB] In-memory store connection closed")
