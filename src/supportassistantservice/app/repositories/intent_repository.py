from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.intent import Intent

DEFAULT_INTENTS = [
    ("search_product", "El usuario busca productos por descripción o categoría"),
    ("recommendation", "El usuario pide recomendaciones"),
    ("cart_status", "El usuario pregunta por el contenido de su carrito"),
    ("faq", "Pregunta frecuente de soporte"),
    ("create_ticket", "El usuario quiere reportar un problema o crear un ticket"),
    ("other", "No se pudo clasificar la intención"),
]


class IntentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_name(self, name: str) -> Intent | None:
        return self.db.scalar(select(Intent).where(Intent.name == name))

    def ensure_defaults(self) -> None:
        for name, description in DEFAULT_INTENTS:
            if self.get_by_name(name) is None:
                self.db.add(Intent(name=name, description=description))
        self.db.commit()
