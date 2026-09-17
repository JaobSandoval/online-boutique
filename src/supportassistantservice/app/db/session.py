from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings

is_sqlite = settings.database_url.startswith("sqlite")
engine_kwargs = {"connect_args": {"check_same_thread": False}} if is_sqlite else {}
if is_sqlite:
    engine_kwargs["poolclass"] = StaticPool
engine = create_engine(settings.database_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
