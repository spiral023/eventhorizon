from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, delete
from sqlalchemy.orm import selectinload
from typing import List
from uuid import UUID, uuid4
from datetime import datetime

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.domain import Activity, Room, Event, Vote, DateOption, DateResponse, EventParticipant, User, user_favorites
from app.schemas.domain import (
    Activity as ActivitySchema, Room as RoomSchema, RoomCreate, Event as EventSchema,
    EventCreate, VoteCreate, PhaseUpdate, DateResponseCreate, SelectActivity, FinalizeDate
)
from app.api.endpoints import auth, users

router = APIRouter()

# Nested routers
router.include_router(auth.router)
router.include_router(users.router)

@router.get("/health")
async def health_check():
    return {"status": "ok"}

# --- Activities ---
@router.get("/activities", response_model=List[ActivitySchema])
async def get_activities(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Activity).offset(skip).limit(limit))
    activities = result.scalars().all()

    # Attach favorites counts in bulk
    counts_result = await db.execute(
        select(user_favorites.c.activity_id, func.count().label("cnt"))
        .group_by(user_favorites.c.activity_id)
    )
    counts_map = {row.activity_id: row.cnt for row in counts_result}
    for activity in activities:
        activity.favorites_count = counts_map.get(activity.id, 0)

    return activities

@router.get("/activities/favorites", response_model=List[UUID])
async def get_user_favorites(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(user_favorites.c.activity_id).where(user_favorites.c.user_id == current_user.id)
    )
    return [row.activity_id for row in result.fetchall()]

@router.get("/activities/{activity_id}", response_model=ActivitySchema)
async def get_activity(activity_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Add favorites count
    count_result = await db.execute(
        select(func.count())
        .select_from(user_favorites)
        .where(user_favorites.c.activity_id == activity_id)
    )
    activity.favorites_count = count_result.scalar_one()

    return activity

@router.get("/activities/{activity_id}/favorite")
async def get_favorite_status(
    activity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Ensure activity exists
    activity_result = await db.execute(select(Activity).where(Activity.id == activity_id))
    if not activity_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Activity not found")

    fav_result = await db.execute(
        select(user_favorites.c.activity_id)
        .where(
            user_favorites.c.activity_id == activity_id,
            user_favorites.c.user_id == current_user.id
        )
    )
    is_favorite = fav_result.scalar_one_or_none() is not None

    count_result = await db.execute(
        select(func.count())
        .select_from(user_favorites)
        .where(user_favorites.c.activity_id == activity_id)
    )
    favorites_count = count_result.scalar_one()

    return {"is_favorite": is_favorite, "favorites_count": favorites_count}

@router.post("/activities/{activity_id}/favorite")
async def toggle_favorite_activity(
    activity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Ensure activity exists
    activity_result = await db.execute(select(Activity).where(Activity.id == activity_id))
    if not activity_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Activity not found")

    # Check if favorite exists
    existing = await db.execute(
        select(user_favorites)
        .where(
            user_favorites.c.activity_id == activity_id,
            user_favorites.c.user_id == current_user.id
        )
    )
    favorite_row = existing.first()

    if favorite_row:
        await db.execute(
            user_favorites.delete().where(
                user_favorites.c.activity_id == activity_id,
                user_favorites.c.user_id == current_user.id
            )
        )
        is_favorite = False
    else:
        await db.execute(
            user_favorites.insert().values(
                activity_id=activity_id,
                user_id=current_user.id
            )
        )
        is_favorite = True

    await db.commit()

    count_result = await db.execute(
        select(func.count())
        .select_from(user_favorites)
        .where(user_favorites.c.activity_id == activity_id)
    )
    favorites_count = count_result.scalar_one()

    return {"is_favorite": is_favorite, "favorites_count": favorites_count}

# --- Rooms ---
@router.get("/rooms", response_model=List[RoomSchema])
async def get_rooms(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Room).offset(skip).limit(limit))
    return result.scalars().all()

@router.post("/rooms", response_model=RoomSchema)
async def create_room(
    room_in: RoomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Attach the authenticated user as the creator of the room
    room = Room(
        **room_in.model_dump(),
        id=uuid4(),
        created_at=datetime.utcnow(),
        created_by_user_id=current_user.id
    )
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return room

@router.get("/rooms/{room_id}", response_model=RoomSchema)
async def get_room(room_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

@router.delete("/rooms/{room_id}")
async def delete_room(
    room_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Check if the current user is the creator of the room
    if room.created_by_user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the room creator can delete this room"
        )

    # Delete the room (cascade will handle events, members, etc.)
    await db.delete(room)
    await db.commit()

    return {"message": "Room deleted successfully"}

@router.get("/rooms/{room_id}/events", response_model=List[EventSchema])
async def get_room_events(room_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Event)
        .options(selectinload(Event.votes).selectinload(Vote.user))
        .where(Event.room_id == room_id)
    )
    events = result.scalars().all()
    return [enhance_event_with_user_names_helper(e) for e in events]

def enhance_event_with_user_names_helper(event):
    """Add user_name to votes from user relationship"""
    if hasattr(event, 'votes') and event.votes:
        for vote in event.votes:
            if hasattr(vote, 'user') and vote.user:
                vote.user_name = vote.user.name
    return event

@router.post("/rooms/{room_id}/events", response_model=EventSchema)
async def create_event(
    room_id: UUID,
    event_in: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Basic impl
    event = Event(
        **event_in.model_dump(),
        id=uuid4(),
        room_id=room_id,
        created_at=datetime.utcnow(),
        created_by_user_id=current_user.id
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event

# --- Events ---
@router.get("/events/{event_id}", response_model=EventSchema)
async def get_event(event_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Event)
        .options(selectinload(Event.votes).selectinload(Vote.user))
        .where(Event.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event = enhance_event_with_user_names_helper(event)
    return event

@router.delete("/events/{event_id}/proposed-activities/{activity_id}", response_model=EventSchema)
async def remove_proposed_activity(
    event_id: UUID,
    activity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event_result = await db.execute(
        select(Event)
        .options(selectinload(Event.votes))
        .where(Event.id == event_id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the event creator can modify proposals")

    if event.phase != "proposal":
        raise HTTPException(status_code=400, detail="Cannot remove proposals after voting has started")

    current_ids = event.proposed_activity_ids or []
    if activity_id not in current_ids:
        return event

    event.proposed_activity_ids = [aid for aid in current_ids if aid != activity_id]

    # Remove any existing votes for that activity just in case
    await db.execute(
        delete(Vote).where(Vote.event_id == event_id, Vote.activity_id == activity_id)
    )

    await db.commit()
    await db.refresh(event)

    # Hydrate votes + user names for response
    result = await db.execute(
        select(Event)
        .options(selectinload(Event.votes).selectinload(Vote.user))
        .where(Event.id == event_id)
    )
    event = result.scalar_one_or_none()
    return enhance_event_with_user_names_helper(event)

@router.delete("/events/{event_id}")
async def delete_event(
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.created_by_user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the event creator can delete this event"
        )

    await db.delete(event)
    await db.commit()
    return {"message": "Event deleted successfully"}

@router.patch("/events/{event_id}/phase", response_model=EventSchema)
async def update_event_phase(event_id: UUID, phase_in: PhaseUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.phase = phase_in.phase
    await db.commit()
    await db.refresh(event)
    return event

@router.post("/events/{event_id}/votes", response_model=EventSchema)
async def vote_on_activity(
    event_id: UUID,
    vote_in: VoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.domain import Vote as VoteModel

    # Check if vote already exists for this user/activity/event
    existing_vote_result = await db.execute(
        select(VoteModel).where(
            VoteModel.event_id == event_id,
            VoteModel.activity_id == vote_in.activity_id,
            VoteModel.user_id == current_user.id
        )
    )
    existing_vote = existing_vote_result.scalar_one_or_none()

    if existing_vote:
        existing_vote.vote = vote_in.vote
        existing_vote.voted_at = datetime.utcnow()
    else:
        new_vote = VoteModel(
            event_id=event_id,
            activity_id=vote_in.activity_id,
            user_id=current_user.id,
            vote=vote_in.vote,
            voted_at=datetime.utcnow()
        )
        db.add(new_vote)

    await db.commit()

    # Return the updated event with votes and user names hydrated
    result = await db.execute(
        select(Event)
        .options(selectinload(Event.votes).selectinload(Vote.user))
        .where(Event.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event = enhance_event_with_user_names_helper(event)

    return event 

@router.post("/events/{event_id}/date-options/{date_option_id}/response", response_model=EventSchema)
async def respond_to_date(event_id: UUID, date_option_id: UUID, response_in: DateResponseCreate, db: AsyncSession = Depends(get_db)):
    # Mock impl
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    return event

@router.post("/events/{event_id}/select-activity", response_model=EventSchema)
async def select_activity(event_id: UUID, selection: SelectActivity, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event:
        event.chosen_activity_id = selection.activity_id
        event.phase = "scheduling"
        await db.commit()
        await db.refresh(event)
    return event

@router.post("/events/{event_id}/finalize-date", response_model=EventSchema)
async def finalize_date(event_id: UUID, selection: FinalizeDate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event:
        event.final_date_option_id = selection.date_option_id
        event.phase = "info"
        await db.commit()
        await db.refresh(event)
    return event
