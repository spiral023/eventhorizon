from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from typing import Any

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.domain import User, Event, EventParticipant, Vote, DateOption, DateResponse, EventPhase
from app.schemas.domain import User as UserSchema, UserUpdate, UserStats

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
