from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from typing import Any, List

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.domain import User, Event, EventParticipant, Vote, DateOption, DateResponse, EventPhase, RoomMember
from app.schemas.domain import (
    User as UserSchema,
    UserUpdate,
    UserStats,
    Event as EventSchema,
    AvatarUploadRequest,
    AvatarUploadResponse,
    AvatarProcessRequest,
    BirthdayPageResponse,
    BirthdayUser,
    BirthdayStats,
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
    
    upcoming_count = len(events)
    open_votes_count = 0

    if not events:
        return {"upcoming_events_count": 0, "open_votes_count": 0}
    
    event_ids = [e.id for e in events]

    # Batch fetch: User votes per event
    votes_result = await db.execute(
        select(Vote.event_id, func.count(Vote.activity_id))
        .where(Vote.event_id.in_(event_ids), Vote.user_id == current_user.id)
        .group_by(Vote.event_id)
    )
    user_votes_map = {row[0]: row[1] for row in votes_result.all()}

    # Batch fetch: Total date options per event
    dopt_result = await db.execute(
        select(DateOption.event_id, func.count(DateOption.id))
        .where(DateOption.event_id.in_(event_ids))
        .group_by(DateOption.event_id)
    )
    event_dopt_count_map = {row[0]: row[1] for row in dopt_result.all()}

    # Batch fetch: User date responses per event
    # We join DateResponse -> DateOption to group by DateOption.event_id
    resp_result = await db.execute(
        select(DateOption.event_id, func.count(DateResponse.date_option_id))
        .select_from(DateResponse)
        .join(DateOption, DateResponse.date_option_id == DateOption.id)
        .where(DateOption.event_id.in_(event_ids), DateResponse.user_id == current_user.id)
        .group_by(DateOption.event_id)
    )
    user_resp_map = {row[0]: row[1] for row in resp_result.all()}
    
    for event in events:
        # Check for open votes/actions
        action_needed = False
        
        if event.phase == EventPhase.voting:
            # Check if user has voted on all proposed activities
            user_votes = user_votes_map.get(event.id, 0)
            
            # Count proposed activities
            total_activities = len(event.proposed_activity_ids) if event.proposed_activity_ids else 0
            
            if total_activities > 0 and user_votes < total_activities:
                action_needed = True
                
        elif event.phase == EventPhase.scheduling:
            # Check if user has responded to all date options
            total_dates = event_dopt_count_map.get(event.id, 0)
            
            if total_dates > 0:
                user_responses = user_resp_map.get(event.id, 0)
                
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

@router.get("/birthdays", response_model=BirthdayPageResponse)
async def get_birthdays(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get birthdays of all users who share a room with the current user.
    """
    # 1. Get all room IDs the current user is in
    user_rooms_query = select(RoomMember.room_id).where(RoomMember.user_id == current_user.id)
    result_rooms = await db.execute(user_rooms_query)
    room_ids = result_rooms.scalars().all()

    if not room_ids:
        return BirthdayPageResponse(
            stats=BirthdayStats(total_users=0, users_with_birthday=0, rate=0.0),
            upcoming=[],
            all=[]
        )

    # 2. Get all unique users in those rooms
    # We fetch IDs first to avoid DISTINCT on User model which contains JSON columns (no equality operator)
    user_ids_result = await db.execute(
        select(RoomMember.user_id)
        .where(RoomMember.room_id.in_(room_ids))
        .distinct()
    )
    user_ids = user_ids_result.scalars().all()

    if not user_ids:
        return BirthdayPageResponse(
            stats=BirthdayStats(total_users=0, users_with_birthday=0, rate=0.0),
            upcoming=[],
            all=[]
        )

    users_query = select(User).where(User.id.in_(user_ids))
    result_users = await db.execute(users_query)
    all_users = result_users.scalars().all()

    total_count = len(all_users)
    visible_users = []
    
    for u in all_users:
        if u.birthday and not u.is_birthday_private:
            visible_users.append(u)
            
    users_with_birthday_count = len(visible_users)
    rate = (users_with_birthday_count / total_count * 100) if total_count > 0 else 0.0

    # 3. Process birth dates
    processed_users = []
    today = datetime.utcnow().date()
    
    for u in visible_users:
        bday_date = u.birthday.date()
        
        # Calculate current age
        # Subtract 1 if current date is before birthday in current year
        age = today.year - bday_date.year - ((today.month, today.day) < (bday_date.month, bday_date.day))
        
        # Calculate next birthday
        try:
            next_bday = bday_date.replace(year=today.year)
        except ValueError:
            next_bday = bday_date.replace(year=today.year, day=28)
            if today.year % 4 == 0 and (today.year % 100 != 0 or today.year % 400 == 0):
                 next_bday = bday_date.replace(year=today.year, day=29)

        if next_bday < today:
             try:
                next_bday = bday_date.replace(year=today.year + 1)
             except ValueError:
                next_bday = bday_date.replace(year=today.year + 1, day=28)

        days_until = (next_bday - today).days
        turning_age = next_bday.year - bday_date.year

        processed_users.append(BirthdayUser(
            id=u.id,
            name=u.name,
            avatar_url=u.avatar_url,
            birthday=u.birthday,
            age=age,
            next_birthday=datetime.combine(next_bday, datetime.min.time()),
            age_turning=turning_age,
            days_until=days_until
        ))
        
    # Sort by days until
    processed_users.sort(key=lambda x: x.days_until)
    
    return BirthdayPageResponse(
        stats=BirthdayStats(
            total_users=total_count, 
            users_with_birthday=users_with_birthday_count, 
            rate=round(rate, 1)
        ),
        upcoming=processed_users[:3],
        all=processed_users
    )

