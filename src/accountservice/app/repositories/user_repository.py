from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.role import Role, UserRole
from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email))

    def get_by_id(self, user_id: str) -> User | None:
        return self.db.get(User, user_id)

    def create(self, user: User, role_names: list[str]) -> User:
        self.db.add(user)
        self.db.flush()
        for name in role_names:
            role = self.db.scalar(select(Role).where(Role.name == name))
            if role is None:
                role = Role(name=name)
                self.db.add(role)
                self.db.flush()
            self.db.add(UserRole(user_id=user.user_id, role_id=role.role_id))
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_role_names(self, user: User) -> list[str]:
        return [ur.role.name for ur in user.roles]

    def ensure_default_roles(self) -> None:
        for name in ("customer", "support_agent", "admin"):
            if self.db.scalar(select(Role).where(Role.name == name)) is None:
                self.db.add(Role(name=name))
        self.db.commit()
