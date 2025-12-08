from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.models.domain import Activity, Room, Event
from app.schemas.domain import Activity as ActivitySchema, Room as RoomSchema, Event as EventSchema

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok"}

# --- Activities ---
@router.get("/activities", response_model=List[ActivitySchema])
async def get_activities(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Activity).offset(skip).limit(limit))
    return result.scalars().all()

# --- Rooms ---
@router.get("/rooms", response_model=List[RoomSchema])
async def get_rooms(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Room).offset(skip).limit(limit))
    return result.scalars().all()

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

# --- Events ---
@router.get("/events/{event_id}", response_model=EventSchema)
async def get_event(event_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
