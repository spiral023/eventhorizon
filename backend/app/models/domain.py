import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Float, Text, JSON, Enum as SQLEnum, Table
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
import enum

from app.db.base_class import Base

# ================= ENUMS =================

class EventPhase(str, enum.Enum):
    proposal = "proposal"
    voting = "voting"
    scheduling = "scheduling"
    info = "info"

class EventCategory(str, enum.Enum):
    action = "action"
    food = "food"
    relax = "relax"
    party = "party"
    culture = "culture"
    outdoor = "outdoor"
    creative = "creative"

class Region(str, enum.Enum):
    OOE = "OOE"
    TIR = "TIR"
    SBG = "SBG"
    STMK = "STMK"
    KTN = "KTN"
    VBG = "VBG"
    NOE = "NOE"
    WIE = "WIE"
    BGL = "BGL"

class RoomRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    member = "member"

class BudgetType(str, enum.Enum):
    total = "total"
    per_person = "per_person"

class VoteType(str, enum.Enum):
    for_ = "for"  # 'for' is reserved in Python
    against = "against"
    abstain = "abstain"

class DateResponseType(str, enum.Enum):
    yes = "yes"
    no = "no"
    maybe = "maybe"

class Season(str, enum.Enum):
    all_year = "all_year"
    spring = "spring"
    summer = "summer"
    autumn = "autumn"
    winter = "winter"

# ================= MODELS =================

# Many-to-Many for User Favorites
user_favorites = Table(
    'user_favorites',
    Base.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('user.id'), primary_key=True),
    Column('activity_id', UUID(as_uuid=True), ForeignKey('activity.id'), primary_key=True)
)

class User(Base):
    __tablename__ = "user"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    avatar_url = Column(String)
    phone = Column(String)
    department = Column(String)
    position = Column(String)
    location = Column(String)
    birthday = Column(DateTime)
    bio = Column(Text)
    hobbies = Column(ARRAY(String))
    # Preferences
    activity_preferences = Column(JSON)  # {physical, mental, social, creative}
    dietary_restrictions = Column(ARRAY(String))
    allergies = Column(ARRAY(String))
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    @property
    def name(self):
        return f"{self.first_name} {self.last_name}".strip()

    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    rooms = relationship("RoomMember", back_populates="user")
    created_rooms = relationship("Room", back_populates="creator")
    favorite_activities = relationship("Activity", secondary=user_favorites, back_populates="favorited_by")
    event_participations = relationship("EventParticipant", back_populates="user")

class Room(Base):
    __tablename__ = "room"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(Text)
    avatar_url = Column(String)
    invite_code = Column(String, unique=True, nullable=False, index=True)

    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    creator = relationship("User", back_populates="created_rooms")
    members = relationship("RoomMember", back_populates="room", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="room", cascade="all, delete-orphan")

class RoomMember(Base):
    __tablename__ = "room_member"
    
    room_id = Column(UUID(as_uuid=True), ForeignKey("room.id"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), primary_key=True)
    role = Column(SQLEnum(RoomRole), default=RoomRole.member)
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    room = relationship("Room", back_populates="members")
    user = relationship("User", back_populates="rooms")

class Activity(Base):
    __tablename__ = "activity"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    category = Column(SQLEnum(EventCategory), nullable=False)
    tags = Column(ARRAY(String))
    
    location_region = Column(SQLEnum(Region), nullable=False)
    location_city = Column(String)
    location_address = Column(String)
    coordinates = Column(JSON) # [lat, lng]
    
    est_price_per_person = Column(Float)
    price_includes = Column(Text)
    price_comment = Column(Text)
    
    # Descriptions
    short_description = Column(String, nullable=False)
    long_description = Column(Text)
    description = Column(Text) # generic/middle description
    
    image_url = Column(String)
    gallery_urls = Column(ARRAY(String))
    
    season = Column(SQLEnum(Season))
    
    accessibility_flags = Column(ARRAY(String))

    duration = Column(String)
    typical_duration_hours = Column(Float)
    
    group_size_min = Column(Integer)
    group_size_max = Column(Integer)

    # Intensity/Challenge Ratings (1-5 scale)
    physical_intensity = Column(Integer)
    mental_challenge = Column(Integer)
    social_interaction_level = Column(Integer)
    competition_level = Column(Integer)
    
    # Meta
    provider = Column(String)
    website = Column(String)
    reservation_url = Column(String)
    menu_url = Column(String)
    contact_email = Column(String)
    contact_phone = Column(String)
    facebook = Column(String)
    instagram = Column(String)
    max_capacity = Column(Integer)
    outdoor_seating = Column(Boolean, default=False)
    external_rating = Column(Float)
    primary_goal = Column(String)
    
    # Travel
    travel_time_from_office_minutes = Column(Integer)
    travel_time_from_office_minutes_walking = Column(Integer)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    favorited_by = relationship("User", secondary=user_favorites, back_populates="favorite_activities")
    comments = relationship("ActivityComment", back_populates="activity", cascade="all, delete-orphan")

class Event(Base):
    __tablename__ = "event"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey("room.id"), nullable=False)
    
    name = Column(String, nullable=False)
    description = Column(Text)
    avatar_url = Column(String)
    short_code = Column(String, unique=True, nullable=False, index=True)
    phase = Column(SQLEnum(EventPhase), default=EventPhase.proposal)
    
    time_window = Column(JSON) # { type: "season", value: "summer" } etc.
    voting_deadline = Column(DateTime)
    
    budget_type = Column(SQLEnum(BudgetType))
    budget_amount = Column(Float)
    participant_count_estimate = Column(Integer)
    location_region = Column(SQLEnum(Region))
    
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # Voting Logic
    proposed_activity_ids = Column(ARRAY(UUID(as_uuid=True))) # Simple array for now, or join table if we want "who proposed what"
    excluded_activity_ids = Column(ARRAY(UUID(as_uuid=True))) # Activities excluded by organizer in proposal phase
    chosen_activity_id = Column(UUID(as_uuid=True), ForeignKey("activity.id"), nullable=True)
    final_date_option_id = Column(UUID(as_uuid=True), nullable=True) # FK to DateOption needs to be defined carefully to avoid circular dep
    
    # Relationships
    room = relationship("Room", back_populates="events")
    participants = relationship("EventParticipant", back_populates="event", cascade="all, delete-orphan", lazy="selectin")
    votes = relationship("Vote", back_populates="event", cascade="all, delete-orphan", lazy="selectin")
    date_options = relationship("DateOption", back_populates="event", cascade="all, delete-orphan", lazy="selectin")

class EventParticipant(Base):
    __tablename__ = "event_participant"
    
    event_id = Column(UUID(as_uuid=True), ForeignKey("event.id"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), primary_key=True)
    
    is_organizer = Column(Boolean, default=False)
    has_voted = Column(Boolean, default=False)
    date_response = Column(SQLEnum(DateResponseType), nullable=True)
    
    event = relationship("Event", back_populates="participants")
    user = relationship("User", back_populates="event_participations", lazy="selectin")

class Vote(Base):
    __tablename__ = "vote"

    event_id = Column(UUID(as_uuid=True), ForeignKey("event.id"), primary_key=True)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activity.id"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), primary_key=True)

    vote = Column(SQLEnum(VoteType), nullable=False)
    voted_at = Column(DateTime, default=datetime.utcnow)

    event = relationship("Event", back_populates="votes")
    user = relationship("User", lazy="selectin")

class DateOption(Base):
    __tablename__ = "date_option"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("event.id"))
    
    date = Column(DateTime, nullable=False) # Date part
    start_time = Column(String) # HH:mm
    end_time = Column(String) # HH:mm
    
    event = relationship("Event", back_populates="date_options")
    responses = relationship("DateResponse", back_populates="date_option", cascade="all, delete-orphan", lazy="selectin")

class DateResponse(Base):
    __tablename__ = "date_response"
    
    date_option_id = Column(UUID(as_uuid=True), ForeignKey("date_option.id"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), primary_key=True)
    
    response = Column(SQLEnum(DateResponseType), nullable=False)
    is_priority = Column(Boolean, default=False)
    contribution = Column(Float, default=0.0)
    note = Column(String)
    
    date_option = relationship("DateOption", back_populates="responses")
    user = relationship("User")

class EventComment(Base):
    __tablename__ = "event_comment"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("event.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    phase = Column(SQLEnum(EventPhase), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    event = relationship("Event")

class ActivityComment(Base):
    __tablename__ = "activity_comment"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activity.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    activity = relationship("Activity", back_populates="comments")
