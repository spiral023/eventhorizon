from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, delete, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime
from pydantic import BaseModel

from app.db.session import get_db
from app.api.deps import get_current_user
from app.core.utils import generate_room_invite_code
from app.models.domain import Activity, Room, Event, Vote, DateOption, DateResponse, EventParticipant, User, user_favorites, RoomRole, EventComment, ActivityComment
from app.schemas.domain import (
    Activity as ActivitySchema, Room as RoomSchema, RoomCreate, RoomUpdate, Event as EventSchema,
    EventCreate, VoteCreate, PhaseUpdate, DateResponseCreate, SelectActivity, FinalizeDate,
    DateOptionCreate, EventComment as EventCommentSchema, EventCommentCreate,
    ActivityComment as ActivityCommentSchema, ActivityCommentCreate,
    AvatarUploadRequest, AvatarUploadResponse, AvatarProcessRequest, BookingRequest
)
from app.api.endpoints import auth, users, ai, emails
from app.services.email_service import email_service
from app.services.room_avatar_service import (
    generate_room_avatar_upload_url,
    process_room_avatar_upload,
)
from app.services.event_avatar_service import (
    generate_event_avatar_upload_url,
    process_event_avatar_upload,
)

router = APIRouter()

# Nested routers
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(ai.router)
router.include_router(emails.router)

@router.get("/version")
async def get_version():
    from app.core.config import settings
    return {"version": settings.PROJECT_VERSION}

class EventUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    budget_type: Optional[str] = None
    budget_amount: Optional[float] = None
    avatar_url: Optional[str] = None

# --- Activity Comments ---
@router.get("/activities/{activity_id}/comments", response_model=List[ActivityCommentSchema])
async def get_activity_comments(
    activity_id: UUID,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    query = select(ActivityComment).where(ActivityComment.activity_id == activity_id)
    query = query.order_by(desc(ActivityComment.created_at)).offset(skip).limit(limit).options(selectinload(ActivityComment.user))
    
    result = await db.execute(query)
    comments = result.scalars().all()
    
    # Hydrate user details
    for comment in comments:
        if comment.user:
            comment.user_name = comment.user.name
            comment.user_avatar = comment.user.avatar_url
            
    return comments

@router.post("/activities/{activity_id}/comments", response_model=ActivityCommentSchema)
async def create_activity_comment(
    activity_id: UUID,
    comment_in: ActivityCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify activity exists
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
        
    comment = ActivityComment(
        id=uuid4(),
        activity_id=activity_id,
        user_id=current_user.id,
        content=comment_in.content,
        created_at=datetime.utcnow()
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    
    # Load user for response
    await db.refresh(comment, attribute_names=['user'])
    
    comment.user_name = current_user.name
    comment.user_avatar = current_user.avatar_url
    
    return comment

@router.delete("/activities/{activity_id}/comments/{comment_id}", status_code=204)
async def delete_activity_comment(
    activity_id: UUID,
    comment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ActivityComment).where(ActivityComment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if not comment or comment.activity_id != activity_id:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    await db.delete(comment)
    await db.commit()
    return Response(status_code=204)

# --- Comments ---
@router.get("/events/{event_id}/comments", response_model=List[EventCommentSchema])
async def get_event_comments(
    event_id: UUID,
    phase: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    query = select(EventComment).where(EventComment.event_id == event_id)
    
    if phase:
        query = query.where(EventComment.phase == phase)
        
    query = query.order_by(desc(EventComment.created_at)).offset(skip).limit(limit).options(selectinload(EventComment.user))
    
    result = await db.execute(query)
    comments = result.scalars().all()
    
    # Hydrate user details
    for comment in comments:
        if comment.user:
            comment.user_name = comment.user.name
            comment.user_avatar = comment.user.avatar_url
            
    return comments

@router.post("/events/{event_id}/comments", response_model=EventCommentSchema)
async def create_event_comment(
    event_id: UUID,
    comment_in: EventCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify event exists
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    comment = EventComment(
        id=uuid4(),
        event_id=event_id,
        user_id=current_user.id,
        content=comment_in.content,
        phase=comment_in.phase,
        created_at=datetime.utcnow()
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    
    # Load user for response
    await db.refresh(comment, attribute_names=['user'])
    
    comment.user_name = current_user.name
    comment.user_avatar = current_user.avatar_url
    
    return comment

@router.delete("/events/{event_id}/comments/{comment_id}", status_code=204)
async def delete_event_comment(
    event_id: UUID,
    comment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(EventComment).where(EventComment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if not comment or comment.event_id != event_id:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    await db.delete(comment)
    await db.commit()
    return Response(status_code=204)

@router.get("/health")
async def health_check():
    return {"status": "ok"}

# --- Helpers ---
def enhance_event_with_user_names_helper(event):
    """Add user_name to votes from user relationship"""
    if hasattr(event, 'votes') and event.votes:
        for vote in event.votes:
            if hasattr(vote, 'user') and vote.user:
                vote.user_name = vote.user.name
    return event

def enhance_event_with_dates_helper(event):
    """Add user_name to date responses from user relationship"""
    if hasattr(event, 'date_options') and event.date_options:
        for date_opt in event.date_options:
            if hasattr(date_opt, 'responses') and date_opt.responses:
                for response in date_opt.responses:
                    if hasattr(response, 'user') and response.user:
                        response.user_name = response.user.name
                        response.user_avatar = response.user.avatar_url
    return event

def enhance_event_full(event):
    enhance_event_with_user_names_helper(event)
    enhance_event_with_dates_helper(event)
    return event

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

@router.post("/activities/{activity_id}/booking-request")
async def create_booking_request(
    activity_id: UUID,
    request_in: BookingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify activity exists
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    if not activity.email:
        raise HTTPException(status_code=400, detail="Activity has no contact email")

    success = await email_service.send_booking_request_email(
        provider_email=activity.email,
        provider_name=activity.provider or "Anbieter",
        activity_title=activity.title,
        participant_count=request_in.participant_count,
        requested_date=request_in.requested_date.strftime("%d.%m.%Y"),
        start_time=request_in.start_time,
        end_time=request_in.end_time,
        contact_name=request_in.contact_name,
        contact_email=request_in.contact_email,
        contact_phone=request_in.contact_phone,
        notes=request_in.notes
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send booking request email")

    return {"message": "Booking request sent successfully"}

# --- Rooms ---
@router.get("/rooms", response_model=List[RoomSchema])
async def get_rooms(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get rooms where the current user is either:
    1. The creator (created_by_user_id = current_user.id)
    2. A member (exists in room_members table)
    """
    from app.models.domain import RoomMember
    from sqlalchemy import or_, and_

    # Query for rooms where user is creator OR member
    result = await db.execute(
        select(Room)
        .outerjoin(RoomMember, Room.id == RoomMember.room_id)
        .where(
            or_(
                Room.created_by_user_id == current_user.id,  # User created the room
                and_(
                    RoomMember.user_id == current_user.id,   # User is a member
                    RoomMember.room_id == Room.id
                )
            )
        )
        .distinct()  # Avoid duplicates if user is both creator and member
        .offset(skip)
        .limit(limit)
    )
    rooms = result.scalars().all()

    # Calculate member count for each room (creator + members)
    for room in rooms:
        member_count_result = await db.execute(
            select(func.count())
            .select_from(RoomMember)
            .where(RoomMember.room_id == room.id)
        )
        member_count = member_count_result.scalar_one()
        # Add 1 for the creator if they're not already a member
        room.member_count = member_count + 1  # Creator is always counted

    return rooms

@router.post("/rooms", response_model=RoomSchema)
async def create_room(
    room_in: RoomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Generate a unique invite code with retry logic
    max_retries = 10
    invite_code = None
    for _ in range(max_retries):
        candidate_code = generate_room_invite_code()
        # Check if code already exists
        existing = await db.execute(
            select(Room).where(Room.invite_code == candidate_code)
        )
        if not existing.scalar_one_or_none():
            invite_code = candidate_code
            break

    if not invite_code:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate unique invite code"
        )

    # Attach the authenticated user as the creator of the room
    room = Room(
        **room_in.model_dump(),
        id=uuid4(),
        invite_code=invite_code,
        created_at=datetime.utcnow(),
        created_by_user_id=current_user.id
    )
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return room

@router.patch("/rooms/{room_id}", response_model=RoomSchema)
async def update_room(
    room_id: UUID,
    room_in: RoomUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the room creator can update this room")

    data = room_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(room, field, value)

    await db.commit()
    await db.refresh(room)
    return room

@router.post("/rooms/{room_id}/avatar/upload-url", response_model=AvatarUploadResponse)
async def create_room_avatar_upload_url(
    room_id: UUID,
    payload: AvatarUploadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the room creator can upload a room image")

    upload_url, public_url, upload_key = generate_room_avatar_upload_url(
        room_id=room_id,
        content_type=payload.content_type,
        file_size=payload.file_size,
    )
    return AvatarUploadResponse(upload_url=upload_url, public_url=public_url, upload_key=upload_key)

@router.post("/rooms/{room_id}/avatar/process", response_model=RoomSchema)
async def process_room_avatar(
    room_id: UUID,
    payload: AvatarProcessRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the room creator can upload a room image")

    processed_url = process_room_avatar_upload(
        room_id=room_id,
        upload_key=payload.upload_key,
        desired_format=payload.output_format,
    )
    room.avatar_url = processed_url
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return room


@router.post("/events/{event_id}/avatar/upload-url", response_model=AvatarUploadResponse)
async def create_event_avatar_upload_url(
    event_id: UUID,
    payload: AvatarUploadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the event creator can upload an event image")

    upload_url, public_url, upload_key = generate_event_avatar_upload_url(
        event_id=event_id,
        content_type=payload.content_type,
        file_size=payload.file_size,
    )
    return AvatarUploadResponse(upload_url=upload_url, public_url=public_url, upload_key=upload_key)


@router.post("/events/{event_id}/avatar/process", response_model=EventSchema)
async def process_event_avatar(
    event_id: UUID,
    payload: AvatarProcessRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the event creator can upload an event image")

    processed_url = process_event_avatar_upload(
        event_id=event_id,
        upload_key=payload.upload_key,
        desired_format=payload.output_format,
    )
    event.avatar_url = processed_url
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event

@router.get("/rooms/{room_identifier}", response_model=RoomSchema)
async def get_room(room_identifier: str, db: AsyncSession = Depends(get_db)):
    from app.models.domain import RoomMember

    # Try to parse as UUID
    is_uuid = False
    try:
        room_uuid = UUID(room_identifier)
        is_uuid = True
    except ValueError:
        pass

    query = select(Room)
    if is_uuid:
        query = query.where(Room.id == room_uuid)
    else:
        # Assume it's an invite code
        query = query.where(Room.invite_code == room_identifier.upper().strip())

    result = await db.execute(query)
    room = result.scalar_one_or_none()
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Calculate member count (creator + members)
    member_count_result = await db.execute(
        select(func.count())
        .select_from(RoomMember)
        .where(RoomMember.room_id == room.id)
    )
    member_count = member_count_result.scalar_one()
    room.member_count = member_count + 1  # Creator is always counted

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

@router.post("/rooms/join", response_model=RoomSchema)
async def join_room(
    invite_code_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Join a room using an invite code.
    Creates a RoomMember entry if not already a member.
    """
    from app.models.domain import RoomMember

    invite_code = invite_code_data.get("invite_code")
    if not invite_code:
        raise HTTPException(status_code=400, detail="invite_code is required")

    invite_code = invite_code.strip()

    # Find room by invite code
    result = await db.execute(
        select(Room).where(Room.invite_code == invite_code)
    )
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found with this invite code")

    # Check if user is already a member
    existing_member = await db.execute(
        select(RoomMember).where(
            RoomMember.room_id == room.id,
            RoomMember.user_id == current_user.id
        )
    )
    if existing_member.scalar_one_or_none():
        # Already a member, just return the room
        return room

    # Check if user is the creator (creators are implicitly members)
    if room.created_by_user_id == current_user.id:
        # Creator doesn't need to join explicitly, just return the room
        return room

    # Add user as a member
    new_member = RoomMember(
        room_id=room.id,
        user_id=current_user.id,
        role=RoomRole.member,
        joined_at=datetime.utcnow()
    )
    db.add(new_member)
    await db.commit()
    await db.refresh(room)

    return room

@router.post("/rooms/{room_id}/leave")
async def leave_room(
    room_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Leave a room.
    Removes the RoomMember entry.
    Creators cannot leave their own room.
    """
    from app.models.domain import RoomMember

    # Find room
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Prevent creator from leaving
    if room.created_by_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Der Raumersteller kann den Raum nicht verlassen")

    # Check if user is a member
    result = await db.execute(
        select(RoomMember).where(
            RoomMember.room_id == room_id,
            RoomMember.user_id == current_user.id
        )
    )
    member = result.scalar_one_or_none()
    
    if not member:
        raise HTTPException(status_code=400, detail="Du bist kein Mitglied dieses Raums")

    # Remove member
    await db.delete(member)
    await db.commit()

    return {"message": "Room left successfully"}

@router.get("/rooms/{room_id}/members")
async def get_room_members(room_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Get all members of a room including the creator.
    Returns a list with: id, name, email, avatar_url, role, joined_at
    """
    from app.models.domain import RoomMember

    # Get the room and its creator
    room_result = await db.execute(select(Room).where(Room.id == room_id))
    room = room_result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Get the creator
    creator_result = await db.execute(select(User).where(User.id == room.created_by_user_id))
    creator = creator_result.scalar_one_or_none()

    members_list = []

    # Add creator first
    if creator:
        members_list.append({
            "id": str(creator.id),
            "name": creator.name,
            "email": creator.email,
            "avatar_url": creator.avatar_url,
            "role": "owner",  # Creator is always owner
            "joined_at": room.created_at.isoformat() if room.created_at else None
        })

    # Get all other members
    members_result = await db.execute(
        select(RoomMember, User)
        .join(User, RoomMember.user_id == User.id)
        .where(
            RoomMember.room_id == room_id,
            RoomMember.user_id != room.created_by_user_id
        )
    )

    for room_member, user in members_result:
        members_list.append({
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "role": room_member.role.value if hasattr(room_member.role, 'value') else room_member.role,
            "joined_at": room_member.joined_at.isoformat() if room_member.joined_at else None
        })

    return members_list

@router.get("/rooms/{room_id}/events", response_model=List[EventSchema])
async def get_room_events(room_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Event)
        .options(
            selectinload(Event.votes).selectinload(Vote.user),
            selectinload(Event.date_options).selectinload(DateOption.responses).selectinload(DateResponse.user),
            selectinload(Event.participants).selectinload(EventParticipant.user)
        )
        .where(Event.room_id == room_id)
    )
    events = result.scalars().all()
    return [enhance_event_full(e) for e in events]

@router.post("/rooms/{room_identifier}/events", response_model=EventSchema)
async def create_event(
    room_identifier: str,
    event_in: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.domain import RoomMember

    # Resolve room_identifier to room
    is_uuid = False
    try:
        room_uuid = UUID(room_identifier)
        is_uuid = True
    except ValueError:
        pass

    query = select(Room)
    if is_uuid:
        query = query.where(Room.id == room_uuid)
    else:
        query = query.where(Room.invite_code == room_identifier.upper().strip())

    result = await db.execute(query)
    room = result.scalar_one_or_none()
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    room_id = room.id

    # Basic impl
    event = Event(
        **event_in.model_dump(),
        id=uuid4(),
        room_id=room_id,
        created_at=datetime.utcnow(),
        created_by_user_id=current_user.id
    )
    db.add(event)
    
    # Add all room members as participants
    members_result = await db.execute(
        select(RoomMember).where(RoomMember.room_id == room_id)
    )
    members = members_result.scalars().all()
    
    added_user_ids = set()
    for member in members:
        participant = EventParticipant(
            event_id=event.id,
            user_id=member.user_id,
            is_organizer=(member.user_id == current_user.id)
        )
        db.add(participant)
        added_user_ids.add(member.user_id)
        
    # Ensure creator is added if not in members
    if current_user.id not in added_user_ids:
        participant = EventParticipant(
            event_id=event.id,
            user_id=current_user.id,
            is_organizer=True
        )
        db.add(participant)
    
    await db.commit()
    await db.refresh(event)
    return event

# --- Events ---
@router.get("/events/{event_id}", response_model=EventSchema)
async def get_event(event_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Event)
        .options(
            selectinload(Event.votes).selectinload(Vote.user),
            selectinload(Event.date_options).selectinload(DateOption.responses).selectinload(DateResponse.user),
            selectinload(Event.participants).selectinload(EventParticipant.user)
        )
        .where(Event.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return enhance_event_full(event)


@router.patch("/events/{event_id}", response_model=EventSchema)
async def update_event(
    event_id: UUID,
    payload: EventUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the event creator can update this event")

    data = payload.model_dump(exclude_none=True)
    for field, value in data.items():
        setattr(event, field, value)

    event.updated_at = datetime.utcnow()
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return enhance_event_full(event)

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

@router.patch("/events/{event_id}/activities/{activity_id}/exclude", response_model=EventSchema)
async def exclude_activity(
    event_id: UUID,
    activity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event_result = await db.execute(
        select(Event)
        .options(selectinload(Event.votes).selectinload(Vote.user))
        .where(Event.id == event_id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the event creator can exclude activities")

    if event.phase != "proposal":
        raise HTTPException(status_code=400, detail="Cannot exclude activities after proposal phase")

    # Initialize excluded_activity_ids if None
    if event.excluded_activity_ids is None:
        event.excluded_activity_ids = []

    # Add to excluded list if not already there
    if activity_id not in event.excluded_activity_ids:
        event.excluded_activity_ids = list(event.excluded_activity_ids) + [activity_id]

    event.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(event)

    return enhance_event_with_user_names_helper(event)

@router.patch("/events/{event_id}/activities/{activity_id}/include", response_model=EventSchema)
async def include_activity(
    event_id: UUID,
    activity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event_result = await db.execute(
        select(Event)
        .options(selectinload(Event.votes).selectinload(Vote.user))
        .where(Event.id == event_id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the event creator can include activities")

    if event.phase != "proposal":
        raise HTTPException(status_code=400, detail="Cannot include activities after proposal phase")

    # Remove from excluded list if present
    if event.excluded_activity_ids and activity_id in event.excluded_activity_ids:
        event.excluded_activity_ids = [aid for aid in event.excluded_activity_ids if aid != activity_id]

    event.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(event)

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

    # Update participant status
    participant_result = await db.execute(
        select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.user_id == current_user.id
        )
    )
    participant = participant_result.scalar_one_or_none()
    if participant:
        participant.has_voted = True
    else:
        # Auto-add as participant if they vote
        new_participant = EventParticipant(
            event_id=event_id,
            user_id=current_user.id,
            has_voted=True
        )
        db.add(new_participant)

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

import logging

logger = logging.getLogger(__name__)

@router.post("/events/{event_id}/date-options", response_model=EventSchema)
async def create_date_option(
    event_id: UUID,
    date_in: DateOptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check event
    result = await db.execute(
        select(Event)
        .options(selectinload(Event.date_options))
        .where(Event.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.phase != "scheduling":
        raise HTTPException(status_code=400, detail="Can only add dates in scheduling phase")
    
    # Check limits
    if len(event.date_options) >= 10:
        raise HTTPException(status_code=400, detail="Maximum 10 date options allowed")

    # Validate times
    if date_in.end_time and not date_in.start_time:
        raise HTTPException(status_code=400, detail="End time requires a start time")

    new_date = DateOption(
        id=uuid4(),
        event_id=event_id,
        date=date_in.date.replace(tzinfo=None),
        start_time=date_in.start_time,
        end_time=date_in.end_time
    )
    db.add(new_date)
    await db.commit()
    
    logger.info(f"Created date option {new_date.id} for event {event_id}")
    
    # Force reload of all objects in session to ensure relationships are up to date
    db.expire_all()

    # Reload event
    updated_event = await get_event(event_id, db)
    logger.info(f"Updated event has {len(updated_event.date_options)} date options")
    return updated_event

@router.delete("/events/{event_id}/date-options/{date_option_id}", response_model=EventSchema)
async def delete_date_option(
    event_id: UUID,
    date_option_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if event.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only event creator can delete date options")
        
    await db.execute(
        delete(DateOption).where(DateOption.id == date_option_id, DateOption.event_id == event_id)
    )
    await db.commit()
    
    return await get_event(event_id, db)

@router.post("/events/{event_id}/date-options/{date_option_id}/response", response_model=EventSchema)
async def respond_to_date(
    event_id: UUID, 
    date_option_id: UUID, 
    response_in: DateResponseCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if event.phase != "scheduling":
        raise HTTPException(status_code=400, detail="Voting allowed only in scheduling phase")

    # Handle Priority: If this is priority, unset others for this user/event
    if response_in.is_priority:
        # Get all date options for this event
        date_options_result = await db.execute(select(DateOption.id).where(DateOption.event_id == event_id))
        date_option_ids = [row.id for row in date_options_result]
        
        if date_option_ids:
            await db.execute(
                DateResponse.__table__.update()
                .where(
                    DateResponse.user_id == current_user.id,
                    DateResponse.date_option_id.in_(date_option_ids)
                )
                .values(is_priority=False)
            )

    # Upsert Response
    existing_response = await db.execute(
        select(DateResponse).where(
            DateResponse.date_option_id == date_option_id,
            DateResponse.user_id == current_user.id
        )
    )
    response = existing_response.scalar_one_or_none()
    
    if response:
        response.response = response_in.response
        response.is_priority = response_in.is_priority
        response.contribution = response_in.contribution or 0.0
        response.note = response_in.note
    else:
        new_resp = DateResponse(
            date_option_id=date_option_id,
            user_id=current_user.id,
            response=response_in.response,
            is_priority=response_in.is_priority,
            contribution=response_in.contribution or 0.0,
            note=response_in.note
        )
        db.add(new_resp)
        
    await db.commit()
    
    # Force reload to ensure latest state is returned
    db.expire_all()
    
    return await get_event(event_id, db)

@router.post("/events/{event_id}/select-activity", response_model=EventSchema)
async def select_activity(event_id: UUID, selection: SelectActivity, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event:
        event.chosen_activity_id = selection.activity_id
        event.phase = "scheduling"
        await db.commit()
    return await get_event(event_id, db)

@router.post("/events/{event_id}/finalize-date", response_model=EventSchema)
async def finalize_date(event_id: UUID, selection: FinalizeDate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event:
        event.final_date_option_id = selection.date_option_id
        event.phase = "info"
        await db.commit()
    return await get_event(event_id, db)
