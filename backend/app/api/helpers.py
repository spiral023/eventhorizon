from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.domain import Event, RoomMember, RoomRole, User, Room, EventParticipant

import logging

logger = logging.getLogger(__name__)

async def ensure_event_participant(event: Event, user: User, db: AsyncSession) -> bool:
    """
    Ensure the user is a participant of the event.
    Returns True if user was added (requires commit), False otherwise.
    """
    result = await db.execute(
        select(EventParticipant).where(
            EventParticipant.event_id == event.id,
            EventParticipant.user_id == user.id
        )
    )
    if not result.scalar_one_or_none():
        logger.info(f"Adding user {user.id} as participant to event {event.id}")
        new_participant = EventParticipant(
            event_id=event.id,
            user_id=user.id,
            is_organizer=(event.created_by_user_id == user.id),
            has_voted=False
        )
        db.add(new_participant)
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

    # Check if user is already a member
    room_member_result = await db.execute(
        select(RoomMember).where(
            RoomMember.room_id == event.room_id,
            RoomMember.user_id == user.id
        )
    )
    if not room_member_result.scalar_one_or_none():
        new_member = RoomMember(
            room_id=event.room_id,
            user_id=user.id,
            role=RoomRole.member
        )
        db.add(new_member)
        
        # We don't update room.member_count here as it is a computed field, not a column
        return True
    
    return False

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
