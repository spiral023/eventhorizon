from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import get_current_user
from app.schemas.domain import Token, User as UserSchema

router = APIRouter(prefix="/auth", tags=["auth"])

legacy_disabled_exception = HTTPException(
    status_code=status.HTTP_410_GONE,
    detail="Legacy auth endpoints are disabled. Use /api/auth via Better Auth.",
)


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(*args, **kwargs) -> Token:  # pragma: no cover - legacy endpoint disabled
    raise legacy_disabled_exception


@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Token:  # pragma: no cover - legacy endpoint disabled
    raise legacy_disabled_exception


@router.get("/me", response_model=UserSchema)
async def read_users_me(current_user: UserSchema = Depends(get_current_user)) -> UserSchema:
    return current_user
