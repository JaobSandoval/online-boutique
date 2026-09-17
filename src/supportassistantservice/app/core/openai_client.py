from openai import OpenAI

from app.core.config import settings

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "Busca productos del catálogo de la tienda por descripción en lenguaje natural.",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string", "description": "Descripción de lo que busca el usuario"}},
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_recommendations",
            "description": "Obtiene recomendaciones de productos para el usuario.",
            "parameters": {
                "type": "object",
                "properties": {
                    "seen_product_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "IDs de productos que el usuario ya vio o mencionó, para no repetirlos",
                    }
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_cart",
            "description": "Consulta el contenido actual del carrito de compras del usuario.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_faq",
            "description": "Busca en las preguntas frecuentes de soporte (envíos, pagos, devoluciones).",
            "parameters": {
                "type": "object",
                "properties": {"keyword": {"type": "string"}},
                "required": ["keyword"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_ticket",
            "description": "Crea un ticket de soporte cuando el usuario reporta un problema que no se resuelve con FAQ.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "description": "Categoría breve del problema"},
                    "description": {"type": "string", "description": "Descripción del problema reportado"},
                },
                "required": ["category", "description"],
            },
        },
    },
]

SYSTEM_PROMPT = (
    "Eres el asistente de soporte de Online Boutique, una tienda online. "
    "Ayudas a los clientes a buscar productos, ver recomendaciones, consultar su carrito, "
    "responder preguntas frecuentes y crear tickets de soporte cuando haga falta. "
    "Usa las herramientas disponibles cuando la pregunta lo requiera, en vez de inventar información. "
    "Responde siempre en español, de forma breve y amigable."
)


class OpenAIClient:
    def __init__(self, api_key: str | None = None, model: str | None = None):
        self._api_key = api_key or settings.openai_api_key
        self._model = model or settings.openai_model
        self._client: OpenAI | None = None

    @property
    def client(self) -> OpenAI:
        if self._client is None:
            self._client = OpenAI(api_key=self._api_key)
        return self._client

    def chat(self, messages: list[dict]) -> "ChatCompletionMessage":
        full_messages = [{"role": "system", "content": SYSTEM_PROMPT}, *messages]
        response = self.client.chat.completions.create(
            model=self._model,
            messages=full_messages,
            tools=TOOLS,
            tool_choice="auto",
        )
        return response.choices[0].message
