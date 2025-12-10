from datetime import timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.db.session import get_db
from app.models.domain import User
from app.schemas.domain import Token, User as UserSchema, UserCreate

router = APIRouter(prefix="/auth", tags=["auth"])


async def _get_user_by_identifier(db: AsyncSession, identifier: str) -> User | None:
    result = await db.execute(
        select(User).where(or_(User.username == identifier, User.email == identifier))
    )
    return result.scalar_one_or_none()


from app.services.email_service import email_service

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)) -> Token:
    existing = await db.execute(
        select(User).where(or_(User.email == user_in.email, User.username == user_in.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or username already exists",
        )

    user = User(
        id=uuid4(),
        email=user_in.email,
        username=user_in.username,
        name=user_in.name,
        avatar_url=user_in.avatar_url,
        department=user_in.department,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Send welcome email
    await email_service.send_welcome_email(
        user_email=user.email,
        user_name=user.name
    )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(user.id, expires_delta=access_token_expires)
    return Token(access_token=access_token, token_type="bearer", user=user)  # type: ignore[arg-type]


@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> Token:
    user = await _get_user_by_identifier(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(user.id, expires_delta=access_token_expires)
    return Token(access_token=access_token, token_type="bearer", user=user)  # type: ignore[arg-type]


@router.get("/me", response_model=UserSchema)
async def read_users_me(current_user: User = Depends(get_current_user)) -> UserSchema:
    return current_user
