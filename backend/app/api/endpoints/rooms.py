from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.api.helpers import enhance_event_full, require_room_member, resolve_room_identifier
from app.core.utils import generate_event_short_code, generate_room_invite_code
from app.db.session import get_db
from app.models.domain import (
    DateOption,
    DateResponse,
    Event,
    EventParticipant,
    Room,
    RoomMember,
    RoomRole,
    User,
    Vote,
)
from app.schemas.domain import (
    AvatarUploadRequest,
    AvatarUploadResponse,
    AvatarProcessRequest,
    Event as EventSchema,
    EventCreate,
    Room as RoomSchema,
    RoomCreate,
    RoomUpdate,
)
from app.services.room_avatar_service import (
    generate_room_avatar_upload_url,
    process_room_avatar_upload,
)

router = APIRouter()


@router.get("/rooms", response_model=List[RoomSchema])
async def get_rooms(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Room)
        .outerjoin(RoomMember, Room.id == RoomMember.room_id)
        .where(
            or_(
                Room.created_by_user_id == current_user.id,
                and_(
                    RoomMember.user_id == current_user.id,
                    RoomMember.room_id == Room.id,
                ),
            )
        )
        .distinct()
        .offset(skip)
        .limit(limit)
    )
    rooms = result.scalars().all()

    for room in rooms:
        member_count_result = await db.execute(
            select(func.count()).select_from(RoomMember).where(RoomMember.room_id == room.id)
        )
        member_count = member_count_result.scalar_one()
        room.member_count = member_count + 1

    return rooms


@router.post("/rooms", response_model=RoomSchema)
async def create_room(
    room_in: RoomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    max_retries = 10
    invite_code = None
    for _ in range(max_retries):
        candidate_code = generate_room_invite_code()
        existing = await db.execute(select(Room).where(Room.invite_code == candidate_code))
        if not existing.scalar_one_or_none():
            invite_code = candidate_code
            break

    if not invite_code:
        raise HTTPException(status_code=500, detail="Failed to generate unique invite code")

    room = Room(
        **room_in.model_dump(),
        id=uuid4(),
        invite_code=invite_code,
        created_at=datetime.utcnow(),
        created_by_user_id=current_user.id,
    )
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return room


@router.patch("/rooms/{room_identifier}", response_model=RoomSchema)
async def update_room(
    room_identifier: str,
    room_in: RoomUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    room = await resolve_room_identifier(room_identifier, db)
    if room.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the room creator can update this room")

    data = room_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(room, field, value)

    await db.commit()
    await db.refresh(room)
    return room


@router.post("/rooms/{room_identifier}/avatar/upload-url", response_model=AvatarUploadResponse)
async def create_room_avatar_upload_url(
    room_identifier: str,
    payload: AvatarUploadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    room = await resolve_room_identifier(room_identifier, db)
    if room.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the room creator can upload a room image")

    upload_url, public_url, upload_key = generate_room_avatar_upload_url(
        room_id=room.id,
        content_type=payload.content_type,
        file_size=payload.file_size,
    )
    return AvatarUploadResponse(upload_url=upload_url, public_url=public_url, upload_key=upload_key)


@router.post("/rooms/{room_identifier}/avatar/process", response_model=RoomSchema)
async def process_room_avatar(
    room_identifier: str,
    payload: AvatarProcessRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    room = await resolve_room_identifier(room_identifier, db)
    if room.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the room creator can upload a room image")

    processed_url = process_room_avatar_upload(
        room_id=room.id,
        upload_key=payload.upload_key,
        desired_format=payload.output_format,
    )
    room.avatar_url = processed_url
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return room


@router.get("/rooms/{room_identifier}", response_model=RoomSchema)
async def get_room(
    room_identifier: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    room = await resolve_room_identifier(room_identifier, db)
    await require_room_member(room, current_user, db)

    member_count_result = await db.execute(
        select(func.count()).select_from(RoomMember).where(RoomMember.room_id == room.id)
    )
    member_count = member_count_result.scalar_one()
    room.member_count = member_count + 1

    return room


@router.delete("/rooms/{room_identifier}")
async def delete_room(
    room_identifier: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    room = await resolve_room_identifier(room_identifier, db)

    if room.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the room creator can delete this room")

    await db.delete(room)
    await db.commit()

    return {"message": "Room deleted successfully"}


@router.post("/rooms/join", response_model=RoomSchema)
async def join_room(
    invite_code_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invite_code = invite_code_data.get("invite_code")
    if not invite_code:
        raise HTTPException(status_code=400, detail="invite_code is required")

    invite_code = invite_code.strip()

    result = await db.execute(select(Room).where(Room.invite_code == invite_code))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found with this invite code")

    existing_member = await db.execute(
        select(RoomMember).where(
            RoomMember.room_id == room.id,
            RoomMember.user_id == current_user.id,
        )
    )
    if existing_member.scalar_one_or_none():
        return room

    if room.created_by_user_id == current_user.id:
        return room

    new_member = RoomMember(
        room_id=room.id,
        user_id=current_user.id,
        role=RoomRole.member,
        joined_at=datetime.utcnow(),
    )
    db.add(new_member)
    await db.commit()
    await db.refresh(room)

    return room


@router.post("/rooms/{room_identifier}/leave")
async def leave_room(
    room_identifier: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    room = await resolve_room_identifier(room_identifier, db)

    if room.created_by_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Der Raumersteller kann den Raum nicht verlassen")

    result = await db.execute(
        select(RoomMember).where(
            RoomMember.room_id == room.id,
            RoomMember.user_id == current_user.id,
        )
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(status_code=400, detail="Du bist kein Mitglied dieses Raums")

    await db.delete(member)
    await db.commit()

    return {"message": "Room left successfully"}


@router.get("/rooms/{room_identifier}/members")
async def get_room_members(
    room_identifier: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    room = await resolve_room_identifier(room_identifier, db)
    await require_room_member(room, current_user, db)

    creator_result = await db.execute(select(User).where(User.id == room.created_by_user_id))
    creator = creator_result.scalar_one_or_none()

    members_list = []

    if creator:
        members_list.append(
            {
                "id": str(creator.id),
                "name": creator.name,
                "email": creator.email,
                "avatar_url": creator.avatar_url,
                "role": "owner",
                "joined_at": room.created_at.isoformat() if room.created_at else None,
            }
        )

    members_result = await db.execute(
        select(RoomMember, User)
        .join(User, RoomMember.user_id == User.id)
        .where(
            RoomMember.room_id == room.id,
            RoomMember.user_id != room.created_by_user_id,
        )
    )

    for room_member, user in members_result:
        members_list.append(
            {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "avatar_url": user.avatar_url,
                "role": room_member.role.value if hasattr(room_member.role, "value") else room_member.role,
                "joined_at": room_member.joined_at.isoformat() if room_member.joined_at else None,
            }
        )

    return members_list


@router.get("/rooms/{room_identifier}/events", response_model=List[EventSchema])
async def get_room_events(
    room_identifier: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    room = await resolve_room_identifier(room_identifier, db)

    result = await db.execute(
        select(Event)
        .options(
            selectinload(Event.votes).selectinload(Vote.user),
            selectinload(Event.date_options)
            .selectinload(DateOption.responses)
            .selectinload(DateResponse.user),
            selectinload(Event.participants).selectinload(EventParticipant.user),
        )
        .where(Event.room_id == room.id)
    )
    events = result.scalars().all()
    return [enhance_event_full(e) for e in events]


@router.post("/rooms/{room_identifier}/events", response_model=EventSchema)
async def create_event(
    room_identifier: str,
    event_in: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    room = await resolve_room_identifier(room_identifier, db)
    room_id = room.id

    if room.created_by_user_id != current_user.id:
        member_check = await db.execute(
            select(RoomMember).where(
                RoomMember.room_id == room.id,
                RoomMember.user_id == current_user.id,
            )
        )
        if not member_check.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not a member of this room")

    short_code: Optional[str] = None
    for _ in range(10):
        candidate_code = generate_event_short_code()
        existing = await db.execute(select(Event).where(Event.short_code == candidate_code))
        if not existing.scalar_one_or_none():
            short_code = candidate_code
            break

    if not short_code:
        raise HTTPException(status_code=500, detail="Failed to generate unique event short code")

    event = Event(
        **event_in.model_dump(),
        id=uuid4(),
        room_id=room_id,
        short_code=short_code,
        created_at=datetime.utcnow(),
        created_by_user_id=current_user.id,
    )
    db.add(event)

    members_result = await db.execute(select(RoomMember).where(RoomMember.room_id == room_id))
    members = members_result.scalars().all()

    added_user_ids = set()
    for member in members:
        participant = EventParticipant(
            event_id=event.id,
            user_id=member.user_id,
            is_organizer=(member.user_id == current_user.id),
        )
        db.add(participant)
        added_user_ids.add(member.user_id)

    if current_user.id not in added_user_ids:
        participant = EventParticipant(
            event_id=event.id,
            user_id=current_user.id,
            is_organizer=True,
        )
        db.add(participant)

    await db.commit()
    await db.refresh(event)
    return event
