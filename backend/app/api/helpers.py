from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.domain import Activity, Event, RoomMember, RoomRole, User, Room, EventParticipant

import logging

logger = logging.getLogger(__name__)

async def ensure_event_participant(event: Event, user: User, db: AsyncSession) -> bool:
    """
    Ensure the user is a participant of the event.
    Returns True if user was added (requires commit), False otherwise.
    """
    stmt = (
        insert(EventParticipant)
        .values(
            event_id=event.id,
            user_id=user.id,
            is_organizer=(event.created_by_user_id == user.id),
            has_voted=False,
        )
        .on_conflict_do_nothing(index_elements=["event_id", "user_id"])
    )
    result = await db.execute(stmt)
    if result.rowcount == 1:
        logger.info(f"Adding user {user.id} as participant to event {event.id}")
        return True
    return False

async def ensure_user_in_room(event: Event, user: User, db: AsyncSession) -> bool:
    """
    Ensure the user is a member of the room the event belongs to.
    If not, add them as a member.
    Returns True if user was added (requires commit), False otherwise.
    """
    # Fetch room to check creator and update count
    room_result = await db.execute(select(Room).where(Room.id == event.room_id))
    room = room_result.scalar_one_or_none()
    
    if not room:
        return False # Should not happen if foreign key exists

    # Check if user is the creator (implicitly a member)
    if room.created_by_user_id == user.id:
        return False

    stmt = (
        insert(RoomMember)
        .values(
            room_id=event.room_id,
            user_id=user.id,
            role=RoomRole.member,
        )
        .on_conflict_do_nothing(index_elements=["room_id", "user_id"])
    )
    result = await db.execute(stmt)
    return result.rowcount == 1

async def resolve_activity_identifier(identifier: str, db: AsyncSession) -> Activity:
    """
    Resolve activity by UUID or slug.
    Returns Activity instance or raises HTTPException if not found.
    """
    try:
        activity_id = UUID(identifier)
        result = await db.execute(select(Activity).where(Activity.id == activity_id))
        activity = result.scalar_one_or_none()
        if activity:
            return activity
    except ValueError:
        pass

    result = await db.execute(select(Activity).where(Activity.slug == identifier))
    activity = result.scalar_one_or_none()

    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    return activity


async def resolve_room_identifier(room_identifier: str, db: AsyncSession) -> Room:
    """
    Resolve a room by UUID or invite_code (case-insensitive).
    """
    is_uuid = False
    try:
        room_uuid = UUID(room_identifier)
        is_uuid = True
    except ValueError:
        pass

    query = select(Room)
    if is_uuid:
        query = query.where(Room.id == room_uuid)
    else:
        query = query.where(Room.invite_code == room_identifier.upper().strip())

    result = await db.execute(query)
    room = result.scalar_one_or_none()

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    return room


async def resolve_event_identifier(
    event_identifier: str,
    db: AsyncSession,
    options: Optional[list] = None,
) -> Event:
    """
    Resolve an event by UUID or short_code (case-insensitive).
    Options can be provided to eager-load relationships.
    """
    event_uuid = None
    try:
        event_uuid = UUID(event_identifier)
    except ValueError:
        pass

    base_query = select(Event)
    if options:
        base_query = base_query.options(*options)

    if event_uuid:
        uuid_query = base_query.where(Event.id == event_uuid)
        uuid_result = await db.execute(uuid_query)
        event = uuid_result.scalar_one_or_none()
        if event:
            return event

    short_code = event_identifier.upper().strip()
    code_query = base_query.where(Event.short_code == short_code)
    code_result = await db.execute(code_query)
    event = code_result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    return event


async def require_event_organizer(event: Event, db: AsyncSession, current_user: User) -> None:
    if event.created_by_user_id == current_user.id:
        return

    result = await db.execute(
        select(EventParticipant).where(
            EventParticipant.event_id == event.id,
            EventParticipant.user_id == current_user.id,
            EventParticipant.is_organizer.is_(True),
        )
    )
    participant = result.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=403, detail="Only event organizers can perform this action")

async def require_room_member(room: Room, user: User, db: AsyncSession) -> None:
    if room.created_by_user_id == user.id:
        return

    result = await db.execute(
        select(RoomMember).where(
            RoomMember.room_id == room.id,
            RoomMember.user_id == user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Room not found")

def enhance_event_with_user_names_helper(event: Event):
    """Add user_name to votes from user relationship"""
    if hasattr(event, 'votes') and event.votes:
        for vote in event.votes:
            if hasattr(vote, 'user') and vote.user:
                vote.user_name = vote.user.name
    return event

def enhance_event_with_dates_helper(event: Event):
    """Add user_name to date responses from user relationship"""
    if hasattr(event, 'date_options') and event.date_options:
        for date_opt in event.date_options:
            if hasattr(date_opt, 'responses') and date_opt.responses:
                for response in date_opt.responses:
                    if hasattr(response, 'user') and response.user:
                        response.user_name = response.user.name
                        response.user_avatar = response.user.avatar_url
    return event

def enhance_event_full(event: Event):
    enhance_event_with_user_names_helper(event)
    enhance_event_with_dates_helper(event)
    return event
