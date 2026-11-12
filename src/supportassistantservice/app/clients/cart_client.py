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

    def add_item(self, user_id: str, product_id: str, quantity: int) -> bool:
        if not self._address or not user_id:
            return False
        try:
            with grpc.insecure_channel(self._address) as channel:
                stub = demo_pb2_grpc.CartServiceStub(channel)
                request = demo_pb2.AddItemRequest(
                    user_id=user_id, item=demo_pb2.CartItem(product_id=product_id, quantity=quantity)
                )
                stub.AddItem(request, timeout=self._timeout)
                return True
        except grpc.RpcError:
            return False
