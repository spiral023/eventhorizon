from typing import List, Optional, Any, Literal
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

# --- Base Schema ---
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# --- User ---
class UserBase(BaseSchema):
    email: str
    name: str
    avatar_url: Optional[str] = None
    department: Optional[str] = None

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: UUID
    created_at: datetime

# --- Room ---
class RoomBase(BaseSchema):
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None

class RoomCreate(RoomBase):
    pass

class Room(RoomBase):
    id: UUID
    created_by_user_id: Optional[UUID] = None # Optional for now if no auth
    created_at: datetime
    member_count: Optional[int] = 0

# --- Activity ---
class ActivityBase(BaseSchema):
    title: str
    category: str
    tags: List[str] = []
    location_region: str
    location_city: Optional[str] = None
    est_price_per_person: Optional[float] = None
    short_description: str
    image_url: Optional[str] = None
    coordinates: Optional[List[float]] = None

class ActivityCreate(ActivityBase):
    pass

class Activity(ActivityBase):
    id: UUID
    created_at: datetime

# --- Event ---
class EventBase(BaseSchema):
    name: str
    description: Optional[str] = None
    phase: str = "proposal"
    time_window: Optional[Any] = None
    budget_amount: Optional[float] = None
    location_region: Optional[str] = None
    budget_type: Optional[str] = "per_person"
    proposed_activity_ids: List[UUID] = []

class EventCreate(EventBase):
    # room_id is passed in URL usually
    voting_deadline: Optional[datetime] = None

class Event(EventBase):
    id: UUID
    room_id: UUID
    created_by_user_id: Optional[UUID] = None
    created_at: datetime
    voting_deadline: Optional[datetime] = None
    participants: List[Any] = [] # Simplified for now
    activity_votes: List[Any] = [] # Simplified
    date_options: List[Any] = []

# --- Actions ---
class VoteCreate(BaseSchema):
    activity_id: UUID
    vote: str 

class PhaseUpdate(BaseSchema):
    phase: str

class DateResponseCreate(BaseSchema):
    response: str
    contribution: Optional[float] = 0.0

class SelectActivity(BaseSchema):
    activity_id: UUID

class FinalizeDate(BaseSchema):
    date_option_id: UUID