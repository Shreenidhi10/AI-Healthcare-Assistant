"""Business logic for authentication: registration, login, refresh, password changes."""
import uuid
import logging

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests

from app.core.config import settings
from app.services.activity_service import log_audit

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.schemas.auth import ChangePasswordRequest, TokenResponse, UserLoginRequest, UserRegisterRequest

logger = logging.getLogger(__name__)



class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)

    def register(self, payload: UserRegisterRequest) -> User:
        if self.user_repo.get_by_email(payload.email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
        if self.user_repo.get_by_phone(payload.phone_number):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone number is already registered")

        user = User(
            full_name=payload.full_name,
            email=payload.email,
            phone_number=payload.phone_number,
            hashed_password=hash_password(payload.password),
            role=payload.role,
        )
        return self.user_repo.create(user)

    def authenticate(self, payload: UserLoginRequest) -> User:
        user = self.user_repo.get_by_email(payload.email)

        if (
            not user
            or not user.hashed_password
            or not verify_password(payload.password, user.hashed_password)
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

        return user

    @staticmethod
    def issue_tokens(user: User) -> TokenResponse:
        access_token = create_access_token(subject=str(user.id), extra_claims={"role": user.role.value})
        refresh_token = create_refresh_token(subject=str(user.id))
        return TokenResponse(access_token=access_token, refresh_token=refresh_token)

    def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        try:
            payload = decode_refresh_token(refresh_token)
        except JWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

        user_id = payload.get("sub")
        user = self.user_repo.get_by_id(uuid.UUID(user_id)) if user_id else None
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

        return self.issue_tokens(user)

    def google_login(self, id_token: str) -> TokenResponse:
        """
        Google OAuth login.

        Verify Google ID token, find or create the user,
        then issue JWT access and refresh tokens.
        """
        try:
            token_info = google_id_token.verify_oauth2_token(
                id_token,
                requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except Exception as exc:
            logger.exception("Google ID token verification failed: %s", exc)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google ID token")

        google_subject = token_info.get("sub")
        email = token_info.get("email")
        full_name = token_info.get("name")

        if not google_subject or not email or not full_name:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google ID token")

        user = self.user_repo.get_by_google_id(google_subject)

        if not user:
            user = self.user_repo.get_by_email(email)

        is_new_google_registration = False

        if not user:
            user = User(
                full_name=full_name,
                email=email,
                google_id=google_subject,
                phone_number=None,
                hashed_password=None,
                role=UserRole.PATIENT,
            )
            user = self.user_repo.create(user)
            is_new_google_registration = True
        else:
            if not user.is_active:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

            if not user.google_id:
                user.google_id = google_subject
                user = self.user_repo.update(user)
                is_new_google_registration = True

        if is_new_google_registration:
            log_audit(
                self.db,
                event="google_register",
                user_id=str(user.id),
                detail=f"Google account registered for {email}",
            )

        log_audit(
            self.db,
            event="google_login",
            user_id=str(user.id),
            detail=f"Google login for {email}",
        )

        return self.issue_tokens(user)

    def change_password(self, user: User, payload: ChangePasswordRequest) -> None:
        if not verify_password(payload.old_password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Old password is incorrect")
        user.hashed_password = hash_password(payload.new_password)
        self.user_repo.update(user)
