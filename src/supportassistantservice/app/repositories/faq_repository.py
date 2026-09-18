from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.faq import Faq, FaqCategory

DEFAULT_FAQ = [
    ("Envíos", "¿Cuánto tarda el envío?", "Los envíos estándar tardan de 3 a 5 días hábiles."),
    ("Envíos", "¿Hacen envíos internacionales?", "Por ahora solo enviamos dentro del país."),
    ("Pagos", "¿Qué métodos de pago aceptan?", "Aceptamos tarjetas de crédito, débito y PayPal."),
    ("Devoluciones", "¿Cómo devuelvo un producto?", "Tienes 30 días para solicitar una devolución desde tu cuenta."),
]


class FaqRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_category(self, name: str) -> FaqCategory | None:
        return self.db.scalar(select(FaqCategory).where(FaqCategory.name == name))

    def ensure_defaults(self) -> None:
        for category_name, question, answer in DEFAULT_FAQ:
            category = self.get_category(category_name)
            if category is None:
                category = FaqCategory(name=category_name)
                self.db.add(category)
                self.db.flush()
            exists = self.db.scalar(select(Faq).where(Faq.question == question))
            if exists is None:
                self.db.add(Faq(category_id=category.category_id, question=question, answer=answer))
        self.db.commit()

    def search(self, keyword: str, limit: int = 3) -> list[Faq]:
        pattern = f"%{keyword.lower()}%"
        return list(
            self.db.scalars(select(Faq).where(func.lower(Faq.question).like(pattern)).limit(limit))
        )
