from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.domain import User
from app.schemas.domain import User as UserSchema, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserSchema)
async def get_profile(current_user: User = Depends(get_current_user)) -> UserSchema:
    return current_user


@router.patch("/me", response_model=UserSchema)
async def update_profile(
    updates: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserSchema:
    data = updates.model_dump(exclude_unset=True)
    for field, value in data.items():
        # Convert timezone-aware datetime to naive datetime for birthday
        if field == "birthday" and value is not None and isinstance(value, datetime):
            value = value.replace(tzinfo=None)
        setattr(current_user, field, value)
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user
