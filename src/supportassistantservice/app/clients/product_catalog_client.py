import grpc

from app.core.config import settings
from app.proto import demo_pb2, demo_pb2_grpc


class ProductCatalogClient:
    def __init__(self, address: str | None = None, timeout: float = 3.0):
        self._address = address or settings.product_catalog_addr
        self._timeout = timeout

    def search(self, query: str) -> list[dict]:
        if not self._address:
            return []
        try:
            with grpc.insecure_channel(self._address) as channel:
                stub = demo_pb2_grpc.ProductCatalogServiceStub(channel)
                response = stub.SearchProducts(demo_pb2.SearchProductsRequest(query=query), timeout=self._timeout)
                return [self._to_dict(p) for p in response.results]
        except grpc.RpcError:
            return []

    def list_products(self) -> list[dict]:
        if not self._address:
            return []
        try:
            with grpc.insecure_channel(self._address) as channel:
                stub = demo_pb2_grpc.ProductCatalogServiceStub(channel)
                response = stub.ListProducts(demo_pb2.Empty(), timeout=self._timeout)
                return [self._to_dict(p) for p in response.products]
        except grpc.RpcError:
            return []

    def get_product(self, product_id: str) -> dict | None:
        if not self._address:
            return None
        try:
            with grpc.insecure_channel(self._address) as channel:
                stub = demo_pb2_grpc.ProductCatalogServiceStub(channel)
                product = stub.GetProduct(demo_pb2.GetProductRequest(id=product_id), timeout=self._timeout)
                return self._to_dict(product)
        except grpc.RpcError:
            return None

    @staticmethod
    def _to_dict(product) -> dict:
        return {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "picture": product.picture,
            "price_usd": f"{product.price_usd.units}.{product.price_usd.nanos // 10_000_000:02d}",
            "categories": list(product.categories),
        }
