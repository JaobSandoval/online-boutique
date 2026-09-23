import grpc

from app.core.config import settings
from app.proto import demo_pb2, demo_pb2_grpc


class CartClient:
    def __init__(self, address: str | None = None, timeout: float = 3.0):
        self._address = address or settings.cart_addr
        self._timeout = timeout

    def get_cart(self, user_id: str) -> list[dict]:
        if not self._address:
            return []
        try:
            with grpc.insecure_channel(self._address) as channel:
                stub = demo_pb2_grpc.CartServiceStub(channel)
                cart = stub.GetCart(demo_pb2.GetCartRequest(user_id=user_id), timeout=self._timeout)
                return [{"product_id": item.product_id, "quantity": item.quantity} for item in cart.items]
        except grpc.RpcError:
            return []
