from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import and_, desc, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_optional_current_user
from app.api.helpers import resolve_activity_identifier, resolve_room_identifier
from app.db.session import get_db
from app.models.domain import Activity, ActivityComment, RoomMember, User, user_favorites
from app.schemas.domain import (
    Activity as ActivitySchema,
    ActivityComment as ActivityCommentSchema,
    ActivityCommentCreate,
    BookingRequest,
)
from app.services.email_service import email_service
from app.services.travel_time_service import apply_company_travel_times

router = APIRouter()


# --- Activity Comments ---
@router.get("/activities/{identifier}/comments", response_model=List[ActivityCommentSchema])
async def get_activity_comments(
    identifier: str,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    activity = await resolve_activity_identifier(identifier, db)

    query = select(ActivityComment).where(ActivityComment.activity_id == activity.id)
    query = query.order_by(desc(ActivityComment.created_at)).offset(skip).limit(limit).options(
        selectinload(ActivityComment.user)
    )

    result = await db.execute(query)
    comments = result.scalars().all()

    for comment in comments:
        if comment.user:
            comment.user_name = comment.user.name
            comment.user_avatar = comment.user.avatar_url

    return comments


@router.post("/activities/{identifier}/comments", response_model=ActivityCommentSchema)
async def create_activity_comment(
    identifier: str,
    comment_in: ActivityCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = await resolve_activity_identifier(identifier, db)

    comment = ActivityComment(
        id=uuid4(),
        activity_id=activity.id,
        user_id=current_user.id,
        content=comment_in.content,
        created_at=datetime.utcnow(),
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    await db.refresh(comment, attribute_names=["user"])

    comment.user_name = current_user.name
    comment.user_avatar = current_user.avatar_url

    return comment


@router.delete("/activities/{identifier}/comments/{comment_id}", status_code=204)
async def delete_activity_comment(
    identifier: str,
    comment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = await resolve_activity_identifier(identifier, db)

    result = await db.execute(select(ActivityComment).where(ActivityComment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment or comment.activity_id != activity.id:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    await db.delete(comment)
    await db.commit()
    return Response(status_code=204)


# --- Activities ---
@router.get("/activities", response_model=List[ActivitySchema])
async def get_activities(
    skip: int = 0,
    limit: int = 100,
    room_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    result = await db.execute(select(Activity).offset(skip).limit(limit))
    activities = result.scalars().all()

    if not activities:
        return []

    activity_ids = [a.id for a in activities]

    counts_result = await db.execute(
        select(user_favorites.c.activity_id, func.count().label("cnt"))
        .where(user_favorites.c.activity_id.in_(activity_ids))
        .group_by(user_favorites.c.activity_id)
    )
    counts_map = {row.activity_id: row.cnt for row in counts_result}

    room_counts_map = {}
    if room_id:
        try:
            room = await resolve_room_identifier(room_id, db)

            member_subquery = select(RoomMember.user_id).where(RoomMember.room_id == room.id)

            allowed_users_condition = user_favorites.c.user_id.in_(member_subquery)

            if room.created_by_user_id:
                allowed_users_condition = or_(
                    allowed_users_condition,
                    user_favorites.c.user_id == room.created_by_user_id,
                )

            stmt = (
                select(user_favorites.c.activity_id, func.count().label("cnt"))
                .where(
                    and_(
                        allowed_users_condition,
                        user_favorites.c.activity_id.in_(activity_ids),
                    )
                )
                .group_by(user_favorites.c.activity_id)
            )

            room_counts_result = await db.execute(stmt)
            room_counts_map = {row.activity_id: row.cnt for row in room_counts_result}

        except HTTPException:
            pass

    for activity in activities:
        activity.favorites_count = counts_map.get(activity.id, 0)
        activity.favorites_in_room_count = room_counts_map.get(activity.id, 0)

    await apply_company_travel_times(
        activities,
        current_user.company_id if current_user else None,
        db,
    )

    return activities


@router.get("/activities/favorites", response_model=List[UUID])
async def get_user_favorites(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(user_favorites.c.activity_id).where(user_favorites.c.user_id == current_user.id)
    )
    return [row.activity_id for row in result.fetchall()]


@router.get("/activities/{identifier}", response_model=ActivitySchema)
async def get_activity(
    identifier: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    try:
        activity_id = UUID(identifier)
        result = await db.execute(select(Activity).where(Activity.id == activity_id))
        activity = result.scalar_one_or_none()
        if activity:
            return RedirectResponse(url=f"/api/v1/activities/{activity.slug}", status_code=301)
    except ValueError:
        pass

    result = await db.execute(select(Activity).where(Activity.slug == identifier))
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    count_result = await db.execute(
        select(func.count())
        .select_from(user_favorites)
        .where(user_favorites.c.activity_id == activity.id)
    )
    activity.favorites_count = count_result.scalar_one()

    await apply_company_travel_times(
        [activity],
        current_user.company_id if current_user else None,
        db,
    )

    return activity


@router.get("/activities/{identifier}/favorite")
async def get_favorite_status(
    identifier: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = await resolve_activity_identifier(identifier, db)

    fav_result = await db.execute(
        select(user_favorites.c.activity_id).where(
            user_favorites.c.activity_id == activity.id,
            user_favorites.c.user_id == current_user.id,
        )
    )
    is_favorite = fav_result.scalar_one_or_none() is not None

    count_result = await db.execute(
        select(func.count())
        .select_from(user_favorites)
        .where(user_favorites.c.activity_id == activity.id)
    )
    favorites_count = count_result.scalar_one()

    return {"is_favorite": is_favorite, "favorites_count": favorites_count}


@router.post("/activities/{identifier}/favorite")
async def toggle_favorite_activity(
    identifier: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = await resolve_activity_identifier(identifier, db)

    existing = await db.execute(
        select(user_favorites).where(
            user_favorites.c.activity_id == activity.id,
            user_favorites.c.user_id == current_user.id,
        )
    )
    favorite_row = existing.first()

    if favorite_row:
        await db.execute(
            user_favorites.delete().where(
                user_favorites.c.activity_id == activity.id,
                user_favorites.c.user_id == current_user.id,
            )
        )
        is_favorite = False
    else:
        await db.execute(
            user_favorites.insert().values(activity_id=activity.id, user_id=current_user.id)
        )
        is_favorite = True

    await db.commit()

    count_result = await db.execute(
        select(func.count())
        .select_from(user_favorites)
        .where(user_favorites.c.activity_id == activity.id)
    )
    favorites_count = count_result.scalar_one()

    return {"is_favorite": is_favorite, "favorites_count": favorites_count}


@router.post("/activities/{identifier}/booking-request")
async def create_booking_request(
    identifier: str,
    request_in: BookingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = await resolve_activity_identifier(identifier, db)

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
        notes=request_in.notes,
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send booking request email")

    return {"message": "Booking request sent successfully"}
