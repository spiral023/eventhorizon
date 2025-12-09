# OpenRouter API Integration Guide

## Übersicht

Diese Dokumentation beschreibt die Integration der OpenRouter API in das eventhorizon-Projekt zur Implementierung von KI-Features wie Team-Analysen, Aktivitätsempfehlungen und intelligente Benachrichtigungen.

## Inhaltsverzeichnis

1. [Architektur](#architektur)
2. [Setup](#setup)
3. [Use Cases](#use-cases)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Integration](#frontend-integration)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Architektur

### Kommunikationsfluss

```
Frontend (React)
    ↓ HTTP Request
Backend (FastAPI)
    ↓ OpenRouter SDK/API
OpenRouter API
    ↓ Model Selection
AI Model (GPT-4, Claude, Gemini, etc.)
```

**Warum Backend-seitig?**
- ✅ API-Key bleibt sicher (nicht im Frontend exposed)
- ✅ Zugriff auf Datenbank für kontextuelle Analysen
- ✅ Rate Limiting und Caching zentral steuerbar
- ✅ Kostenüberwachung und Logging möglich

### Modell-Empfehlungen

Für eventhorizon-spezifische Anforderungen:

| Use Case | Empfohlenes Modell | Begründung |
|----------|-------------------|------------|
| Team-Analysen | `anthropic/claude-3.5-sonnet` | Exzellente analytische Fähigkeiten, gute Structured Outputs |
| Aktivitäts-Matching | `openai/gpt-4o` | Schnell, günstig, gute Reasoning-Fähigkeiten |
| Text-Generierung (Einladungen) | `google/gemini-2.0-flash-exp` | Sehr schnell, günstig, gute Textqualität |
| Komplexe Multi-Tool-Analysen | `anthropic/claude-opus-4` | Beste Reasoning-Fähigkeiten, Interleaved Thinking |

---

## Setup

### 1. Backend Dependencies

Installiere die benötigten Python-Packages:

```bash
# Im backend/ Verzeichnis
pip install openai python-dotenv
```

**Warum `openai`?** Die OpenAI SDK ist kompatibel mit OpenRouter (nur `base_url` ändern).

### 2. Environment Variables

Füge deinen OpenRouter API Key zur `backend/.env` hinzu:

```env
# OpenRouter API Configuration
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_APP_NAME=EventHorizon
OPENROUTER_SITE_URL=https://yourdomain.com  # Optional für Rankings
```

**Wichtig**: `.env` ist bereits in `.gitignore` - niemals API Keys committen!

### 3. Backend-Struktur erstellen

```
backend/app/
├── services/
│   ├── __init__.py
│   └── ai_service.py          # OpenRouter Integration
├── schemas/
│   └── ai.py                  # Pydantic Schemas für AI Responses
└── api/
    └── endpoints/
        └── ai.py              # AI Endpoints
```

---

## Use Cases

### 1. Team-Präferenz-Analyse (`getTeamRecommendations`)

**Ziel**: Analysiere User-Präferenzen eines Rooms und empfehle passende Aktivitäten.

**Input**:
- Room Members (aus Datenbank)
- User Profile Data (Hobbies, Activity Preferences, Budget, Travel Willingness)
- Bisherige Event-Historie

**Output** (Structured):
```typescript
{
  categoryDistribution: { category: string, percentage: number }[],
  preferredGoals: PrimaryGoal[],
  recommendedActivityIds: string[],
  teamVibe: "action" | "relax" | "mixed",
  insights: string[]
}
```

**AI-Aufgabe**:
- Aggregiere individuelle Präferenzen
- Erkenne Team-Dynamik (z.B. "ausgeglichenes Team" vs "abenteuerlustige Gruppe")
- Berücksichtige Budget-Constraints
- Schlage konkrete Aktivitäten vor

---

### 2. Event-spezifische Aktivitätsvorschläge (`getActivitySuggestionsForEvent`)

**Ziel**: Schlage die besten Aktivitäten für ein spezifisches Event vor.

**Input**:
- Event Details (Budget, Teilnehmerzahl, Zeitfenster, Region)
- Bereits vorgeschlagene Aktivitäten
- Ausgeschlossene Aktivitäten
- Team-Präferenzen

**Output** (Structured):
```typescript
{
  activityId: string,
  score: number,      // 0-100
  reason: string,     // "Perfekt für euer Budget und die Sommersaison..."
  matchFactors: {
    budgetMatch: number,
    seasonMatch: number,
    groupSizeMatch: number,
    preferenceMatch: number
  }
}[]
```

**AI-Aufgabe**:
- Ranke alle verfügbaren Aktivitäten
- Erkläre Ranking-Gründe
- Berücksichtige multi-dimensionale Constraints

---

### 3. Event-Einladungen generieren (`sendEventInvites`)

**Ziel**: Generiere personalisierte Einladungstexte.

**Input**:
- Event Details
- Recipient User Info
- Beziehung zum Event (Organizer, Teilnehmer)

**Output** (Structured):
```typescript
{
  subject: string,
  body: string,        // Personalisierter Text
  callToAction: string // "Jetzt abstimmen" / "Teilnahme bestätigen"
}
```

**AI-Aufgabe**:
- Personalisiere Ansprache
- Fasse Event-Details zusammen
- Erzeuge motivierenden Call-to-Action
- Verwende deutschen Ton (freundlich, professionell)

---

### 4. Voting-Erinnerungen (`sendVotingReminder`)

**Ziel**: Erzeuge freundliche Reminder für ausstehende Votes.

**Input**:
- Event Details
- Voting Deadline
- User's bisherige Aktivität

**Output** (Structured):
```typescript
{
  subject: string,
  body: string,
  urgency: "low" | "medium" | "high"
}
```

---

## Backend Implementation

### 1. AI Service Layer (`backend/app/services/ai_service.py`)

```python
from openai import OpenAI
from typing import List, Dict, Any, Optional
import json
import os
from app.core.config import settings

class AIService:
    """
    OpenRouter AI Service für EventHorizon

    Verwendet die OpenAI SDK mit OpenRouter als base_url.
    Alle Calls verwenden Structured Outputs für type-safe Responses.
    """

    def __init__(self):
        self.client = OpenAI(
            base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
            api_key=os.getenv("OPENROUTER_API_KEY"),
        )
        self.default_headers = {
            "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", ""),
            "X-Title": os.getenv("OPENROUTER_APP_NAME", "EventHorizon"),
        }

    def _make_completion(
        self,
        model: str,
        messages: List[Dict[str, str]],
        response_format: Optional[Dict[str, Any]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> str:
        """
        Basis-Funktion für alle AI-Calls
        """
        try:
            completion = self.client.chat.completions.create(
                extra_headers=self.default_headers,
                model=model,
                messages=messages,
                response_format=response_format,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return completion.choices[0].message.content
        except Exception as e:
            # Log error (integrate with your logging system)
            raise Exception(f"OpenRouter API Error: {str(e)}")

    def analyze_team_preferences(
        self,
        room_id: str,
        members: List[Dict],
        activities: List[Dict]
    ) -> Dict[str, Any]:
        """
        Analysiere Team-Präferenzen für einen Room

        Args:
            room_id: Room UUID
            members: Liste von User-Objekten mit Präferenzen
            activities: Verfügbare Aktivitäten aus der Datenbank

        Returns:
            TeamPreferenceSummary als Dict
        """

        # Structured Output Schema
        schema = {
            "type": "json_schema",
            "json_schema": {
                "name": "team_analysis",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "categoryDistribution": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "category": {"type": "string"},
                                    "percentage": {"type": "number"}
                                },
                                "required": ["category", "percentage"],
                                "additionalProperties": False
                            }
                        },
                        "preferredGoals": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "recommendedActivityIds": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "teamVibe": {
                            "type": "string",
                            "enum": ["action", "relax", "mixed"]
                        },
                        "insights": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    },
                    "required": [
                        "categoryDistribution",
                        "preferredGoals",
                        "recommendedActivityIds",
                        "teamVibe",
                        "insights"
                    ],
                    "additionalProperties": False
                }
            }
        }

        # Prepare context
        members_summary = self._summarize_members(members)
        activities_summary = self._summarize_activities(activities)

        messages = [
            {
                "role": "system",
                "content": """Du bist ein Experte für Team-Dynamik und Event-Planung.
                Analysiere die Präferenzen der Team-Mitglieder und empfehle passende Aktivitäten.
                Antworte auf Deutsch mit präzisen, umsetzbaren Insights."""
            },
            {
                "role": "user",
                "content": f"""Analysiere dieses Team:

**Team-Mitglieder ({len(members)} Personen):**
{members_summary}

**Verfügbare Aktivitäten:**
{activities_summary}

Aufgabe:
1. Ermittle die bevorzugten Aktivitätskategorien (als Prozentverteilung)
2. Identifiziere die Haupt-Ziele (z.B. teambuilding, fun, relax)
3. Empfehle die 3-5 besten Aktivitäten (IDs aus der Liste)
4. Bestimme den Team-Vibe (action/relax/mixed)
5. Gib 2-3 prägnante Insights über die Team-Dynamik

Berücksichtige:
- Budget-Präferenzen der Mitglieder
- Reisebereitschaft
- Physische Intensität vs. Team-Fitness
- Saisonale Verfügbarkeit
- Gruppengröße"""
            }
        ]

        response = self._make_completion(
            model="anthropic/claude-3.5-sonnet",
            messages=messages,
            response_format=schema,
            temperature=0.5
        )

        return json.loads(response)

    def suggest_activities_for_event(
        self,
        event: Dict,
        activities: List[Dict],
        team_preferences: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        """
        Schlage die besten Aktivitäten für ein Event vor

        Args:
            event: Event-Objekt mit Budget, Zeitfenster, Region, etc.
            activities: Alle verfügbaren Aktivitäten
            team_preferences: Optional - Ergebnis von analyze_team_preferences()

        Returns:
            Liste von AiRecommendation-Objekten
        """

        schema = {
            "type": "json_schema",
            "json_schema": {
                "name": "activity_suggestions",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "suggestions": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "activityId": {"type": "string"},
                                    "score": {"type": "number"},
                                    "reason": {"type": "string"},
                                    "matchFactors": {
                                        "type": "object",
                                        "properties": {
                                            "budgetMatch": {"type": "number"},
                                            "seasonMatch": {"type": "number"},
                                            "groupSizeMatch": {"type": "number"},
                                            "preferenceMatch": {"type": "number"}
                                        },
                                        "required": ["budgetMatch", "seasonMatch", "groupSizeMatch", "preferenceMatch"],
                                        "additionalProperties": False
                                    }
                                },
                                "required": ["activityId", "score", "reason", "matchFactors"],
                                "additionalProperties": False
                            }
                        }
                    },
                    "required": ["suggestions"],
                    "additionalProperties": False
                }
            }
        }

        event_context = self._format_event_context(event)
        activities_list = self._format_activities_list(activities)
        team_context = json.dumps(team_preferences, indent=2) if team_preferences else "Keine Team-Präferenzen verfügbar"

        messages = [
            {
                "role": "system",
                "content": """Du bist ein Experte für Event-Planung.
                Ranke Aktivitäten basierend auf Event-Anforderungen und Team-Präferenzen.
                Bewerte jeden Match-Faktor von 0-100. Score = Durchschnitt aller Faktoren."""
            },
            {
                "role": "user",
                "content": f"""Event-Details:
{event_context}

Team-Präferenzen:
{team_context}

Verfügbare Aktivitäten:
{activities_list}

Aufgabe:
Empfehle die 5 besten Aktivitäten für dieses Event.

Bewertungskriterien:
- budgetMatch: Passt die Aktivität ins Budget? (100 = perfekt, 0 = zu teuer)
- seasonMatch: Passt zur Saison/Zeitfenster? (100 = ideal, 0 = unmöglich)
- groupSizeMatch: Passt zur Teilnehmerzahl? (100 = optimal, 0 = zu klein/groß)
- preferenceMatch: Passt zu Team-Präferenzen? (100 = perfekt, 0 = nicht passend)

Gib eine kurze, überzeugende Begründung auf Deutsch."""
            }
        ]

        response = self._make_completion(
            model="openai/gpt-4o",
            messages=messages,
            response_format=schema,
            temperature=0.3
        )

        data = json.loads(response)
        return data["suggestions"]

    def generate_event_invite(
        self,
        event: Dict,
        recipient: Dict,
        role: str  # "organizer" or "participant"
    ) -> Dict[str, str]:
        """
        Generiere personalisierte Event-Einladung
        """

        schema = {
            "type": "json_schema",
            "json_schema": {
                "name": "event_invite",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "subject": {"type": "string"},
                        "body": {"type": "string"},
                        "callToAction": {"type": "string"}
                    },
                    "required": ["subject", "body", "callToAction"],
                    "additionalProperties": False
                }
            }
        }

        messages = [
            {
                "role": "system",
                "content": """Du bist ein freundlicher Event-Manager.
                Schreibe persönliche, motivierende Einladungen auf Deutsch.
                Ton: Professionell aber warm, kurz und prägnant."""
            },
            {
                "role": "user",
                "content": f"""Schreibe eine Event-Einladung:

Empfänger: {recipient.get('name', 'Team-Mitglied')}
Rolle: {role}

Event:
- Name: {event.get('name')}
- Beschreibung: {event.get('description', 'Kein Text')}
- Phase: {event.get('phase')}
- Budget: {event.get('budget_amount')} € {event.get('budget_type')}
- Teilnehmer: ~{event.get('participant_count_estimate', '?')} Personen

Betreff: Kurz und einladend (max 60 Zeichen)
Text: 2-3 Absätze, persönlich, informativ
Call-to-Action: Button-Text (z.B. "Jetzt abstimmen!")"""
            }
        ]

        response = self._make_completion(
            model="google/gemini-2.0-flash-exp",
            messages=messages,
            response_format=schema,
            temperature=0.8
        )

        return json.loads(response)

    def generate_voting_reminder(
        self,
        event: Dict,
        recipient: Dict,
        days_until_deadline: int
    ) -> Dict[str, str]:
        """
        Generiere Voting-Erinnerung
        """

        urgency = "high" if days_until_deadline <= 1 else "medium" if days_until_deadline <= 3 else "low"

        schema = {
            "type": "json_schema",
            "json_schema": {
                "name": "voting_reminder",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "subject": {"type": "string"},
                        "body": {"type": "string"},
                        "urgency": {
                            "type": "string",
                            "enum": ["low", "medium", "high"]
                        }
                    },
                    "required": ["subject", "body", "urgency"],
                    "additionalProperties": False
                }
            }
        }

        messages = [
            {
                "role": "system",
                "content": """Du bist ein freundlicher Reminder-Bot.
                Schreibe kurze, motivierende Erinnerungen auf Deutsch.
                Keine Druck, aber klarer Call-to-Action."""
            },
            {
                "role": "user",
                "content": f"""Schreibe eine Abstimmungs-Erinnerung:

Empfänger: {recipient.get('name')}
Event: {event.get('name')}
Deadline: in {days_until_deadline} Tag(en)
Dringlichkeit: {urgency}

Betreff: Freundlich und klar
Text: Kurz, erinnert an Deadline, motiviert zum Abstimmen"""
            }
        ]

        response = self._make_completion(
            model="google/gemini-2.0-flash-exp",
            messages=messages,
            response_format=schema,
            temperature=0.7
        )

        return json.loads(response)

    # Helper methods

    def _summarize_members(self, members: List[Dict]) -> str:
        """Format member data for AI context"""
        lines = []
        for m in members[:20]:  # Limit to prevent token overflow
            prefs = m.get('activity_preferences', {})
            lines.append(
                f"- {m.get('name', 'Unknown')}: "
                f"Budget={m.get('budget_preference', '?')}, "
                f"Reise={m.get('travel_willingness', '?')}, "
                f"Präferenzen={prefs}"
            )
        return "\n".join(lines)

    def _summarize_activities(self, activities: List[Dict]) -> str:
        """Format activities for AI context"""
        lines = []
        for a in activities[:50]:  # Limit to top 50
            lines.append(
                f"- [{a.get('id')}] {a.get('title')}: "
                f"Kategorie={a.get('category')}, "
                f"Preis={a.get('est_price_pp')}€, "
                f"Region={a.get('location_region')}, "
                f"Saison={a.get('season')}"
            )
        return "\n".join(lines)

    def _format_event_context(self, event: Dict) -> str:
        """Format event details for AI"""
        return f"""
Name: {event.get('name')}
Beschreibung: {event.get('description', 'Keine Beschreibung')}
Budget: {event.get('budget_amount')} € ({event.get('budget_type')})
Teilnehmer: {event.get('participant_count_estimate', '?')} Personen
Region: {event.get('location_region', 'Nicht festgelegt')}
Zeitfenster: {event.get('time_window', {})}
Phase: {event.get('phase')}
        """

    def _format_activities_list(self, activities: List[Dict]) -> str:
        """Format full activities list"""
        return self._summarize_activities(activities)


# Singleton instance
ai_service = AIService()
```

---

### 2. Pydantic Schemas (`backend/app/schemas/ai.py`)

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from uuid import UUID

class CategoryDistribution(BaseModel):
    category: str
    percentage: float = Field(ge=0, le=100)

class TeamPreferenceSummary(BaseModel):
    category_distribution: List[CategoryDistribution] = Field(alias="categoryDistribution")
    preferred_goals: List[str] = Field(alias="preferredGoals")
    recommended_activity_ids: List[str] = Field(alias="recommendedActivityIds")
    team_vibe: Literal["action", "relax", "mixed"] = Field(alias="teamVibe")
    insights: List[str]

    class Config:
        populate_by_name = True

class MatchFactors(BaseModel):
    budget_match: float = Field(ge=0, le=100, alias="budgetMatch")
    season_match: float = Field(ge=0, le=100, alias="seasonMatch")
    group_size_match: float = Field(ge=0, le=100, alias="groupSizeMatch")
    preference_match: float = Field(ge=0, le=100, alias="preferenceMatch")

    class Config:
        populate_by_name = True

class AiRecommendation(BaseModel):
    activity_id: str = Field(alias="activityId")
    score: float = Field(ge=0, le=100)
    reason: str
    match_factors: MatchFactors = Field(alias="matchFactors")

    class Config:
        populate_by_name = True

class EventInvite(BaseModel):
    subject: str
    body: str
    call_to_action: str = Field(alias="callToAction")

    class Config:
        populate_by_name = True

class VotingReminder(BaseModel):
    subject: str
    body: str
    urgency: Literal["low", "medium", "high"]
```

---

### 3. API Endpoints (`backend/app/api/endpoints/ai.py`)

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from uuid import UUID
from datetime import datetime

from app.db.session import get_db
from app.api.deps import get_current_user
from app.services.ai_service import ai_service
from app.schemas.ai import (
    TeamPreferenceSummary,
    AiRecommendation,
    EventInvite,
    VotingReminder
)
from app.models.domain import Room, Event, Activity, User, RoomRole

router = APIRouter(prefix="/ai", tags=["ai"])

@router.get("/rooms/{room_id}/recommendations", response_model=TeamPreferenceSummary)
async def get_team_recommendations(
    room_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Analysiere Team-Präferenzen für einen Room

    Entspricht der Frontend-Funktion: getTeamRecommendations(roomId)
    """

    # Verify room membership
    room_result = await db.execute(
        select(Room)
        .options(selectinload(Room.members))
        .where(Room.id == room_id)
    )
    room = room_result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room nicht gefunden")

    # Check if user is member
    is_member = any(m.user_id == current_user.id for m in room.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Kein Zugriff auf diesen Room")

    # Get all members with their profiles
    member_ids = [m.user_id for m in room.members]
    members_result = await db.execute(
        select(User).where(User.id.in_(member_ids))
    )
    members = members_result.scalars().all()

    # Convert to dict for AI service
    members_data = [
        {
            "name": m.name,
            "budget_preference": m.budget_preference,
            "travel_willingness": m.travel_willingness,
            "activity_preferences": m.activity_preferences,
            "hobbies": m.hobbies,
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
    """

    # Get event
    event_result = await db.execute(
        select(Event).where(Event.id == event_id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event nicht gefunden")

    # Verify access (must be participant or room member)
    room_result = await db.execute(
        select(Room).where(Room.id == event.room_id)
    )
    room = room_result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room nicht gefunden")

    # Check membership
    room_member_result = await db.execute(
        select(RoomRole).where(
            RoomRole.room_id == room.id,
            RoomRole.user_id == current_user.id
        )
    )
    if not room_member_result.scalar_one_or_none():
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
    activities_result = await db.execute(
        select(Activity).where(~Activity.id.in_(excluded_ids) if excluded_ids else True)
    )
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
            # This calls the AI service internally
            team_prefs = await get_team_recommendations(
                room_id=event.room_id,
                db=db,
                current_user=current_user
            )
        except:
            pass  # Continue without team preferences

    # Call AI service
    try:
        suggestions = ai_service.suggest_activities_for_event(
            event=event_data,
            activities=activities_data,
            team_preferences=team_prefs.dict() if team_prefs else None
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
    """

    # Get event
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

            # TODO: Actually send email here
            # await email_service.send_email(
            #     to=user.email,
            #     subject=invite["subject"],
            #     body=invite["body"]
            # )

            sent_count += 1
        except Exception as e:
            print(f"Failed to generate invite for {user.name}: {e}")
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
    """

    # Get event
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

            # TODO: Send email
            # await email_service.send_email(
            #     to=user.email,
            #     subject=reminder["subject"],
            #     body=reminder["body"]
            # )

            sent_count += 1
        except Exception as e:
            print(f"Failed to generate reminder for {user.name}: {e}")
            continue

    return {"sent": sent_count}
```

---

### 4. Router registrieren (`backend/app/api/api.py`)

Füge den AI-Router hinzu:

```python
# Existing imports...
from app.api.endpoints import auth, users
from app.api.endpoints.ai import router as ai_router  # NEW

router = APIRouter()

# Nested routers
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(ai_router)  # NEW

# ... rest of file
```

---

## Frontend Integration

### 1. Update `apiClient.ts`

Ersetze die Mock-Implementierungen durch echte Backend-Calls:

```typescript
// frontend/src/services/apiClient.ts

// Remove mock implementations, use real API calls:

export async function getTeamRecommendations(roomId: string): Promise<ApiResult<TeamPreferenceSummary>> {
  if (USE_MOCKS) {
    // Keep existing mock for development
    await delay(600);
    const summary: TeamPreferenceSummary = {
      categoryDistribution: [
        { category: "action", percentage: 35 },
        { category: "food", percentage: 25 },
        { category: "outdoor", percentage: 20 },
        { category: "relax", percentage: 15 },
        { category: "creative", percentage: 5 },
      ],
      preferredGoals: ["teambuilding", "fun"],
      recommendedActivityIds: ["act-1"],
      teamVibe: "action",
      insights: [
        "Euer Team bevorzugt aktive Erlebnisse mit Wettbewerbscharakter.",
      ],
    };
    return { data: summary };
  }

  const result = await request<any>(`/ai/rooms/${roomId}/recommendations`);
  if (result.data) {
    return { data: result.data };
  }
  return { data: null as any, error: result.error };
}

export async function getActivitySuggestionsForEvent(eventId: string): Promise<ApiResult<AiRecommendation[]>> {
  if (USE_MOCKS) {
    await delay(500);
    return { data: [] };
  }

  const result = await request<any[]>(`/ai/events/${eventId}/suggestions`);
  if (result.data) {
    return { data: result.data };
  }
  return { data: [], error: result.error };
}

export async function sendEventInvites(eventId: string): Promise<ApiResult<{ sent: number }>> {
  if (USE_MOCKS) {
    await delay(800);
    return { data: { sent: 5 } };
  }

  const result = await request<{ sent: number }>(`/ai/events/${eventId}/invites`, {
    method: 'POST',
  });
  if (result.data) {
    return { data: result.data };
  }
  return { data: { sent: 0 }, error: result.error };
}

export async function sendVotingReminder(eventId: string): Promise<ApiResult<{ sent: number }>> {
  if (USE_MOCKS) {
    await delay(600);
    return { data: { sent: 3 } };
  }

  const result = await request<{ sent: number }>(`/ai/events/${eventId}/voting-reminders`, {
    method: 'POST',
  });
  if (result.data) {
    return { data: result.data };
  }
  return { data: { sent: 0 }, error: result.error };
}
```

---

## Best Practices

### 1. Prompt Engineering

**DO:**
- ✅ Klare, strukturierte Prompts mit Kontext
- ✅ Deutsche Sprache explizit erwähnen
- ✅ Beispiele für erwartete Outputs geben
- ✅ Temperature anpassen (0.3 für faktisch, 0.8 für kreativ)
- ✅ Structured Outputs für type-safety verwenden

**DON'T:**
- ❌ Vage Anweisungen ohne Kontext
- ❌ Zu lange Prompts (max ~8000 tokens)
- ❌ Sensible Daten in Prompts (DSGVO!)
- ❌ Ohne Error-Handling

### 2. Token-Optimierung

```python
# BAD: Zu viel Kontext
activities_text = json.dumps(all_activities, indent=2)  # 50+ activities

# GOOD: Nur relevante Felder
activities_text = "\n".join([
    f"{a['id']}: {a['title']} ({a['category']}, {a['price']}€)"
    for a in all_activities[:30]  # Limit
])
```

### 3. Caching

Für wiederholte Anfragen:

```python
from functools import lru_cache
from datetime import datetime, timedelta

class AIService:
    def __init__(self):
        self._cache = {}

    def _get_cached(self, key: str, ttl_minutes: int = 60):
        if key in self._cache:
            cached_at, value = self._cache[key]
            if datetime.now() - cached_at < timedelta(minutes=ttl_minutes):
                return value
        return None

    def analyze_team_preferences(self, room_id: str, members, activities):
        cache_key = f"team_prefs_{room_id}"
        cached = self._get_cached(cache_key, ttl_minutes=120)
        if cached:
            return cached

        result = self._make_completion(...)
        self._cache[cache_key] = (datetime.now(), result)
        return result
```

### 4. Error-Handling

```python
try:
    result = ai_service.analyze_team_preferences(...)
except Exception as e:
    logger.error(f"OpenRouter API failed: {str(e)}")
    # Fallback to simple algorithm or cached result
    result = get_fallback_recommendations(room_id)
```

### 5. Kosten-Monitoring

```python
import logging

logger = logging.getLogger("openrouter")

def _make_completion(self, ...):
    logger.info(f"OpenRouter request: model={model}, tokens_estimate={len(messages)}")

    start = time.time()
    response = self.client.chat.completions.create(...)
    duration = time.time() - start

    logger.info(f"OpenRouter response: tokens={response.usage.total_tokens}, duration={duration:.2f}s")

    # Track costs (example prices)
    cost = self._estimate_cost(model, response.usage.total_tokens)
    logger.info(f"Estimated cost: ${cost:.4f}")

    return response.choices[0].message.content
```

---

## Troubleshooting

### Problem: "OpenRouter API Error: 401 Unauthorized"

**Lösung**: API-Key prüfen
```bash
# Im backend/ Verzeichnis
echo $OPENROUTER_API_KEY  # Linux/Mac
echo %OPENROUTER_API_KEY%  # Windows

# Oder in Python:
python -c "import os; print(os.getenv('OPENROUTER_API_KEY'))"
```

### Problem: "Model not found"

**Lösung**: Modell-Namen überprüfen auf [openrouter.ai/models](https://openrouter.ai/models)

```python
# Format: provider/model-name
"openai/gpt-4o"           # ✓ Correct
"gpt-4o"                  # ✗ Wrong
"openai/gpt-4-turbo"      # ✓ Correct
```

### Problem: Structured Outputs fehlschlagen

**Lösung 1**: Modell unterstützt keine Structured Outputs
- Liste prüfen: [Supported Models](https://openrouter.ai/models?supported_parameters=structured_outputs)
- Fallback auf JSON mode: `response_format={"type": "json_object"}`

**Lösung 2**: Schema ist invalid
```python
# Teste Schema separat:
import jsonschema

schema = {...}
jsonschema.Draft7Validator.check_schema(schema)
```

### Problem: Responses sind auf Englisch statt Deutsch

**Lösung**: Sprache explizit im System-Prompt angeben
```python
{
    "role": "system",
    "content": "Du bist ein Experte. WICHTIG: Antworte IMMER auf Deutsch."
}
```

### Problem: Zu hohe Kosten

**Lösungen**:
1. Günstigere Modelle verwenden (Gemini Flash statt GPT-4)
2. Caching implementieren (siehe Best Practices)
3. Kontext kürzen (nur relevante Daten senden)
4. Rate Limiting einbauen

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.get("/ai/rooms/{room_id}/recommendations")
@limiter.limit("5/minute")  # Max 5 requests per minute
async def get_team_recommendations(...):
    ...
```

---

## Testing

### Unit Tests für AI Service

```python
# backend/tests/test_ai_service.py

import pytest
from unittest.mock import Mock, patch
from app.services.ai_service import AIService

@pytest.fixture
def ai_service():
    return AIService()

@pytest.fixture
def mock_openai_response():
    return {
        "choices": [{
            "message": {
                "content": '{"categoryDistribution": [], "preferredGoals": [], ...}'
            }
        }]
    }

def test_analyze_team_preferences(ai_service, mock_openai_response):
    with patch.object(ai_service.client.chat.completions, 'create', return_value=mock_openai_response):
        result = ai_service.analyze_team_preferences(
            room_id="test-room",
            members=[{"name": "Test User"}],
            activities=[{"id": "1", "title": "Test"}]
        )

        assert "categoryDistribution" in result
        assert isinstance(result["preferredGoals"], list)

def test_suggest_activities_for_event(ai_service):
    # Test with mock data
    event = {"name": "Test Event", "budget_amount": 50}
    activities = [{"id": "1", "title": "Test Activity"}]

    result = ai_service.suggest_activities_for_event(event, activities)
    assert isinstance(result, list)
```

### Integration Tests

```python
# backend/tests/test_ai_endpoints.py

import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_get_team_recommendations(client: AsyncClient, auth_headers):
    response = await client.get(
        "/api/v1/ai/rooms/test-room-id/recommendations",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "categoryDistribution" in data
    assert "teamVibe" in data

@pytest.mark.asyncio
async def test_get_activity_suggestions(client: AsyncClient, auth_headers):
    response = await client.get(
        "/api/v1/ai/events/test-event-id/suggestions",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

    if data:
        suggestion = data[0]
        assert "activityId" in suggestion
        assert "score" in suggestion
        assert "reason" in suggestion
```

---

## Nächste Schritte

1. **Setup durchführen**:
   ```bash
   cd backend
   pip install openai python-dotenv
   cp .env.example .env  # Falls nicht vorhanden
   # OPENROUTER_API_KEY in .env eintragen
   ```

2. **Code erstellen**:
   - Erstelle `backend/app/services/ai_service.py`
   - Erstelle `backend/app/schemas/ai.py`
   - Erstelle `backend/app/api/endpoints/ai.py`
   - Aktualisiere `backend/app/api/api.py`

3. **Backend testen**:
   ```bash
   # Backend restarten
   docker restart eventhorizon-backend-1

   # Health-Check
   curl http://localhost:8000/api/v1/health

   # Test AI endpoint (mit Auth-Token)
   curl http://localhost:8000/api/v1/ai/rooms/{room-id}/recommendations \
     -H "Authorization: Bearer <your-token>"
   ```

4. **Frontend aktualisieren**:
   - Aktualisiere `frontend/src/services/apiClient.ts`
   - Setze `VITE_USE_MOCKS=false` in `frontend/.env`
   - Teste im Browser

5. **Monitoring einrichten**:
   - Logging für API-Calls
   - Kosten-Tracking
   - Error-Alerts

---

## Ressourcen

- **OpenRouter Docs**: https://openrouter.ai/docs
- **Models übersicht**: https://openrouter.ai/models
- **API Playground**: https://openrouter.ai/playground
- **Pricing Calculator**: https://openrouter.ai/models (sortiere nach Kosten)

---

**Fragen?** Check die Troubleshooting-Sektion oder öffne ein Issue im Projekt-Repository.
