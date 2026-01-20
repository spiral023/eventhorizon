import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import delete, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.api.helpers import (
    enhance_event_full,
    enhance_event_with_user_names_helper,
    ensure_event_participant,
    ensure_user_in_room,
    require_event_organizer,
    resolve_event_identifier,
)
from app.db.session import get_db
from app.models.domain import (
    Activity,
    DateOption,
    DateResponse,
    Event,
    EventComment,
    EventParticipant,
    User,
    Vote,
)
from app.schemas.domain import (
    AvatarProcessRequest,
    AvatarUploadRequest,
    AvatarUploadResponse,
    DateOptionCreate,
    DateResponseCreate,
    Event as EventSchema,
    EventComment as EventCommentSchema,
    EventCommentCreate,
    FinalizeDate,
    PhaseUpdate,
    SelectActivity,
    VoteCreate,
)
from app.services.event_avatar_service import (
    generate_event_avatar_upload_url,
    process_event_avatar_upload,
)

router = APIRouter()
logger = logging.getLogger(__name__)


class EventUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    budget_type: Optional[str] = None
    budget_amount: Optional[float] = None
    avatar_url: Optional[str] = None


# --- Event Comments ---
@router.get("/events/{event_identifier}/comments", response_model=List[EventCommentSchema])
async def get_event_comments(
    event_identifier: str,
    phase: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    event = await resolve_event_identifier(event_identifier, db)

    query = select(EventComment).where(EventComment.event_id == event.id)

    if phase:
        query = query.where(EventComment.phase == phase)

    query = (
        query.order_by(EventComment.created_at.desc())
        .offset(skip)
        .limit(limit)
        .options(selectinload(EventComment.user))
    )

    result = await db.execute(query)
    comments = result.scalars().all()

    for comment in comments:
        if comment.user:
            comment.user_name = comment.user.name
            comment.user_avatar = comment.user.avatar_url

    return comments


@router.post("/events/{event_identifier}/comments", response_model=EventCommentSchema)
async def create_event_comment(
    event_identifier: str,
    comment_in: EventCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await resolve_event_identifier(event_identifier, db)

    await ensure_user_in_room(event, current_user, db)

    comment = EventComment(
        id=uuid4(),
        event_id=event.id,
        user_id=current_user.id,
        content=comment_in.content,
        phase=comment_in.phase,
        created_at=datetime.utcnow(),
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    await db.refresh(comment, attribute_names=["user"])

    comment.user_name = current_user.name
    comment.user_avatar = current_user.avatar_url

    return comment


@router.delete("/events/{event_identifier}/comments/{comment_id}", status_code=204)
async def delete_event_comment(
    event_identifier: str,
    comment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await resolve_event_identifier(event_identifier, db)

    result = await db.execute(select(EventComment).where(EventComment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment or comment.event_id != event.id:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    await db.delete(comment)
    await db.commit()
    return Response(status_code=204)


@router.post("/events/{event_identifier}/avatar/upload-url", response_model=AvatarUploadResponse)
async def create_event_avatar_upload_url(
    event_identifier: str,
    payload: AvatarUploadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await resolve_event_identifier(event_identifier, db)
    if event.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the event creator can upload an event image")

    upload_url, public_url, upload_key = generate_event_avatar_upload_url(
        event_id=event.id,
        content_type=payload.content_type,
        file_size=payload.file_size,
    )
    return AvatarUploadResponse(upload_url=upload_url, public_url=public_url, upload_key=upload_key)


@router.post("/events/{event_identifier}/avatar/process", response_model=EventSchema)
async def process_event_avatar(
    event_identifier: str,
    payload: AvatarProcessRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await resolve_event_identifier(event_identifier, db)
    if event.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the event creator can upload an event image")

    processed_url = process_event_avatar_upload(
        event_id=event.id,
        upload_key=payload.upload_key,
        desired_format=payload.output_format,
    )
    event.avatar_url = processed_url
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


# --- Events ---
@router.get("/events/{event_identifier}", response_model=EventSchema)
async def get_event(
    event_identifier: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event_light = await resolve_event_identifier(event_identifier, db)

    was_added_room = await ensure_user_in_room(event_light, current_user, db)
    was_added_participant = await ensure_event_participant(event_light, current_user, db)

    if was_added_room or was_added_participant:
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()

    event = await resolve_event_identifier(
        event_identifier,
        db,
        options=[
            selectinload(Event.votes).selectinload(Vote.user),
            selectinload(Event.date_options)
            .selectinload(DateOption.responses)
            .selectinload(DateResponse.user),
            selectinload(Event.participants).selectinload(EventParticipant.user),
        ],
    )

    return enhance_event_full(event)


@router.patch("/events/{event_identifier}", response_model=EventSchema)
async def update_event(
    event_identifier: str,
    payload: EventUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await resolve_event_identifier(event_identifier, db)
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


@router.delete("/events/{event_identifier}/proposed-activities/{activity_id}", response_model=EventSchema)
async def remove_proposed_activity(
    event_identifier: str,
    activity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await resolve_event_identifier(
        event_identifier,
        db,
        options=[selectinload(Event.votes)],
    )

    if event.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the event creator can modify proposals")

    if event.phase != "proposal":
        raise HTTPException(status_code=400, detail="Cannot remove proposals after voting has started")

    current_ids = event.proposed_activity_ids or []
    if activity_id not in current_ids:
        return event

    event.proposed_activity_ids = [aid for aid in current_ids if aid != activity_id]

    await db.execute(delete(Vote).where(Vote.event_id == event.id, Vote.activity_id == activity_id))

    await db.commit()
    await db.refresh(event)

    result = await db.execute(
        select(Event).options(selectinload(Event.votes).selectinload(Vote.user)).where(Event.id == event.id)
    )
    event = result.scalar_one_or_none()
    return enhance_event_with_user_names_helper(event)


@router.patch("/events/{event_identifier}/activities/{activity_id}/exclude", response_model=EventSchema)
async def exclude_activity(
    event_identifier: str,
    activity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await resolve_event_identifier(
        event_identifier,
        db,
        options=[selectinload(Event.votes).selectinload(Vote.user)],
    )

    if event.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the event creator can exclude activities")

    if event.phase != "proposal":
        raise HTTPException(status_code=400, detail="Cannot exclude activities after proposal phase")

    if event.excluded_activity_ids is None:
        event.excluded_activity_ids = []

    if activity_id not in event.excluded_activity_ids:
        event.excluded_activity_ids = list(event.excluded_activity_ids) + [activity_id]

    event.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(event)

    return enhance_event_with_user_names_helper(event)


@router.patch("/events/{event_identifier}/activities/{activity_id}/include", response_model=EventSchema)
async def include_activity(
    event_identifier: str,
    activity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await resolve_event_identifier(
        event_identifier,
        db,
        options=[selectinload(Event.votes).selectinload(Vote.user)],
    )

    if event.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the event creator can include activities")

    if event.phase != "proposal":
        raise HTTPException(status_code=400, detail="Cannot include activities after proposal phase")

    if event.excluded_activity_ids and activity_id in event.excluded_activity_ids:
        event.excluded_activity_ids = [aid for aid in event.excluded_activity_ids if aid != activity_id]

    event.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(event)

    return enhance_event_with_user_names_helper(event)


@router.delete("/events/{event_identifier}")
async def delete_event(
    event_identifier: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await resolve_event_identifier(event_identifier, db)

    if event.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the event creator can delete this event")

    await db.delete(event)
    await db.commit()
    return {"message": "Event deleted successfully"}


@router.patch("/events/{event_identifier}/phase", response_model=EventSchema)
async def update_event_phase(
    event_identifier: str,
    phase_in: PhaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await resolve_event_identifier(event_identifier, db)
    await require_event_organizer(event, db, current_user)
    event.phase = phase_in.phase
    await db.commit()
    await db.refresh(event)
    return event


@router.post("/events/{event_identifier}/votes", response_model=EventSchema)
async def vote_on_activity(
    event_identifier: str,
    vote_in: VoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.domain import Vote as VoteModel

    event = await resolve_event_identifier(event_identifier, db)

    await ensure_user_in_room(event, current_user, db)

    existing_vote_result = await db.execute(
        select(VoteModel).where(
            VoteModel.event_id == event.id,
            VoteModel.activity_id == vote_in.activity_id,
            VoteModel.user_id == current_user.id,
        )
    )
    existing_vote = existing_vote_result.scalar_one_or_none()

    old_is_for = existing_vote.vote == "for" if existing_vote else False
    new_is_for = vote_in.vote == "for"

    if existing_vote:
        existing_vote.vote = vote_in.vote
        existing_vote.voted_at = datetime.utcnow()
    else:
        new_vote = VoteModel(
            event_id=event.id,
            activity_id=vote_in.activity_id,
            user_id=current_user.id,
            vote=vote_in.vote,
            voted_at=datetime.utcnow(),
        )
        db.add(new_vote)

    if old_is_for != new_is_for:
        other_votes_result = await db.execute(
            select(func.count(VoteModel.event_id)).where(
                VoteModel.user_id == current_user.id,
                VoteModel.activity_id == vote_in.activity_id,
                VoteModel.vote == "for",
                VoteModel.event_id != event.id,
            )
        )
        other_votes_count = other_votes_result.scalar_one() or 0

        should_increment = new_is_for and other_votes_count == 0
        should_decrement = (not new_is_for) and other_votes_count == 0

        if should_increment or should_decrement:
            activity_to_update = await db.get(Activity, vote_in.activity_id)
            if activity_to_update:
                if should_increment:
                    activity_to_update.total_upvotes += 1
                else:
                    activity_to_update.total_upvotes = max(0, activity_to_update.total_upvotes - 1)
                db.add(activity_to_update)

    participant_result = await db.execute(
        select(EventParticipant).where(
            EventParticipant.event_id == event.id,
            EventParticipant.user_id == current_user.id,
        )
    )
    participant = participant_result.scalar_one_or_none()
    if participant:
        participant.has_voted = True
    else:
        new_participant = EventParticipant(
            event_id=event.id,
            user_id=current_user.id,
            has_voted=True,
        )
        db.add(new_participant)

    await db.commit()

    result = await db.execute(
        select(Event).options(selectinload(Event.votes).selectinload(Vote.user)).where(Event.id == event.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event = enhance_event_with_user_names_helper(event)

    return event


@router.post("/events/{event_identifier}/date-options", response_model=EventSchema)
async def create_date_option(
    event_identifier: str,
    date_in: DateOptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await resolve_event_identifier(event_identifier, db)

    await ensure_user_in_room(event, current_user, db)

    if event.phase != "scheduling":
        raise HTTPException(status_code=400, detail="Can only add dates in scheduling phase")

    existing_count = await db.execute(select(func.count(DateOption.id)).where(DateOption.event_id == event.id))
    if (existing_count.scalar_one() or 0) >= 10:
        raise HTTPException(status_code=400, detail="Maximum 10 date options allowed")

    if date_in.end_time and not date_in.start_time:
        raise HTTPException(status_code=400, detail="End time requires a start time")

    new_date = DateOption(
        id=uuid4(),
        event_id=event.id,
        date=date_in.date.replace(tzinfo=None),
        start_time=date_in.start_time,
        end_time=date_in.end_time,
    )
    db.add(new_date)
    await db.commit()

    logger.info("Created date option %s for event %s", new_date.id, event.id)

    updated_event_result = await db.execute(
        select(Event)
        .where(Event.id == event.id)
        .options(
            selectinload(Event.votes).selectinload(Vote.user),
            selectinload(Event.date_options)
            .selectinload(DateOption.responses)
            .selectinload(DateResponse.user),
            selectinload(Event.participants).selectinload(EventParticipant.user),
        )
        .execution_options(populate_existing=True)
    )
    updated_event = updated_event_result.scalar_one()
    return enhance_event_full(updated_event)


@router.delete("/events/{event_identifier}/date-options/{date_option_id}", response_model=EventSchema)
async def delete_date_option(
    event_identifier: str,
    date_option_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await resolve_event_identifier(event_identifier, db)

    if event.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only event creator can delete date options")

    event_id_str = str(event.id)

    await db.execute(delete(DateResponse).where(DateResponse.date_option_id == date_option_id))

    await db.execute(
        delete(DateOption).where(DateOption.id == date_option_id, DateOption.event_id == event.id)
    )
    await db.commit()

    db.expire(event)

    return await get_event(event_id_str, db)


@router.post("/events/{event_identifier}/date-options/{date_option_id}/response", response_model=EventSchema)
async def respond_to_date(
    event_identifier: str,
    date_option_id: UUID,
    response_in: DateResponseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await resolve_event_identifier(event_identifier, db)

    await ensure_user_in_room(event, current_user, db)

    if event.phase != "scheduling":
        raise HTTPException(status_code=400, detail="Voting allowed only in scheduling phase")

    if response_in.is_priority:
        date_options_result = await db.execute(select(DateOption.id).where(DateOption.event_id == event.id))
        date_option_ids = [row.id for row in date_options_result]

        if date_option_ids:
            await db.execute(
                DateResponse.__table__.update()
                .where(
                    DateResponse.user_id == current_user.id,
                    DateResponse.date_option_id.in_(date_option_ids),
                )
                .values(is_priority=False)
            )

    existing_response = await db.execute(
        select(DateResponse).where(
            DateResponse.date_option_id == date_option_id,
            DateResponse.user_id == current_user.id,
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
            note=response_in.note,
        )
        db.add(new_resp)

    await db.commit()

    event_id_str = str(event.id)
    db.expire(event)

    updated_event = await resolve_event_identifier(
        event_id_str,
        db,
        options=[
            selectinload(Event.votes).selectinload(Vote.user),
            selectinload(Event.date_options)
            .selectinload(DateOption.responses)
            .selectinload(DateResponse.user),
            selectinload(Event.participants).selectinload(EventParticipant.user),
        ],
    )
    return enhance_event_full(updated_event)


@router.post("/events/{event_identifier}/select-activity", response_model=EventSchema)
async def select_activity(
    event_identifier: str,
    selection: SelectActivity,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await resolve_event_identifier(event_identifier, db)
    await ensure_user_in_room(event, current_user, db)
    await require_event_organizer(event, db, current_user)
    event.chosen_activity_id = selection.activity_id
    event.phase = "scheduling"
    await db.commit()
    return await get_event(str(event.id), db)


@router.post("/events/{event_identifier}/finalize-date", response_model=EventSchema)
async def finalize_date(
    event_identifier: str,
    selection: FinalizeDate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await resolve_event_identifier(event_identifier, db)
    await ensure_user_in_room(event, current_user, db)
    await require_event_organizer(event, db, current_user)
    event.final_date_option_id = selection.date_option_id
    event.phase = "info"
    await db.commit()
    return await get_event(str(event.id), db)
