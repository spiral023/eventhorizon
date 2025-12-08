from typing import List, Optional, Any, Literal
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

# Import enums from models or re-define if you prefer decoupling
# For simplicity, I'll re-define strings or use simple types, but strictly they should match.
# To keep it clean, I will use string literals for Enums in Pydantic for now.

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
    created_by_user_id: UUID
    created_at: datetime
    member_count: Optional[int] = 0 # Computed field often

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
    coordinates: Optional[List[float]] = None # [lat, lng]

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

class EventCreate(EventBase):
    room_id: UUID

class Event(EventBase):
    id: UUID
    room_id: UUID
    created_by_user_id: UUID
    created_at: datetime
    voting_deadline: Optional[datetime] = None

# --- Generic API Responses ---
class PaginatedResponse(BaseSchema):
    items: List[Any]
    total: int
    page: int
    page_size: int
