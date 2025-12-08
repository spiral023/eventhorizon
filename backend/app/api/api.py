from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from uuid import UUID, uuid4
from datetime import datetime

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.domain import Activity, Room, Event, Vote, DateOption, DateResponse, EventParticipant, User
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
    return result.scalars().all()

@router.get("/activities/{activity_id}", response_model=ActivitySchema)
async def get_activity(activity_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return activity

# --- Rooms ---
@router.get("/rooms", response_model=List[RoomSchema])
async def get_rooms(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Room).offset(skip).limit(limit))
    return result.scalars().all()

@router.post("/rooms", response_model=RoomSchema)
async def create_room(room_in: RoomCreate, db: AsyncSession = Depends(get_db)):
    room = Room(**room_in.model_dump(), id=uuid4(), created_at=datetime.utcnow())
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
    result = await db.execute(select(Event).where(Event.room_id == room_id))
    return result.scalars().all()

def enhance_event_with_user_names_helper(event):
    """Add user_name to votes from user relationship"""
    if hasattr(event, 'votes') and event.votes:
        for vote in event.votes:
            if hasattr(vote, 'user') and vote.user:
                vote.user_name = vote.user.name
    return event

@router.post("/rooms/{room_id}/events", response_model=EventSchema)
async def create_event(room_id: UUID, event_in: EventCreate, db: AsyncSession = Depends(get_db)):
    # Basic impl
    event = Event(
        **event_in.model_dump(),
        id=uuid4(),
        room_id=room_id,
        created_at=datetime.utcnow()
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event

# --- Events ---
@router.get("/events/{event_id}", response_model=EventSchema)
async def get_event(event_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event = enhance_event_with_user_names_helper(event)
    return event

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
async def vote_on_activity(event_id: UUID, vote_in: VoteCreate, db: AsyncSession = Depends(get_db)):
    from app.models.domain import User, Vote as VoteModel

    # Get or create a mock user for now (in production, this would come from auth token)
    user_result = await db.execute(
        select(User).where(User.email == "max.mustermann@firma.at")
    )
    user = user_result.scalar_one_or_none()

    if not user:
        # Create mock user if doesn't exist
        from app.models.domain import User as UserModel
        user = UserModel(
            id=uuid4(),
            email="max.mustermann@firma.at",
            username="max",
            name="Max Mustermann",
            hashed_password="mock_password",  # In production, this would be properly hashed
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Check if vote already exists
    existing_vote_result = await db.execute(
        select(VoteModel).where(
            VoteModel.event_id == event_id,
            VoteModel.activity_id == vote_in.activity_id,
            VoteModel.user_id == user.id
        )
    )
    existing_vote = existing_vote_result.scalar_one_or_none()

    if existing_vote:
        # Update existing vote
        existing_vote.vote = vote_in.vote
        existing_vote.voted_at = datetime.utcnow()
    else:
        # Create new vote
        new_vote = VoteModel(
            event_id=event_id,
            activity_id=vote_in.activity_id,
            user_id=user.id,
            vote=vote_in.vote,
            voted_at=datetime.utcnow()
        )
        db.add(new_vote)

    await db.commit()

    # Return the updated event
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Add user names to votes
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
