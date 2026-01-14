"""
AI-related API Endpoints

Provides AI-powered features:
- Team preference analysis
- Activity suggestions for events
- Event invite generation
- Voting reminder generation
"""

from fastapi import APIRouter, Depends, HTTPException, Response
from starlette.concurrency import run_in_threadpool
import logging
import hashlib
import json
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Simple in-memory cache: {cache_key: TeamPreferenceSummary}
TEAM_ANALYSIS_CACHE = {}

from sqlalchemy.future import select
from sqlalchemy import or_
from sqlalchemy.orm import selectinload
from uuid import UUID
from datetime import datetime
from typing import List, Literal, Dict, Tuple
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.api.deps import get_current_user
from app.services.ai_service import ai_service
from app.services.email_service import email_service
from app.core.config import settings
from app.schemas.ai import (
    TeamPreferenceSummary,
    AiRecommendation,
    EventInvite,
    VotingReminder
)
from app.models.domain import Room, Event, Activity, User, RoomRole, RoomMember

router = APIRouter(prefix="/ai", tags=["ai"])


def _category_value(category: object) -> str:
    return category.value if hasattr(category, "value") else str(category)


def _calculate_normalized_category_distribution(
    members: List[User],
    activities: List[Activity],
) -> Tuple[List[dict], List[dict], List[dict], int]:
    availability_counts: Dict[str, int] = {}
    for activity in activities:
        cat_val = _category_value(activity.category)
        availability_counts[cat_val] = availability_counts.get(cat_val, 0) + 1

    total_available = sum(availability_counts.values())
    if total_available == 0:
        return [], [], [], 0

    categories = list(availability_counts.keys())
    favorites_counts = {cat: 0 for cat in categories}
    per_member_counts: List[Dict[str, int]] = []
    total_favorites = 0

    for member in members:
        member_counts: Dict[str, int] = {}
        for activity in member.favorite_activities:
            cat_val = _category_value(activity.category)
            if cat_val not in availability_counts:
                continue
            member_counts[cat_val] = member_counts.get(cat_val, 0) + 1
            favorites_counts[cat_val] = favorites_counts.get(cat_val, 0) + 1
            total_favorites += 1
        per_member_counts.append(member_counts)

    if total_favorites == 0:
        return [], [], [], 0

    availability_share = {
        cat: availability_counts[cat] / total_available for cat in categories
    }
    normalized_scores = {cat: 0.0 for cat in categories}
    contributing_users = 0

    for member_counts in per_member_counts:
        member_total = sum(member_counts.values())
        if member_total == 0:
            continue
        contributing_users += 1
        for cat in categories:
            if availability_share[cat] == 0:
                continue
            user_share = member_counts.get(cat, 0) / member_total
            normalized_scores[cat] += user_share / availability_share[cat]

    if contributing_users == 0:
        return [], [], [], total_favorites

    for cat in categories:
        normalized_scores[cat] /= contributing_users

    display_categories = [cat for cat in categories if favorites_counts[cat] > 0]
    if not display_categories:
        return [], [], [], total_favorites

    score_sum = sum(normalized_scores[cat] for cat in display_categories)
    if score_sum <= 0:
        return [], [], [], total_favorites

    normalized_distribution = []
    raw_distribution = []
    for cat in display_categories:
        percentage = round((normalized_scores[cat] / score_sum) * 100, 1)
        normalized_distribution.append(
            {
                "category": cat,
                "percentage": percentage,
                "count": favorites_counts.get(cat, 0),
            }
        )
        raw_percentage = round((favorites_counts[cat] / total_favorites) * 100, 1)
        raw_distribution.append(
            {
                "category": cat,
                "percentage": raw_percentage,
                "count": favorites_counts.get(cat, 0),
            }
        )

    normalized_distribution.sort(key=lambda x: x["percentage"], reverse=True)
    raw_distribution.sort(key=lambda x: x["percentage"], reverse=True)
    availability_distribution = [
        {"category": cat, "count": availability_counts[cat]} for cat in categories
    ]
    availability_distribution.sort(key=lambda x: x["count"], reverse=True)
    return (
        normalized_distribution,
        raw_distribution,
        availability_distribution,
        total_favorites,
    )
# ... (rest of imports)

# ... (TestAIRequest, TestAIResponse, test_ai_connection)

@router.get("/rooms/{room_id}/recommendations", response_model=TeamPreferenceSummary)
async def get_team_recommendations(
    room_id: UUID,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Analysiere Team-Präferenzen für einen Room

    Entspricht der Frontend-Funktion: getTeamRecommendations(roomId)

    Returns:
        TeamPreferenceSummary mit Kategorie-Verteilung, empfohlenen Aktivitäten und Insights
    """

    # Verify room exists and user has access
    room_result = await db.execute(
        select(Room)
        .options(selectinload(Room.members))
        .where(Room.id == room_id)
    )
    room = room_result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room nicht gefunden")

    # Check if user is member or creator
    is_creator = room.created_by_user_id == current_user.id
    is_member = False
    if not is_creator:
        member_result = await db.execute(
            select(RoomMember).where(
                RoomMember.room_id == room_id,
                RoomMember.user_id == current_user.id
            )
        )
        is_member = member_result.scalar_one_or_none() is not None

    if not (is_creator or is_member):
        raise HTTPException(status_code=403, detail="Kein Zugriff auf diesen Room")

    # Get all members (including creator) with their profiles and favorites
    members_result = await db.execute(
        select(User)
        .options(selectinload(User.favorite_activities))
        .where(
            or_(
                User.id.in_(
                    select(RoomMember.user_id).where(RoomMember.room_id == room_id)
                ),
                User.id == room.created_by_user_id
            )
        )
    )
    members = members_result.scalars().all()


    # Generate Cache Key based on members, their favorites, preferences and hobbies
    fingerprint_parts = [str(room_id)]
    for m in members:
        fav_ids = sorted([str(a.id) for a in m.favorite_activities])
        # Include preferences and hobbies in cache key
        prefs_str = json.dumps(m.activity_preferences, sort_keys=True) if m.activity_preferences else ""
        hobbies_str = ",".join(sorted(m.hobbies)) if m.hobbies else ""
        
        fingerprint_parts.append(f"{m.id}:{','.join(fav_ids)}:{prefs_str}:{hobbies_str}")
    fingerprint_parts.sort()
    
    cache_key = hashlib.md5("|".join(fingerprint_parts).encode()).hexdigest()
    
    cached_result = TEAM_ANALYSIS_CACHE.get(cache_key)

    # Get all activities
    activities_result = await db.execute(select(Activity))
    activities = activities_result.scalars().all()
    (
        normalized_distribution,
        raw_distribution,
        availability_distribution,
        total_favorites,
    ) = _calculate_normalized_category_distribution(members, activities)

    if cached_result:
        logger.info(f"Returning cached team analysis for room {room_id}")
        response.headers["X-AI-Cache"] = "hit"
        cached_result["categoryDistribution"] = (
            normalized_distribution if total_favorites > 0 else []
        )
        cached_result["memberCount"] = len(members)
        return cached_result

    # Convert to dict for AI service
    members_data = [
        {
            "name": m.name,
            "activity_preferences": m.activity_preferences,
            "hobbies": m.hobbies or [],
        }
        for m in members
    ]
    activities_data = [
        {
            "id": str(a.id),
            "title": a.title,
            "category": a.category,
            "est_price_pp": a.est_price_per_person,
            "location_region": a.location_region,
            "season": a.season,
            "primary_goal": a.primary_goal,
            "physical_intensity": a.physical_intensity,
            "social_interaction_level": a.social_interaction_level
        }
        for a in activities
    ]

    # Call AI service
    ai_result = None
    ai_error = None
    
    try:
        ai_result = await run_in_threadpool(
            ai_service.analyze_team_preferences,
            str(room_id),
            members_data,
            activities_data,
            (
                {
                    "normalized": normalized_distribution,
                    "raw": raw_distribution,
                    "availability": availability_distribution,
                    "totalFavorites": total_favorites,
                }
                if total_favorites > 0
                else None
            ),
        )
    except Exception as e:
        ai_error = str(e)
        logger.error(f"AI analysis failed: {e}")

    # Fallback if AI failed but we have real data
    if not ai_result:
        if total_favorites > 0:
            ai_result = {
                "categoryDistribution": [], # Will be overwritten
                "preferredGoals": ["teambuilding"],
                "recommendedActivityIds": [],
                "teamVibe": "mixed",
                "synergyScore": 50,
                "strengths": ["Echte Nutzerdaten vorhanden"],
                "challenges": ["KI-Analyse aktuell eingeschränkt"],
                "teamPersonality": "Die Datensammler",
                "socialVibe": "medium",
                "insights": ["KI-Analyse nicht verfügbar. Anzeige basiert auf echten Nutzerdaten."],
                "memberCount": len(members)
            }
        else:
            # No AI and no Data -> Error
            raise HTTPException(status_code=500, detail=f"AI-Analyse fehlgeschlagen: {ai_error}")

    result = ai_result
    
    # Overwrite with real data if available
    if total_favorites > 0:
        result["categoryDistribution"] = normalized_distribution
    
    # Ensure memberCount is set
    result["memberCount"] = len(members)
        
    TEAM_ANALYSIS_CACHE[cache_key] = result
    response.headers["X-AI-Cache"] = "miss"
    return result


@router.get("/events/{event_id}/suggestions", response_model=List[AiRecommendation])
async def get_activity_suggestions(
    event_id: UUID,
    use_team_preferences: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Schlage Aktivitäten für ein Event vor

    Entspricht der Frontend-Funktion: getActivitySuggestionsForEvent(eventId)

    Args:
        event_id: Event UUID
        use_team_preferences: Ob Team-Präferenzen berücksichtigt werden sollen

    Returns:
        Liste von AiRecommendation-Objekten mit Scores und Begründungen
    """

    # Get event
    event_result = await db.execute(
        select(Event).where(Event.id == event_id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event nicht gefunden")

    # Verify access (must be room member or creator of the room)
    # Fetch room creator ID first
    room_result = await db.execute(select(Room.created_by_user_id).where(Room.id == event.room_id))
    room_creator_id = room_result.scalar_one_or_none()

    is_creator = room_creator_id == current_user.id
    is_member = False
    
    if not is_creator:
        member_result = await db.execute(
            select(RoomMember).where(
                RoomMember.room_id == event.room_id,
                RoomMember.user_id == current_user.id
            )
        )
        is_member = member_result.scalar_one_or_none() is not None

    if not (is_creator or is_member):
        raise HTTPException(status_code=403, detail="Kein Zugriff auf dieses Event")

    # Get event data
    event_data = {
        "name": event.name,
        "description": event.description,
        "budget_amount": event.budget_amount,
        "budget_type": event.budget_type,
        "participant_count_estimate": event.participant_count_estimate,
        "location_region": event.location_region,
        "time_window": event.time_window,
        "phase": event.phase,
        "proposed_activity_ids": event.proposed_activity_ids or [],
        "excluded_activity_ids": event.excluded_activity_ids or []
    }

    # Get activities (exclude already proposed and excluded)
    excluded_ids = (event.proposed_activity_ids or []) + (event.excluded_activity_ids or [])

    query = select(Activity)
    if excluded_ids:
        query = query.where(~Activity.id.in_([UUID(id) for id in excluded_ids]))

    activities_result = await db.execute(query)
    activities = activities_result.scalars().all()

    activities_data = [
        {
            "id": str(a.id),
            "title": a.title,
            "category": a.category,
            "est_price_pp": a.est_price_per_person,
            "location_region": a.location_region,
            "season": a.season,
            "primary_goal": a.primary_goal,
            "typical_duration_hours": a.typical_duration_hours,
            "recommended_group_size_min": a.recommended_group_size_min,
            "recommended_group_size_max": a.recommended_group_size_max
        }
        for a in activities
    ]

    # Optionally get team preferences
    team_prefs = None
    if use_team_preferences:
        try:
            team_prefs_response = await get_team_recommendations(
                room_id=event.room_id,
                db=db,
                current_user=current_user
            )
            team_prefs = team_prefs_response.dict() if team_prefs_response else None
        except Exception as e:
            # Continue without team preferences if analysis fails
            print(f"Failed to get team preferences: {e}")
            pass

    # Call AI service
    try:
        suggestions = await run_in_threadpool(
            ai_service.suggest_activities_for_event,
            event_data,
            activities_data,
            team_prefs
        )
        return suggestions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI-Vorschläge fehlgeschlagen: {str(e)}")


@router.post("/events/{event_id}/invites", response_model=dict)
async def send_event_invites(
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generiere und versende Event-Einladungen

    Entspricht der Frontend-Funktion: sendEventInvites(eventId)

    Returns:
        Dict mit Anzahl versendeter Einladungen: {"sent": number}
    """

    # Get event with participants
    event_result = await db.execute(
        select(Event)
        .options(selectinload(Event.participants))
        .where(Event.id == event_id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event nicht gefunden")

    # Only organizers can send invites
    if event.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nur Event-Ersteller können Einladungen senden")

    event_data = {
        "name": event.name,
        "description": event.description,
        "phase": event.phase,
        "budget_amount": event.budget_amount,
        "budget_type": event.budget_type,
        "participant_count_estimate": event.participant_count_estimate
    }

    # Generate invites for all participants
    sent_count = 0
    for participant in event.participants:
        # Get user details
        user_result = await db.execute(
            select(User).where(User.id == participant.user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            continue

        user_data = {
            "name": user.name,
            "email": user.email
        }

        role = "organizer" if participant.is_organizer else "participant"

        try:
            invite = await run_in_threadpool(
                ai_service.generate_event_invite,
                event_data,
                user_data,
                role
            )

            # Actually send email here
            await email_service.send_ai_generated_invite(
                user_email=user.email,
                subject=invite["subject"],
                body=invite["body"],
                call_to_action_text=invite["callToAction"],
                call_to_action_url=f"{settings.FRONTEND_URL}/rooms/{event.room_id}/events/{event_id}"
            )

            sent_count += 1
        except Exception as e:
            print(f"Failed to generate/send invite for {user.name}: {e}")
            continue

    return {"sent": sent_count}


@router.post("/events/{event_id}/voting-reminders", response_model=dict)
async def send_voting_reminders(
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sende Voting-Erinnerungen

    Entspricht der Frontend-Funktion: sendVotingReminder(eventId)

    Returns:
        Dict mit Anzahl versendeter Erinnerungen: {"sent": number}
    """

    # Get event with participants
    event_result = await db.execute(
        select(Event)
        .options(selectinload(Event.participants))
        .where(Event.id == event_id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event nicht gefunden")

    # Only organizers can send reminders
    if event.created_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nur Event-Ersteller können Erinnerungen senden")

        # Only allow reminders in voting or scheduling phase
    if event.phase not in ("voting", "scheduling"):
        raise HTTPException(status_code=400, detail="Voting-Reminder nur in Voting- oder Terminfindungs-Phase erlaubt")

# Calculate days until deadline
    if not event.voting_deadline:
        raise HTTPException(status_code=400, detail="Event hat keine Voting-Deadline")

    days_until = (event.voting_deadline - datetime.now()).days

    event_data = {
        "name": event.name,
        "phase": event.phase
    }

    # Send reminders to participants who haven't voted
    sent_count = 0
    for participant in event.participants:
        if participant.has_voted:
            continue  # Skip users who already voted

        user_result = await db.execute(
            select(User).where(User.id == participant.user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            continue

        user_data = {
            "name": user.name,
            "email": user.email
        }

        try:
            reminder = await run_in_threadpool(
                ai_service.generate_voting_reminder,
                event_data,
                user_data,
                days_until
            )

            # Send email
            await email_service.send_voting_reminder(
                user_email=user.email,
                user_name=user.name,
                event_name=event.name,
                event_id=str(event.id),
                deadline=event.voting_deadline.strftime("%d.%m.%Y") if event.voting_deadline else "Unbekannt",
                days_remaining=days_until
            )

            sent_count += 1
        except Exception as e:
            print(f"Failed to generate/send reminder for {user.name}: {e}")
            continue

    return {"sent": sent_count}
