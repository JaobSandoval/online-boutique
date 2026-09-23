from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.routers.deps import CurrentUser, get_current_user
from app.schemas.auth import UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def read_profile(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return AuthService(db).get_profile(current_user.user_id)
