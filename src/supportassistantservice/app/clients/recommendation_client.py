import grpc

from app.core.config import settings
from app.proto import demo_pb2, demo_pb2_grpc


class RecommendationClient:
    def __init__(self, address: str | None = None, timeout: float = 3.0):
        self._address = address or settings.recommendation_addr
        self._timeout = timeout

    def list_recommendations(self, user_id: str, product_ids: list[str]) -> list[str]:
        if not self._address:
            return []
        try:
            with grpc.insecure_channel(self._address) as channel:
                stub = demo_pb2_grpc.RecommendationServiceStub(channel)
                request = demo_pb2.ListRecommendationsRequest(user_id=user_id, product_ids=product_ids)
                response = stub.ListRecommendations(request, timeout=self._timeout)
                return list(response.product_ids)
        except grpc.RpcError:
            return []
