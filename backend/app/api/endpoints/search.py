from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_optional_current_user
from app.db.session import get_db
from app.models.domain import Activity, Event, Room, RoomMember, User
from app.schemas.domain import SearchResult
from app.services.travel_time_service import apply_company_travel_times

router = APIRouter()


@router.get("/search", response_model=SearchResult)
async def search_global(
    q: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    if not q or len(q) < 2:
        return SearchResult()

    query_str = f"%{q}%"

    # 1. Activities (Public)
    activities_result = await db.execute(
        select(Activity)
        .where(
            or_(
                Activity.title.ilike(query_str),
                Activity.short_description.ilike(query_str),
                Activity.long_description.ilike(query_str),
            )
        )
        .limit(10)
    )
    activities = activities_result.scalars().all()
    await apply_company_travel_times(
        activities,
        current_user.company_id if current_user else None,
        db,
    )

    # 2. Rooms (User is member or creator)
    if current_user:
        rooms_result = await db.execute(
            select(Room)
            .outerjoin(RoomMember, Room.id == RoomMember.room_id)
            .where(
                and_(
                    or_(
                        Room.name.ilike(query_str),
                        Room.description.ilike(query_str),
                    ),
                    or_(
                        Room.created_by_user_id == current_user.id,
                        and_(
                            RoomMember.user_id == current_user.id,
                            RoomMember.room_id == Room.id,
                        ),
                    ),
                )
            )
            .distinct()
            .limit(10)
        )
        rooms = rooms_result.scalars().all()
    else:
        rooms = []

    # Calculate member counts for rooms in one query (avoid N+1)
    room_ids = [room.id for room in rooms]
    counts_map: dict[UUID, int] = {}
    if room_ids:
        member_counts_result = await db.execute(
            select(RoomMember.room_id, func.count().label("cnt"))
            .where(RoomMember.room_id.in_(room_ids))
            .group_by(RoomMember.room_id)
        )
        counts_map = {row.room_id: row.cnt for row in member_counts_result}

    for room in rooms:
        room.member_count = counts_map.get(room.id, 0) + 1  # +1 for creator

    # 3. Events (In user's rooms)
    if current_user:
        user_room_ids_result = await db.execute(
            select(Room.id)
            .outerjoin(RoomMember, Room.id == RoomMember.room_id)
            .where(
                or_(
                    Room.created_by_user_id == current_user.id,
                    RoomMember.user_id == current_user.id,
                )
            )
        )
        user_room_ids = [row.id for row in user_room_ids_result.fetchall()]
    else:
        user_room_ids = []

    if user_room_ids:
        events_result = await db.execute(
            select(Event)
            .where(
                and_(
                    Event.name.ilike(query_str),
                    Event.room_id.in_(user_room_ids),
                )
            )
            .limit(10)
        )
        events = events_result.scalars().all()
    else:
        events = []

    # 4. Users (Members of user's rooms)
    if user_room_ids:
        user_ids_result = await db.execute(
            select(User.id)
            .join(RoomMember, User.id == RoomMember.user_id)
            .where(
                and_(
                    or_(
                        User.first_name.ilike(query_str),
                        User.last_name.ilike(query_str),
                        User.email.ilike(query_str),
                    ),
                    RoomMember.room_id.in_(user_room_ids),
                    User.id != current_user.id,
                )
            )
            .distinct()
            .limit(10)
        )
        found_user_ids = user_ids_result.scalars().all()

        if found_user_ids:
            users_result = await db.execute(select(User).where(User.id.in_(found_user_ids)))
            users_found = users_result.scalars().all()
        else:
            users_found = []
    else:
        users_found = []

    return SearchResult(
        activities=activities,
        rooms=rooms,
        events=events,
        users=users_found,
    )
