"""
app/api/deps.py — Shared FastAPI dependencies (auth + RBAC).

This module didn't exist in the original zip even though
app/api/v1/auth.py imported `get_current_user` from it, and
app/routers wanting role-based access had nothing to depend on.
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database.session import get_db
from app.models.token_blocklist import TokenBlocklist
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository

# tokenUrl points at the OAuth2-form login route registered in app/api/v1/auth.py
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = decode_access_token(token)
    except JWTError:
        raise CREDENTIALS_EXCEPTION

    jti = payload.get("jti")
    if jti and db.query(TokenBlocklist).filter(TokenBlocklist.jti == jti).first():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")

    user_id = payload.get("sub")
    if not user_id:
        raise CREDENTIALS_EXCEPTION

    user = UserRepository(db).get_by_id(user_id)
    if user is None:
        raise CREDENTIALS_EXCEPTION
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")
    return current_user


def require_role(*allowed_roles: UserRole):
    """Dependency factory for role-based access control.

    Usage: @router.get(..., dependencies=[Depends(require_role(UserRole.ADMIN))])
    """

    def _checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {[r.value for r in allowed_roles]}",
            )
        return current_user

    return _checker
