"""
AI-related API Endpoints

Provides AI-powered features:
- Team preference analysis
- Activity suggestions for events
- Event invite generation
- Voting reminder generation
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from uuid import UUID
from datetime import datetime
from typing import List, Literal
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
from app.models.domain import Room, Event, Activity, User, RoomRole

router = APIRouter(prefix="/ai", tags=["ai"])


# Test endpoint for OpenRouter API
AIModel = Literal[
    "deepseek/deepseek-v3.2-exp",
    "x-ai/grok-4.1-fast:free",
    "x-ai/grok-4-fast",
    "qwen/qwen3-235b-a22b-thinking-2507",
    "z-ai/glm-4.5-air:free",
    "openai/gpt-5-nano"
]

class TestAIRequest(BaseModel):
    """Request model for AI test endpoint"""
    message: str = Field(
        description="Your message to the AI",
        example="Erzähl mir einen Witz über Teambuilding"
    )
    model: AIModel = Field(
        default="deepseek/deepseek-v3.2-exp",
        description="OpenRouter model to use"
    )


class TestAIResponse(BaseModel):
    """Response model for AI test endpoint"""
    response: str = Field(description="AI's response")
    ai_model_used: str = Field(description="Model that was used")


@router.post("/test", response_model=TestAIResponse)
async def test_ai_connection(
    request: TestAIRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Test-Endpoint für OpenRouter API

    Sendet eine einfache Nachricht an OpenRouter und gibt die Antwort zurück.
    Nützlich zum Testen ob der API-Key funktioniert und die Verbindung steht.

    Args:
        request: TestAIRequest mit message und optional model

    Returns:
        TestAIResponse mit der AI-Antwort

    Raises:
        HTTPException: Wenn AI-Service nicht konfiguriert ist oder API-Call fehlschlägt
    """

    if not ai_service.client:
        raise HTTPException(
            status_code=503,
            detail="AI Service nicht konfiguriert - OPENROUTER_API_KEY fehlt in den Environment-Variablen"
        )

    try:
        messages = [
            {
                "role": "system",
                "content": "Du bist ein hilfreicher Assistent. Antworte kurz und prägnant auf Deutsch."
            },
            {
                "role": "user",
                "content": request.message
            }
        ]

        response = ai_service._make_completion(
            model=request.model,
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )

        return TestAIResponse(
            response=response,
            ai_model_used=request.model
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"OpenRouter API Fehler: {str(e)}"
        )


@router.get("/rooms/{room_id}/recommendations", response_model=TeamPreferenceSummary)
async def get_team_recommendations(
    room_id: UUID,
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

    # Check if user is member
    member_result = await db.execute(
        select(RoomRole).where(
            RoomRole.room_id == room_id,
            RoomRole.user_id == current_user.id
        )
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Kein Zugriff auf diesen Room")

    # Get all members with their profiles
    members_result = await db.execute(
        select(User)
        .join(RoomRole, RoomRole.user_id == User.id)
        .where(RoomRole.room_id == room_id)
    )
    members = members_result.scalars().all()

    # Convert to dict for AI service
    members_data = [
        {
            "name": m.name,
            "budget_preference": m.budget_preference,
            "travel_willingness": m.travel_willingness,
            "activity_preferences": m.activity_preferences,
            "hobbies": m.hobbies or [],
            "preferred_group_size": m.preferred_group_size
        }
        for m in members
    ]

    # Get all activities
    activities_result = await db.execute(select(Activity))
    activities = activities_result.scalars().all()
    activities_data = [
        {
            "id": str(a.id),
            "title": a.title,
            "category": a.category,
            "est_price_pp": a.est_price_pp,
            "location_region": a.location_region,
            "season": a.season,
            "primary_goal": a.primary_goal,
            "physical_intensity": a.physical_intensity,
            "social_interaction_level": a.social_interaction_level
        }
        for a in activities
    ]

    # Call AI service
    try:
        result = ai_service.analyze_team_preferences(
            room_id=str(room_id),
            members=members_data,
            activities=activities_data
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI-Analyse fehlgeschlagen: {str(e)}")


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

    # Verify access (must be room member)
    member_result = await db.execute(
        select(RoomRole).where(
            RoomRole.room_id == event.room_id,
            RoomRole.user_id == current_user.id
        )
    )
    if not member_result.scalar_one_or_none():
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
            "est_price_pp": a.est_price_pp,
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
        suggestions = ai_service.suggest_activities_for_event(
            event=event_data,
            activities=activities_data,
            team_preferences=team_prefs
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
            invite = ai_service.generate_event_invite(
                event=event_data,
                recipient=user_data,
                role=role
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
            reminder = ai_service.generate_voting_reminder(
                event=event_data,
                recipient=user_data,
                days_until_deadline=days_until
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
