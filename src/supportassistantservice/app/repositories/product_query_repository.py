from sqlalchemy.orm import Session

from app.models.product_query import ProductQueryLog, ProductQueryResult


class ProductQueryRepository:
    def __init__(self, db: Session):
        self.db = db

    def log_query(self, message_id: str, query_text: str, product_ids: list[str]) -> ProductQueryLog:
        query = ProductQueryLog(message_id=message_id, query_text=query_text)
        self.db.add(query)
        self.db.flush()
        for rank, product_id in enumerate(product_ids, start=1):
            self.db.add(ProductQueryResult(query_id=query.query_id, product_id=product_id, rank=rank))
        self.db.commit()
        self.db.refresh(query)
        return query
