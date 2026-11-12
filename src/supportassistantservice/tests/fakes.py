import json


class FakeToolCallFunction:
    def __init__(self, name: str, arguments: dict):
        self.name = name
        self.arguments = json.dumps(arguments)


class FakeToolCall:
    def __init__(self, call_id: str, name: str, arguments: dict):
        self.id = call_id
        self.function = FakeToolCallFunction(name, arguments)

    def model_dump(self) -> dict:
        return {
            "id": self.id,
            "type": "function",
            "function": {"name": self.function.name, "arguments": self.function.arguments},
        }


class FakeMessage:
    def __init__(self, content: str | None = None, tool_calls: list | None = None):
        self.content = content
        self.tool_calls = tool_calls


class FakeOpenAIClient:
    def __init__(self, responses: list[FakeMessage]):
        self._responses = list(responses)

    def chat(self, messages: list[dict], context: str | None = None) -> FakeMessage:
        self.last_messages = messages
        self.last_context = context
        return self._responses.pop(0)


CATALOG = [
    ("OLJCESPC7Z", "Sunglasses", "19.99", ["accessories"], "Add a modern touch to your outfits with these sleek aviator sunglasses."),
    ("66VCHSJNUP", "Tank Top", "18.99", ["clothing", "tops"], "Perfectly cropped cotton tank, with a scooped neckline."),
    ("1YMWWN1N4O", "Watch", "109.99", ["accessories"], "This gold-tone stainless steel watch will work with most of your outfits."),
    ("L9ECAV7KIM", "Loafers", "89.99", ["footwear"], "A neat addition to your summer wardrobe."),
    ("2ZYFJ3GM2N", "Hairdryer", "24.99", ["hair", "beauty"], "This lightweight hairdryer has 3 heat and speed settings."),
    ("0PUK6V6EV0", "Candle Holder", "18.99", ["decor", "home"], "This small but intricate candle holder is an excellent gift."),
    ("LS4PSXUNUM", "Salt & Pepper Shakers", "18.49", ["kitchen"], "Add some flavor to your kitchen."),
    ("9SIQT8TOJO", "Bamboo Glass Jar", "5.49", ["kitchen"], "This bamboo glass jar can hold 57 oz (1.7 l)."),
    ("6E92ZMYYFZ", "Mug", "8.99", ["kitchen"], "A simple mug with a mustard interior."),
]


class FakeProductCatalogClient:
    def __init__(self):
        self.calls = 0

    def list_products(self) -> list[dict]:
        self.calls += 1
        return [
            {"id": i, "name": n, "description": d, "picture": "", "price_usd": p, "categories": c}
            for i, n, p, c, d in CATALOG
        ]


class FakeRecommendationClient:
    def __init__(self, product_ids: list[str]):
        self.product_ids = product_ids

    def list_recommendations(self, user_id: str, product_ids: list[str]) -> list[str]:
        return self.product_ids


class FakeCartClient:
    def __init__(self):
        self.carts: dict[str, dict[str, int]] = {}

    def get_cart(self, user_id: str) -> list[dict]:
        return [{"product_id": pid, "quantity": q} for pid, q in self.carts.get(user_id, {}).items()]

    def add_item(self, user_id: str, product_id: str, quantity: int) -> bool:
        cart = self.carts.setdefault(user_id, {})
        cart[product_id] = cart.get(product_id, 0) + quantity
        return True
