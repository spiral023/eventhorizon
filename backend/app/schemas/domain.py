from typing import List, Optional, Any, Literal
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, computed_field

# --- Base Schema ---
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# --- User ---
class UserBase(BaseSchema):
    email: str
    username: str
    name: str
    avatar_url: Optional[str] = None
    department: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseSchema):
    name: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None

class User(UserBase):
    id: UUID
    is_active: bool = True
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

# --- Room ---
class RoomBase(BaseSchema):
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None

class RoomCreate(RoomBase):
    pass

class Room(RoomBase):
    id: UUID
    invite_code: str
    created_by_user_id: Optional[UUID] = None # Optional for now if no auth
    created_at: datetime
    member_count: Optional[int] = 0

# --- Activity ---
class ActivityBase(BaseSchema):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    title: str
    category: str
    tags: List[str] = []
    location_region: str
    location_city: Optional[str] = None
    address: Optional[str] = Field(None, validation_alias="location_address", serialization_alias="address")
    
    est_price_pp: Optional[float] = Field(None, validation_alias="est_price_per_person", serialization_alias="est_price_pp")
    price_comment: Optional[str] = None
    
    accessibility_flags: List[str] = []
    weather_dependent: bool = False
    
    image_url: Optional[str] = None
    description: Optional[str] = ""
    short_description: str
    long_description: Optional[str] = None
    
    season: Optional[str] = "all_year"
    
    physical_intensity: Optional[int] = None
    mental_challenge: Optional[int] = None
    social_interaction_level: Optional[int] = None
    competition_level: Optional[int] = None
    risk_level: Optional[str] = "low"
    
    external_rating: Optional[float] = None
    primary_goal: Optional[str] = None
    
    travel_time_from_office_minutes: Optional[int] = None
    travel_time_from_office_minutes_walking: Optional[int] = None
    
    website: Optional[str] = None
    provider: Optional[str] = None
    phone: Optional[str] = Field(None, validation_alias="contact_phone", serialization_alias="phone")
    email: Optional[str] = Field(None, validation_alias="contact_email", serialization_alias="email")
    
    typical_duration_hours: Optional[float] = None
    recommended_group_size_min: Optional[int] = Field(None, validation_alias="group_size_min", serialization_alias="recommended_group_size_min")
    recommended_group_size_max: Optional[int] = Field(None, validation_alias="group_size_max", serialization_alias="recommended_group_size_max")

    coordinates: Optional[List[float]] = None

class ActivityCreate(ActivityBase):
    pass

class Activity(ActivityBase):
    id: UUID
    created_at: datetime
    favorites_count: int = 0

# --- Event ---
class EventBase(BaseSchema):
    name: str
    description: Optional[str] = None
    phase: str = "proposal"
    time_window: Optional[Any] = None
    budget_amount: Optional[float] = None
    location_region: Optional[str] = None
    budget_type: Optional[str] = "per_person"
    proposed_activity_ids: Optional[List[UUID]] = Field(default_factory=list)
    excluded_activity_ids: Optional[List[UUID]] = Field(default_factory=list)

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
    activity_votes: List["Vote"] = Field(default=[], validation_alias="votes", serialization_alias="activity_votes")
    date_options: List[Any] = []

# --- Vote ---
class Vote(BaseSchema):
    event_id: UUID
    activity_id: UUID
    user_id: UUID
    vote: str
    voted_at: datetime
    user_name: Optional[str] = None

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
