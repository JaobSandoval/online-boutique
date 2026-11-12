"""Acceso del asistente al catálogo real de la tienda.

El catálogo vive en productcatalogservice (gRPC). Su SearchProducts solo hace
coincidencia de subcadenas en inglés, así que "gafas" o "algo para acampar"
no devolvían nada. Este servicio:

- trae el catálogo completo con ListProducts y lo cachea unos minutos,
- busca localmente traduciendo términos en español a los nombres/categorías
  del catálogo y ordenando por relevancia,
- enriquece IDs (recomendaciones, carrito) con nombre, precio y enlace,
- genera un resumen del catálogo para dárselo al LLM como contexto, de modo
  que pueda sugerir productos reales directamente.
"""

import time

from app.clients.product_catalog_client import ProductCatalogClient
from app.services.scope_guard import normalize

CACHE_TTL_SECONDS = 300
MAX_PRODUCTS_IN_CONTEXT = 50

# término en español (normalizado) -> términos del catálogo (nombre, descripción o categoría)
SPANISH_SYNONYMS: dict[str, list[str]] = {
    "gafas": ["sunglasses"],
    "lentes": ["sunglasses"],
    "anteojos": ["sunglasses"],
    "sol": ["sunglasses"],
    "reloj": ["watch"],
    "relojes": ["watch"],
    "accesorio": ["accessories"],
    "accesorios": ["accessories"],
    "camiseta": ["tank top", "tops"],
    "playera": ["tank top", "tops"],
    "blusa": ["tank top", "tops"],
    "ropa": ["clothing"],
    "vestir": ["clothing"],
    "zapato": ["footwear", "loafers"],
    "zapatos": ["footwear", "loafers"],
    "calzado": ["footwear"],
    "mocasin": ["loafers"],
    "mocasines": ["loafers"],
    "secador": ["hairdryer"],
    "secadora": ["hairdryer"],
    "cabello": ["hair"],
    "pelo": ["hair"],
    "belleza": ["beauty"],
    "vela": ["candle"],
    "velas": ["candle"],
    "portavelas": ["candle holder"],
    "candelabro": ["candle holder"],
    "decoracion": ["decor"],
    "decorar": ["decor"],
    "hogar": ["home"],
    "casa": ["home"],
    "cocina": ["kitchen"],
    "cocinar": ["kitchen"],
    "salero": ["salt"],
    "sal": ["salt"],
    "pimienta": ["pepper"],
    "pimentero": ["pepper"],
    "frasco": ["jar"],
    "bambu": ["bamboo"],
    "taza": ["mug"],
    "tazas": ["mug"],
    "cafe": ["mug"],
    "te": ["mug"],
    "regalo": ["gift"],
    "regalar": ["gift"],
    "verano": ["summer", "sunglasses", "tank top"],
    "playa": ["sunglasses", "tank top"],
    "viaje": ["sunglasses", "watch"],
    "acampar": ["sunglasses", "watch", "jar"],
    "camping": ["sunglasses", "watch", "jar"],
}

STOPWORDS = {
    "algo", "para", "una", "uno", "unos", "unas", "los", "las", "del", "con", "que", "por",
    "quiero", "busco", "buscando", "necesito", "tienen", "tienes", "hay", "venden", "mas",
    "the", "and", "for", "with",
}


def _matches(term: str, text: str) -> bool:
    """Términos largos o compuestos: subcadena ("candle holder", "sunglass").
    Términos cortos ("te", "sal"): palabra completa, para no coincidir dentro de otras."""
    if " " in term or len(term) >= 4:
        return term in text
    return term in text.replace(",", " ").replace(".", " ").split()


def product_url(product_id: str) -> str:
    return f"/product/{product_id}"


class CatalogService:
    def __init__(self, client: ProductCatalogClient | None = None):
        self.client = client or ProductCatalogClient()
        self._cache: list[dict] = []
        self._cached_at = 0.0

    def list_products(self, category: str | None = None) -> list[dict]:
        if not self._cache or time.monotonic() - self._cached_at > CACHE_TTL_SECONDS:
            products = self.client.list_products()
            if products:  # si el servicio falla, se conserva la última copia buena
                self._cache = [{**p, "url": product_url(p["id"])} for p in products]
                self._cached_at = time.monotonic()
        if not category:
            return list(self._cache)
        wanted = self._expand(category)
        return [p for p in self._cache if wanted & {normalize(c) for c in p["categories"]}]

    def search(self, query: str, limit: int = 5) -> list[dict]:
        terms = self._expand(query)
        if not terms:
            return []
        scored = []
        for product in self.list_products():
            name = normalize(product["name"])
            description = normalize(product["description"])
            categories = {normalize(c) for c in product["categories"]}
            score = 0
            for term in terms:
                if _matches(term, name):
                    score += 3
                if term in categories:
                    score += 2
                if _matches(term, description):
                    score += 1
            if score:
                scored.append((score, product))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [p for _, p in scored[:limit]]

    def get_many(self, product_ids: list[str]) -> list[dict]:
        by_id = {p["id"]: p for p in self.list_products()}
        return [by_id[pid] for pid in product_ids if pid in by_id]

    def get(self, product_id: str) -> dict | None:
        found = self.get_many([product_id])
        return found[0] if found else None

    def context_summary(self) -> str:
        """Catálogo compacto para el prompt del LLM."""
        products = self.list_products()[:MAX_PRODUCTS_IN_CONTEXT]
        if not products:
            return ""
        lines = [
            f"- {p['name']} (id: {p['id']}) — {p['price_usd']} USD — categorías: {', '.join(p['categories'])} "
            f"— enlace: {p['url']} — {p['description'][:100]}"
            for p in products
        ]
        return "Catálogo actual de la tienda (datos reales):\n" + "\n".join(lines)

    @staticmethod
    def _expand(text: str) -> set[str]:
        terms: set[str] = set()
        for word in normalize(text).replace(",", " ").split():
            word = word.strip("¿?¡!.;:'\"")
            if len(word) < 2 or word in STOPWORDS:
                continue
            terms.add(word)
            terms.update(SPANISH_SYNONYMS.get(word, []))
            if word.endswith("s"):  # plural simple
                terms.update(SPANISH_SYNONYMS.get(word[:-1], []))
        return terms
