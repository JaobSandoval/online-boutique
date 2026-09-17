from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FaqCategory(Base):
    __tablename__ = "faq_category"

    category_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)

    faqs = relationship("Faq", back_populates="category", cascade="all, delete-orphan")


class Faq(Base):
    __tablename__ = "faq"

    faq_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(Integer, ForeignKey("faq_category.category_id"), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)

    category = relationship("FaqCategory", back_populates="faqs")
