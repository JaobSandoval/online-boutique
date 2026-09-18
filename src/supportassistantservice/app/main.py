from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.repositories.faq_repository import FaqRepository
from app.repositories.intent_repository import IntentRepository
from app.routers import admin_router, chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        IntentRepository(db).ensure_defaults()
        FaqRepository(db).ensure_defaults()
    finally:
        db.close()
    yield


app = FastAPI(title="supportassistantservice", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router.router)
app.include_router(admin_router.router)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}
