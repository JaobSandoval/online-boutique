import unicodedata

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.faq import Faq, FaqCategory

DEFAULT_FAQ = [
    ("Envíos", "¿Cuánto tarda el envío?", "Los envíos estándar tardan de 3 a 5 días hábiles."),
    ("Envíos", "¿Hacen envíos internacionales?", "Por ahora solo enviamos dentro del país."),
    ("Pagos", "¿Qué métodos de pago aceptan?", "Aceptamos tarjetas de crédito, débito y PayPal."),
    ("Devoluciones", "¿Cómo devuelvo un producto?", "Tienes 30 días para solicitar una devolución desde tu cuenta."),
    ("Envíos", "¿Cuánto cuesta el envío?", "El costo de envío se calcula en el checkout según la dirección de entrega."),
    ("Envíos", "¿Cómo rastreo mi pedido?", "Al confirmar tu compra recibes un ID de seguimiento del envío; si tu paquete se retrasa, abre un ticket de soporte."),
    ("Envíos", "Mi paquete no llegó, ¿qué hago?", "Si pasaron más de 5 días hábiles, abre un ticket de soporte con tu número de pedido y lo revisamos."),
    ("Pagos", "¿En qué monedas puedo pagar?", "Puedes ver los precios en varias monedas (USD, EUR, CAD, JPY, GBP, TRY) con el selector de moneda de la tienda."),
    ("Pagos", "¿Es seguro pagar en la tienda?", "Sí, el pago se procesa a través de nuestro servicio de pagos y no almacenamos los datos completos de tu tarjeta."),
    ("Pedidos", "¿Puedo cancelar mi pedido?", "Puedes solicitar la cancelación abriendo un ticket de soporte antes de que el pedido sea enviado."),
    ("Pedidos", "¿Cómo hago un pedido?", "Agrega los productos al carrito, ve al carrito y completa el checkout con tu dirección y método de pago."),
    ("Devoluciones", "¿Cuándo recibo mi reembolso?", "El reembolso se acredita en tu método de pago original de 5 a 10 días hábiles después de recibir la devolución."),
    ("Devoluciones", "¿Los productos tienen garantía?", "Todos los productos tienen garantía de 30 días por defectos de fábrica."),
    ("Cuenta", "¿Cómo creo una cuenta?", "Haz clic en 'Registrarse' en la parte superior de la tienda e ingresa tu correo y una contraseña."),
    ("Cuenta", "Olvidé mi contraseña", "Si no puedes iniciar sesión, abre un ticket de soporte y te ayudamos a recuperar el acceso."),
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
        """Busca por palabra clave en pregunta y respuesta, sin importar acentos
        ni mayúsculas, y ordena por cantidad de términos coincidentes."""
        terms = [t for t in _normalize(keyword).split() if len(t) > 2]
        if not terms:
            return []
        scored = []
        for faq in self.db.scalars(select(Faq)):
            haystack = _normalize(f"{faq.question} {faq.answer}")
            score = sum(term in haystack for term in terms)
            if score:
                scored.append((score, faq))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [faq for _, faq in scored[:limit]]


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in text if not unicodedata.combining(c))
