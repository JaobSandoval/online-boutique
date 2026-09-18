from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    refresh_token_expiry,
    split_refresh_token,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import RegisterRequest, TokenResponse, UserResponse


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)
        self.refresh_tokens = RefreshTokenRepository(db)

    def register(self, payload: RegisterRequest) -> UserResponse:
        if self.users.get_by_email(payload.email) is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Email ya registrado")
        user = User(
            email=payload.email,
            password_hash=hash_password(payload.password),
            display_name=payload.display_name,
        )
        user = self.users.create(user, role_names=["customer"])
        return UserResponse(
            user_id=user.user_id,
            email=user.email,
            display_name=user.display_name,
            roles=self.users.get_role_names(user),
            is_active=user.is_active,
        )

    def login(self, email: str, password: str) -> TokenResponse:
        user = self.users.get_by_email(email)
        if user is None or not verify_password(password, user.password_hash):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Credenciales inválidas")
        if not user.is_active:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Cuenta deshabilitada")
        return self._issue_tokens(user)

    def refresh(self, refresh_token: str) -> TokenResponse:
        token_id, raw = split_refresh_token(refresh_token)
        stored = self.refresh_tokens.get_by_id(token_id)
        if stored is None or not self.refresh_tokens.is_valid(stored) or stored.token_hash != hash_refresh_token(raw):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token inválido o expirado")
        self.refresh_tokens.revoke(stored)
        user = self.users.get_by_id(stored.user_id)
        if user is None or not user.is_active:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario no válido")
        return self._issue_tokens(user)

    def logout(self, refresh_token: str) -> None:
        token_id, _ = split_refresh_token(refresh_token)
        stored = self.refresh_tokens.get_by_id(token_id)
        if stored is not None and stored.revoked_at is None:
            self.refresh_tokens.revoke(stored)

    def get_profile(self, user_id: str) -> UserResponse:
        user = self.users.get_by_id(user_id)
        if user is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
        return UserResponse(
            user_id=user.user_id,
            email=user.email,
            display_name=user.display_name,
            roles=self.users.get_role_names(user),
            is_active=user.is_active,
        )

    def _issue_tokens(self, user: User) -> TokenResponse:
        roles = self.users.get_role_names(user)
        access_token, expires_in = create_access_token(user.user_id, user.email, roles)
        token_id, raw_refresh, token_hash = generate_refresh_token()
        self.refresh_tokens.create(
            RefreshToken(
                token_id=token_id,
                user_id=user.user_id,
                token_hash=token_hash,
                expires_at=refresh_token_expiry(),
            )
        )
        return TokenResponse(access_token=access_token, refresh_token=raw_refresh, expires_in=expires_in)
