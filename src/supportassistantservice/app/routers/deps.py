import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


def _decode(credentials: HTTPAuthorizationCredentials | None) -> dict | None:
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.InvalidTokenError:
        return None
    if payload.get("type") != "access":
        return None
    return payload


def get_optional_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str | None:
    payload = _decode(credentials)
    return payload.get("sub") if payload else None


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """Chat is now a logged-in-only feature: every conversation belongs to a
    real account, so unlike get_optional_user_id this rejects the request
    outright instead of falling back to an anonymous session."""
    payload = _decode(credentials)
    if payload is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required")
    return payload["sub"]
