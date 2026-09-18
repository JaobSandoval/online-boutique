from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.repositories.user_repository import UserRepository
from app.routers import auth_router, users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        UserRepository(db).ensure_default_roles()
    finally:
        db.close()
    yield


app = FastAPI(title="accountservice", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(users_router.router)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}
