import json
import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-secret"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.services.catalog_service import CatalogService  # noqa: E402
from app.services.chat_service import ChatService  # noqa: E402
from tests.fakes import (  # noqa: E402
    FakeCartClient,
    FakeMessage,
    FakeOpenAIClient,
    FakeProductCatalogClient,
    FakeRecommendationClient,
    FakeToolCall,
)


@pytest.fixture(autouse=True)
def _app_lifespan():
    with TestClient(app):
        yield


@pytest.fixture
def catalog():
    return CatalogService(FakeProductCatalogClient())


def _names(products):
    return [p["name"] for p in products]


@pytest.mark.parametrize(
    "query, expected",
    [
        ("gafas de sol", "Sunglasses"),
        ("busco un reloj", "Watch"),
        ("una taza para café", "Mug"),
        ("zapatos", "Loafers"),
        ("secador de pelo", "Hairdryer"),
        ("algo para decorar la casa", "Candle Holder"),
        ("salero", "Salt & Pepper Shakers"),
        ("frasco de bambú", "Bamboo Glass Jar"),
        ("mug", "Mug"),
        ("un regalo", "Candle Holder"),
    ],
)
def test_spanish_search_finds_real_products(catalog, query, expected):
    assert expected in _names(catalog.search(query))


def test_best_match_is_ranked_first(catalog):
    assert catalog.search("reloj")[0]["name"] == "Watch"


def test_search_returns_price_and_link(catalog):
    product = catalog.search("reloj")[0]
    assert product["price_usd"] == "109.99"
    assert product["url"] == "/product/1YMWWN1N4O"


def test_unrelated_query_returns_nothing(catalog):
    assert catalog.search("televisor") == []


def test_list_products_by_spanish_category(catalog):
    assert set(_names(catalog.list_products("cocina"))) == {"Salt & Pepper Shakers", "Bamboo Glass Jar", "Mug"}
    assert len(catalog.list_products()) == 9


def test_catalog_is_cached():
    client = FakeProductCatalogClient()
    catalog = CatalogService(client)
    catalog.list_products()
    catalog.search("taza")
    catalog.get("6E92ZMYYFZ")
    assert client.calls == 1


def test_context_summary_lists_products_for_the_llm(catalog):
    summary = catalog.context_summary()
    assert "Watch (id: 1YMWWN1N4O) — 109.99 USD" in summary
    assert "/product/6E92ZMYYFZ" in summary


# --- Herramientas dentro del ChatService -----------------------------------------


def _service(responses, catalog, cart=None, recommended=None):
    return ChatService(
        SessionLocal(),
        openai_client=FakeOpenAIClient(responses),
        catalog=catalog,
        cart_client=cart or FakeCartClient(),
        recommendation_client=FakeRecommendationClient(recommended or []),
    )


def _tool_result(service, tool_name):
    """Devuelve el JSON que la herramienta le pasó al LLM."""
    for message in service.openai.last_messages:
        if message["role"] == "tool":
            return json.loads(message["content"])
    raise AssertionError(f"no se ejecutó {tool_name}")


def test_llm_receives_catalog_as_context(catalog):
    service = _service([FakeMessage(content="Te recomiendo la taza Mug.")], catalog)
    service.handle_message("cat-1", "user-cat", "quiero ideas de regalo")
    assert "Mug (id: 6E92ZMYYFZ)" in service.openai.last_context


def test_search_products_tool_uses_spanish_search(catalog):
    service = _service(
        [
            FakeMessage(tool_calls=[FakeToolCall("c1", "search_products", {"query": "gafas de sol"})]),
            FakeMessage(content="Tenemos Sunglasses a 19.99 USD."),
        ],
        catalog,
    )
    service.handle_message("cat-2", "user-cat", "¿tienen gafas de sol?")
    result = _tool_result(service, "search_products")
    assert result["products"][0]["name"] == "Sunglasses"


def test_recommendations_are_returned_with_details(catalog):
    service = _service(
        [
            FakeMessage(tool_calls=[FakeToolCall("c1", "get_recommendations", {})]),
            FakeMessage(content="Te sugiero el reloj."),
        ],
        catalog,
        recommended=["1YMWWN1N4O", "unknown-id"],
    )
    service.handle_message("cat-3", "user-cat", "recomiéndame algo")
    result = _tool_result(service, "get_recommendations")
    assert _names(result["products"]) == ["Watch"]


def test_add_to_cart_and_cart_summary(catalog):
    cart = FakeCartClient()
    service = _service(
        [
            FakeMessage(tool_calls=[FakeToolCall("c1", "add_to_cart", {"product_id": "6E92ZMYYFZ", "quantity": 2})]),
            FakeMessage(content="Listo, agregué 2 tazas."),
        ],
        catalog,
        cart=cart,
    )
    service.handle_message("cat-4", "user-cart", "agrega 2 tazas al carrito")
    assert cart.carts["user-cart"] == {"6E92ZMYYFZ": 2}

    summary = service._cart_summary("user-cart")
    assert summary["items"][0]["name"] == "Mug"
    assert summary["total_usd"] == "17.98"


def test_add_to_cart_rejects_unknown_product(catalog):
    cart = FakeCartClient()
    service = _service([], catalog, cart=cart)
    result = service._execute_tool("add_to_cart", {"product_id": "nope"}, "user-x", "conv")
    assert result["ok"] is False
    assert cart.carts == {}
