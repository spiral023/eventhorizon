from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from typing import Any, List

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.domain import User, Event, EventParticipant, Vote, DateOption, DateResponse, EventPhase
from app.schemas.domain import (
    User as UserSchema,
    UserUpdate,
    UserStats,
    Event as EventSchema,
    AvatarUploadRequest,
    AvatarUploadResponse,
    AvatarProcessRequest,
)
from app.services.avatar_service import generate_avatar_upload_url, process_avatar_upload

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me/stats", response_model=UserStats)
async def get_user_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get statistics for the current user:
    - upcoming_events_count: Number of active events the user is participating in.
    - open_votes_count: Number of events where the user needs to vote or respond to dates.
    """
    # Get all events where user is a participant
    result = await db.execute(
        select(Event)
        .join(EventParticipant, Event.id == EventParticipant.event_id)
        .where(EventParticipant.user_id == current_user.id)
    )
    events = result.scalars().all()
    
    upcoming_count = 0
    open_votes_count = 0
    
    for event in events:
        # Count as upcoming if it's not in the past (simplified: all events user is part of are considered "active/upcoming" for now, 
        # unless we want to filter out completed ones explicitly. Let's assume Info phase is still "upcoming" until the date passes.)
        # For now, just count all assigned events.
        upcoming_count += 1
            
        # Check for open votes/actions
        action_needed = False
        
        if event.phase == EventPhase.voting:
            # Check if user has voted on all proposed activities
            votes_res = await db.execute(
                select(func.count())
                .select_from(Vote)
                .where(Vote.event_id == event.id, Vote.user_id == current_user.id)
            )
            user_votes = votes_res.scalar() or 0
            
            # Count proposed activities
            total_activities = len(event.proposed_activity_ids) if event.proposed_activity_ids else 0
            
            if total_activities > 0 and user_votes < total_activities:
                action_needed = True
                
        elif event.phase == EventPhase.scheduling:
            # Check if user has responded to all date options
            dopt_res = await db.execute(
                select(func.count())
                .select_from(DateOption)
                .where(DateOption.event_id == event.id)
            )
            total_dates = dopt_res.scalar() or 0
            
            if total_dates > 0:
                resp_res = await db.execute(
                    select(func.count())
                    .select_from(DateResponse)
                    .join(DateOption, DateResponse.date_option_id == DateOption.id)
                    .where(DateOption.event_id == event.id, DateResponse.user_id == current_user.id)
                )
                user_responses = resp_res.scalar() or 0
                
                if user_responses < total_dates:
                    action_needed = True
        
        if action_needed:
            open_votes_count += 1
            
    return {"upcoming_events_count": upcoming_count, "open_votes_count": open_votes_count}


@router.get("/me/events", response_model=List[EventSchema])
async def get_user_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get all events the current user is participating in.
    """
    from app.models.domain import Event
    from sqlalchemy.orm import selectinload
    from app.api.helpers import enhance_event_full

    result = await db.execute(
        select(Event)
        .join(EventParticipant, Event.id == EventParticipant.event_id)
        .where(EventParticipant.user_id == current_user.id)
        .options(
            selectinload(Event.votes).selectinload(Vote.user),
            selectinload(Event.date_options).selectinload(DateOption.responses).selectinload(DateResponse.user),
            selectinload(Event.participants).selectinload(EventParticipant.user),
        )
        .order_by(Event.created_at.desc())
    )
    events = result.scalars().all()
    return [enhance_event_full(e) for e in events]


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


@router.post("/me/avatar/upload-url", response_model=AvatarUploadResponse)
async def create_avatar_upload_url(
    payload: AvatarUploadRequest,
    current_user: User = Depends(get_current_user),
) -> AvatarUploadResponse:
    upload_url, public_url, upload_key = generate_avatar_upload_url(
        user_id=current_user.id,
        content_type=payload.content_type,
        file_size=payload.file_size,
    )
    return AvatarUploadResponse(upload_url=upload_url, public_url=public_url, upload_key=upload_key)


@router.post("/me/avatar/process", response_model=UserSchema)
async def process_avatar(
    payload: AvatarProcessRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserSchema:
    processed_url = process_avatar_upload(
        user_id=current_user.id,
        upload_key=payload.upload_key,
        desired_format=payload.output_format,
    )
    current_user.avatar_url = processed_url
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user
