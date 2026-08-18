"""
app/repositories/user_repository.py — Data-access layer for the User model.

Provides CRUD helpers for authentication and user management.
Extended to support Google OAuth.
"""

from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    # ---------------------------------------------------------
    # Lookup Methods
    # ---------------------------------------------------------

    def get_by_id(self, user_id: "uuid.UUID | str") -> Optional[User]:
        if isinstance(user_id, str):
            try:
                user_id = uuid.UUID(user_id)
            except ValueError:
                return None

        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> Optional[User]:
        return (
            self.db.query(User)
            .filter(User.email == email)
            .first()
        )

    def get_by_phone(self, phone_number: str) -> Optional[User]:
        return (
            self.db.query(User)
            .filter(User.phone_number == phone_number)
            .first()
        )

    def get_by_google_id(self, google_id: str) -> Optional[User]:
        return (
            self.db.query(User)
            .filter(User.google_id == google_id)
            .first()
        )

    # ---------------------------------------------------------
    # Google OAuth Helper
    # ---------------------------------------------------------

    def get_by_google_or_email(
        self,
        google_id: str,
        email: str,
    ) -> Optional[User]:
        """
        Find an existing Google user either by Google subject ID
        or by email address.
        """
        user = self.get_by_google_id(google_id)

        if user:
            return user

        return self.get_by_email(email)

    # ---------------------------------------------------------
    # Persistence
    # ---------------------------------------------------------

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def delete(self, user: User) -> None:
        self.db.delete(user)
        self.db.commit()