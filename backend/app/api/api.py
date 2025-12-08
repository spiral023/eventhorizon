from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from uuid import UUID, uuid4
from datetime import datetime

from app.db.session import get_db
from app.models.domain import Activity, Room, Event, Vote, DateOption, DateResponse, EventParticipant
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

@router.get("/rooms/{room_id}/events", response_model=List[EventSchema])
async def get_room_events(room_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.room_id == room_id))
    return result.scalars().all()

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
    # Mock impl: just update the event object logic would be complex here (Upsert Vote)
    # For MVP Phase 3 we assume "Fire and Forget" or simple insert
    # In real world: check if user already voted, update existing or insert new.
    # user_id would come from Auth token.
    # Here we just return the event to satisfy the frontend contract
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
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
