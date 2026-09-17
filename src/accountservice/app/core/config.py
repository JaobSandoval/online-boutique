import os


class Settings:
    database_url: str = os.environ.get("DATABASE_URL", "sqlite:////data/accounts.db")
    jwt_secret: str = os.environ.get("JWT_SECRET", "dev-insecure-secret-change-me")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    refresh_token_expire_days: int = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    cors_origins: list[str] = os.environ.get("CORS_ORIGINS", "*").split(",")


settings = Settings()
