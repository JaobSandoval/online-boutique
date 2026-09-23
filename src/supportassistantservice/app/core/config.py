import os


class Settings:
    database_url: str = os.environ.get("DATABASE_URL", "sqlite:////data/chatbot.db")
    jwt_secret: str = os.environ.get("JWT_SECRET", "dev-insecure-secret-change-me")
    jwt_algorithm: str = "HS256"

    product_catalog_addr: str = os.environ.get("PRODUCT_CATALOG_SERVICE_ADDR", "")
    recommendation_addr: str = os.environ.get("RECOMMENDATION_SERVICE_ADDR", "")
    cart_addr: str = os.environ.get("CART_SERVICE_ADDR", "")

    openai_api_key: str = os.environ.get("OPENAI_API_KEY", "")
    openai_model: str = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

    cors_origins: list[str] = os.environ.get("CORS_ORIGINS", "*").split(",")


settings = Settings()
