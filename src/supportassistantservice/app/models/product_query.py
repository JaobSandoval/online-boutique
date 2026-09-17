import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ProductQueryLog(Base):
    __tablename__ = "product_query_log"

    query_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id: Mapped[str] = mapped_column(String(36), ForeignKey("messages.message_id"), nullable=False, unique=True)
    query_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    message = relationship("Message", back_populates="product_query_log")
    results = relationship("ProductQueryResult", back_populates="query", cascade="all, delete-orphan")


class ProductQueryResult(Base):
    __tablename__ = "product_query_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    query_id: Mapped[str] = mapped_column(String(36), ForeignKey("product_query_log.query_id"), nullable=False, index=True)
    product_id: Mapped[str] = mapped_column(String(64), nullable=False)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)

    query = relationship("ProductQueryLog", back_populates="results")
