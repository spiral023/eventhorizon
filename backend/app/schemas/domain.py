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
    first_name: str
    last_name: str
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    location: Optional[str] = None
    birthday: Optional[datetime] = None
    bio: Optional[str] = None
    hobbies: Optional[List[str]] = None
    activity_preferences: Optional[Any] = None
    dietary_restrictions: Optional[List[str]] = None
    allergies: Optional[List[str]] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseSchema):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    location: Optional[str] = None
    birthday: Optional[datetime] = None
    bio: Optional[str] = None
    hobbies: Optional[List[str]] = None
    activity_preferences: Optional[Any] = None
    dietary_restrictions: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    avatar_url: Optional[str] = None

class User(UserBase):
    id: UUID
    is_active: bool = True
    created_at: datetime

    @computed_field
    @property
    def name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class AvatarUploadRequest(BaseSchema):
    content_type: str
    file_size: int

class AvatarUploadResponse(BaseSchema):
    upload_url: str
    public_url: str
    upload_key: str

class AvatarProcessRequest(BaseSchema):
    upload_key: str
    output_format: Optional[str] = None

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

class RoomUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None

# --- Activity ---
class ActivityBase(BaseSchema):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    title: str
    category: str
    tags: Optional[List[str]] = []
    location_region: str
    location_city: Optional[str] = None
    address: Optional[str] = Field(None, validation_alias="location_address", serialization_alias="address")
    
    est_price_pp: Optional[float] = Field(None, validation_alias="est_price_per_person", serialization_alias="est_price_pp")
    price_comment: Optional[str] = None
    
    accessibility_flags: Optional[List[str]] = []
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
    
    external_rating: Optional[float] = None
    primary_goal: Optional[str] = None
    
    travel_time_from_office_minutes: Optional[int] = None
    travel_time_from_office_minutes_walking: Optional[int] = None
    
    website: Optional[str] = None
    reservation_url: Optional[str] = None
    menu_url: Optional[str] = None
    provider: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    max_capacity: Optional[int] = None
    outdoor_seating: Optional[bool] = False
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
    slug: str
    created_at: datetime
    favorites_count: int = 0
    favorites_in_room_count: int = 0

# --- EventParticipant ---
class EventParticipant(BaseSchema):
    event_id: UUID
    user_id: UUID
    is_organizer: bool = False
    has_voted: bool = False
    date_response: Optional[str] = None
    user: Optional["User"] = None

    @computed_field
    @property
    def user_name(self) -> Optional[str]:
        return self.user.name if self.user else None

    @computed_field
    @property
    def avatar_url(self) -> Optional[str]:
        return self.user.avatar_url if self.user else None

# --- Vote ---
class Vote(BaseSchema):
    event_id: UUID
    activity_id: UUID
    user_id: UUID
    vote: str
    voted_at: datetime
    user_name: Optional[str] = None

# --- Date Scheduling ---
class DateResponseCreate(BaseSchema):
    response: str
    is_priority: bool = False
    contribution: Optional[float] = 0.0
    note: Optional[str] = None

class DateResponse(BaseSchema):
    date_option_id: UUID
    user_id: UUID
    response: str
    is_priority: bool = False
    contribution: float = 0.0
    note: Optional[str] = None
    user_name: Optional[str] = None # Hydrated at runtime
    user_avatar: Optional[str] = None # Hydrated at runtime

class DateOptionCreate(BaseSchema):
    date: datetime
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class DateOption(BaseSchema):
    id: UUID
    event_id: UUID
    date: datetime
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    responses: List[DateResponse] = []

# --- Actions ---
class VoteCreate(BaseSchema):
    activity_id: UUID
    vote: str 

class PhaseUpdate(BaseSchema):
    phase: str

class SelectActivity(BaseSchema):
    activity_id: UUID

class FinalizeDate(BaseSchema):
    date_option_id: UUID

class UserStats(BaseSchema):
    upcoming_events_count: int
    open_votes_count: int

# --- Event --- (Updated)
class EventBase(BaseSchema):
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    phase: str = "proposal"
    time_window: Optional[Any] = None
    budget_amount: Optional[float] = None
    location_region: Optional[str] = None
    budget_type: Optional[str] = "per_person"
    participant_count_estimate: Optional[int] = None
    proposed_activity_ids: Optional[List[UUID]] = Field(default_factory=list)
    excluded_activity_ids: Optional[List[UUID]] = Field(default_factory=list)

class EventCreate(EventBase):
    # room_id is passed in URL usually
    voting_deadline: Optional[datetime] = None

class Event(EventBase):
    id: UUID
    room_id: UUID
    short_code: str
    created_by_user_id: Optional[UUID] = None
    created_at: datetime
    voting_deadline: Optional[datetime] = None
    participants: List[EventParticipant] = [] 
    activity_votes: List["Vote"] = Field(default=[], validation_alias="votes", serialization_alias="activity_votes")
    date_options: List[DateOption] = []
    chosen_activity_id: Optional[UUID] = None
    final_date_option_id: Optional[UUID] = None

# --- Comments ---
class EventCommentCreate(BaseSchema):
    content: str
    phase: str

class EventComment(BaseSchema):
    id: UUID
    event_id: UUID
    user_id: UUID
    content: str
    phase: str
    created_at: datetime
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None

# --- Activity Comments ---
class ActivityCommentCreate(BaseSchema):
    content: str

class ActivityComment(BaseSchema):
    id: UUID
    activity_id: UUID
    user_id: UUID
    content: str
    created_at: datetime
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None

# --- Booking ---
class BookingRequest(BaseSchema):
    activity_id: UUID
    participant_count: int
    requested_date: datetime
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    notes: Optional[str] = None
    contact_name: str
    contact_email: str
    contact_phone: Optional[str] = None

# --- Search ---
class SearchResult(BaseSchema):
    activities: List[Activity] = []
    rooms: List[Room] = []
    events: List[Event] = []
    users: List[User] = []
