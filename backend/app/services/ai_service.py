"""
OpenRouter AI Service für EventHorizon

Verwendet die OpenAI SDK mit OpenRouter als base_url.
Alle Calls verwenden Structured Outputs für type-safe Responses.
"""

from openai import OpenAI
from typing import List, Dict, Any, Optional, Union
from statistics import mean, median, pstdev
import json
import os
import logging

from app.ai_prompts import (
    TEAM_ANALYSIS_SYSTEM_PROMPT,
    TEAM_ANALYSIS_USER_PROMPT,
    ACTIVITY_SUGGESTIONS_SYSTEM_PROMPT,
    ACTIVITY_SUGGESTIONS_USER_PROMPT,
    EVENT_INVITE_SYSTEM_PROMPT,
    EVENT_INVITE_USER_PROMPT,
    VOTING_REMINDER_SYSTEM_PROMPT,
    VOTING_REMINDER_USER_PROMPT,
)

logger = logging.getLogger(__name__)


class AIService:
    """
    OpenRouter AI Service für EventHorizon

    Handles all AI-related functionality including:
    - Team preference analysis
    - Activity suggestions for events
    - Event invite generation
    - Voting reminder generation
    """

    def __init__(self):
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            logger.warning("OPENROUTER_API_KEY not set - AI features will be disabled")
            self.client = None
            return

        self.client = OpenAI(
            base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
            api_key=api_key,
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
        max_tokens: int = 2000,
    ) -> str:
        """
        Basis-Funktion für alle AI-Calls

        Args:
            model: OpenRouter model identifier (e.g., "deepseek/deepseek-v3.2")
            messages: List of chat messages
            response_format: Optional structured output schema
            temperature: Sampling temperature (0.0-1.0)
            max_tokens: Maximum tokens in response

        Returns:
            Response content as string

        Raises:
            Exception: If AI service is not configured or API call fails
        """
        if not self.client:
            raise Exception("AI Service not configured - OPENROUTER_API_KEY missing")

        try:
            logger.info(
                f"Making OpenRouter completion: model={model}, temperature={temperature}"
            )

            completion = self.client.chat.completions.create(
                extra_headers=self.default_headers,
                model=model,
                messages=messages,
                response_format=response_format,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            content = completion.choices[0].message.content
            logger.info(f"OpenRouter response received: {len(content)} chars")
            logger.debug(f"OpenRouter raw content: {content}")

            return content

        except Exception as e:
            logger.error(f"OpenRouter API Error: {str(e)}")
            raise Exception(f"OpenRouter API Error: {str(e)}")

    def analyze_team_preferences(
        self,
        room_id: str,
        members: List[Dict],
        activities: List[Dict],
        current_distribution: Optional[Union[Dict[str, Any], List[Dict]]] = None,
    ) -> Dict[str, Any]:
        """
        Analysiere Team-Präferenzen für einen Room

        Args:
            room_id: Room UUID
            members: Liste von User-Objekten mit Präferenzen
            activities: Verfügbare Aktivitäten aus der Datenbank
            current_distribution: Optionaler Kontext zur Kategorie-Verteilung
                - dict: {"normalized": [...], "raw": [...], "availability": [...], "totalFavorites": int}
                - list: Legacy (roh) [{category, percentage, count}]

        Returns:
            TeamPreferenceSummary als Dict mit:
            - preferredGoals: [string]
            - recommendedActivityIds: [string] (LLM liefert listing_id, wird serverseitig zu UUIDs gemappt)
            - insights: [string]
            (categoryDistribution und teamVibe werden serverseitig berechnet und nicht vom LLM geliefert)
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
                        "preferredGoals": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "recommendedActivityIds": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "strengths": {"type": "array", "items": {"type": "string"}},
                        "challenges": {"type": "array", "items": {"type": "string"}},
                        "teamPersonality": {
                            "type": "string",
                            "description": "A creative name for the team profile",
                        },
                        "socialVibe": {
                            "type": "string",
                            "enum": ["low", "medium", "high"],
                        },
                        "insights": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": [
                        "preferredGoals",
                        "recommendedActivityIds",
                        "strengths",
                        "challenges",
                        "teamPersonality",
                        "socialVibe",
                        "insights",
                    ],
                    "additionalProperties": False,
                },
            },
        }

        # Prepare context
        members_summary = self._summarize_members(members)
        activities_summary = self._summarize_activities(
            activities, include_price=False, id_field="listing_id"
        )
        distribution_context = self._format_distribution_context(current_distribution)
        messages = [
            {
                "role": "system",
                "content": TEAM_ANALYSIS_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": TEAM_ANALYSIS_USER_PROMPT.format(
                    member_count=len(members),
                    members_summary=members_summary,
                    distribution_context=distribution_context,
                    activities_summary=activities_summary,
                ),
            },
        ]

        response = self._make_completion(
            model="deepseek/deepseek-v3.2",
            messages=messages,
            response_format=schema,
            temperature=0.5,
        )

        data = json.loads(response)
        listing_id_map = {
            str(a.get("listing_id")): str(a.get("id"))
            for a in activities
            if a.get("listing_id") is not None and a.get("id") is not None
        }
        if listing_id_map:
            mapped_ids = []
            for raw_id in data.get("recommendedActivityIds", []):
                key = str(raw_id).strip()
                mapped = listing_id_map.get(key)
                if mapped:
                    mapped_ids.append(mapped)
                elif key in listing_id_map.values():
                    mapped_ids.append(key)
            data["recommendedActivityIds"] = mapped_ids

        return data

    def suggest_activities_for_event(
        self,
        event: Dict,
        activities: List[Dict],
        team_preferences: Optional[Dict] = None,
    ) -> List[Dict[str, Any]]:
        """
        Schlage die besten Aktivitäten für ein Event vor

        Args:
            event: Event-Objekt mit Budget, Zeitfenster, Region, etc.
            activities: Alle verfügbaren Aktivitäten
            team_preferences: Optional - Ergebnis von analyze_team_preferences()

        Returns:
            Liste von AiRecommendation-Objekten mit:
            - activityId: string
            - score: number (0-100)
            - reason: string
            - matchFactors: {budgetMatch, seasonMatch, groupSizeMatch, preferenceMatch}
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
                                            "preferenceMatch": {"type": "number"},
                                        },
                                        "required": [
                                            "budgetMatch",
                                            "seasonMatch",
                                            "groupSizeMatch",
                                            "preferenceMatch",
                                        ],
                                        "additionalProperties": False,
                                    },
                                },
                                "required": [
                                    "activityId",
                                    "score",
                                    "reason",
                                    "matchFactors",
                                ],
                                "additionalProperties": False,
                            },
                        }
                    },
                    "required": ["suggestions"],
                    "additionalProperties": False,
                },
            },
        }

        event_context = self._format_event_context(event)
        activities_list = self._format_activities_list(activities)
        team_context = (
            json.dumps(team_preferences, indent=2)
            if team_preferences
            else "Keine Team-Präferenzen verfügbar"
        )

        messages = [
            {
                "role": "system",
                "content": ACTIVITY_SUGGESTIONS_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": ACTIVITY_SUGGESTIONS_USER_PROMPT.format(
                    event_context=event_context,
                    team_context=team_context,
                    activities_list=activities_list,
                ),
            },
        ]

        response = self._make_completion(
            model="deepseek/deepseek-v3.2",
            messages=messages,
            response_format=schema,
            temperature=0.3,
        )

        data = json.loads(response)
        return data["suggestions"]

    def generate_event_invite(
        self, event: Dict, recipient: Dict, role: str  # "organizer" or "participant"
    ) -> Dict[str, str]:
        """
        Generiere personalisierte Event-Einladung

        Args:
            event: Event-Objekt
            recipient: User-Objekt des Empfängers
            role: "organizer" oder "participant"

        Returns:
            Dict mit subject, body, callToAction
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
                        "callToAction": {"type": "string"},
                    },
                    "required": ["subject", "body", "callToAction"],
                    "additionalProperties": False,
                },
            },
        }

        messages = [
            {
                "role": "system",
                "content": EVENT_INVITE_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": EVENT_INVITE_USER_PROMPT.format(
                    recipient_name=recipient.get("name", "Team-Mitglied"),
                    role=role,
                    event_name=event.get("name"),
                    event_description=event.get("description", "Kein Text"),
                    event_phase=event.get("phase"),
                    event_budget_amount=event.get("budget_amount"),
                    event_budget_type=event.get("budget_type"),
                    participant_count=event.get("participant_count_estimate", "?"),
                ),
            },
        ]

        response = self._make_completion(
            model="deepseek/deepseek-v3.2",
            messages=messages,
            response_format=schema,
            temperature=0.8,
        )

        return json.loads(response)

    def generate_voting_reminder(
        self, event: Dict, recipient: Dict, days_until_deadline: int
    ) -> Dict[str, str]:
        """
        Generiere Voting-Erinnerung

        Args:
            event: Event-Objekt
            recipient: User-Objekt des Empfängers
            days_until_deadline: Tage bis zur Deadline

        Returns:
            Dict mit subject, body, urgency
        """

        urgency = (
            "high"
            if days_until_deadline <= 1
            else "medium" if days_until_deadline <= 3 else "low"
        )

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
                            "enum": ["low", "medium", "high"],
                        },
                    },
                    "required": ["subject", "body", "urgency"],
                    "additionalProperties": False,
                },
            },
        }

        messages = [
            {
                "role": "system",
                "content": VOTING_REMINDER_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": VOTING_REMINDER_USER_PROMPT.format(
                    recipient_name=recipient.get("name"),
                    event_name=event.get("name"),
                    days_until_deadline=days_until_deadline,
                    urgency=urgency,
                ),
            },
        ]

        response = self._make_completion(
            model="deepseek/deepseek-v3.2",
            messages=messages,
            response_format=schema,
            temperature=0.7,
        )

        return json.loads(response)

    # Helper methods
    def _format_distribution_context(
        self,
        distribution_context: Optional[Union[Dict[str, Any], List[Dict]]],
    ) -> str:
        if not distribution_context:
            return ""

        raw_distribution = []
        normalized_distribution = []
        availability_distribution = []

        if isinstance(distribution_context, list):
            raw_distribution = distribution_context
        elif isinstance(distribution_context, dict):
            raw_distribution = (
                distribution_context.get("raw")
                or distribution_context.get("rawDistribution")
                or []
            )
            normalized_distribution = (
                distribution_context.get("normalized")
                or distribution_context.get("normalizedDistribution")
                or []
            )
            availability_distribution = (
                distribution_context.get("availability")
                or distribution_context.get("availabilityCounts")
                or []
            )
        else:
            return ""

        def format_items(items: List[Dict], include_percentage: bool = True) -> str:
            lines = []
            for item in items:
                category = item.get("category")
                if not category:
                    continue
                count = item.get("count")
                percentage = item.get("percentage")
                if include_percentage and percentage is not None:
                    count_label = f"{count} Favoriten" if count is not None else "n/a"
                    lines.append(f"- {category}: {percentage}% ({count_label})")
                elif count is not None:
                    lines.append(f"- {category}: {count}")
                else:
                    lines.append(f"- {category}")
            return "\n".join(lines)

        parts = []
        if normalized_distribution:
            parts.append(
                "\n**Normalisierte Kategorie-Verteilung (Favoriten je User relativ zum Katalog):**\n"
                + format_items(normalized_distribution)
            )
        if raw_distribution:
            parts.append(
                "\n**Favoriten-Verteilung (roh):**\n" + format_items(raw_distribution)
            )
        if availability_distribution:
            availability_lines = []
            for item in availability_distribution:
                category = item.get("category")
                if not category:
                    continue
                count = item.get("count")
                if count is None:
                    continue
                availability_lines.append(f"- {category}: {count} Aktivitaeten")
            if availability_lines:
                parts.append(
                    "\n**Katalog-Verfügbarkeit je Kategorie:**\n"
                    + "\n".join(availability_lines)
                )

        if not parts:
            return ""

        if normalized_distribution:
            guidance = (
                "\n**Hinweis für die Auswertung:**\n"
                "- Für die Kategorie-Priorisierung primär die normalisierte Verteilung verwenden.\n"
                "- Rohverteilung und Verfügbarkeit nur als Plausibilitäts-/Konfidenzsignal nutzen.\n"
            )
        else:
            guidance = (
                "\n**Hinweis für die Auswertung:**\n"
                "- Nutze die Favoriten-Verteilung als primäre Quelle.\n"
            )

        return "".join(parts) + guidance

    def _summarize_members(self, members: List[Dict]) -> str:
        """Aggregate member preferences for AI context (no personal identifiers)."""
        total_members = len(members)
        if total_members == 0:
            return "Keine Präferenzdaten vorhanden."

        dimensions = ["physical", "mental", "social", "competition"]
        values_by_dimension = {dim: [] for dim in dimensions}
        members_with_any = 0

        def has_non_default_preferences(preferences: Dict[str, Any]) -> bool:
            found_value = False
            for dim in dimensions:
                value = preferences.get(dim)
                if isinstance(value, (int, float)):
                    found_value = True
                    if float(value) != 3:
                        return True
            return False if found_value else False

        for member in members:
            prefs = member.get("activity_preferences") or {}
            if not has_non_default_preferences(prefs):
                continue
            has_any = False
            for dim in dimensions:
                value = prefs.get(dim)
                if isinstance(value, (int, float)):
                    values_by_dimension[dim].append(float(value))
                    has_any = True
            if has_any:
                members_with_any += 1

        if sum(len(values) for values in values_by_dimension.values()) == 0:
            return "Keine abweichenden Präferenzdaten vorhanden."

        lines = [
            f"- Abweichende Präferenzdaten vorhanden für {members_with_any}/{total_members} Personen.",
            "- Skala: 0 (niedrig) bis 5 (hoch).",
            "- Standardwerte (alle 3) werden ignoriert.",
        ]

        for dim in dimensions:
            values = values_by_dimension[dim]
            if not values:
                lines.append(f"- {dim}: keine Werte")
                continue

            dim_mean = mean(values)
            dim_median = median(values)
            dim_std = pstdev(values) if len(values) > 1 else 0.0
            dim_min = min(values)
            dim_max = max(values)
            high = sum(1 for v in values if v >= 4)
            low = sum(1 for v in values if v <= 2)
            mid = len(values) - high - low

            lines.append(
                f"- {dim}: n={len(values)}, Mittel={dim_mean:.1f}, Median={dim_median:.1f}, "
                f"Streuung={dim_std:.1f}, Min={dim_min:.0f}, Max={dim_max:.0f}, "
                f"High(>=4)={high}, Mid(=3)={mid}, Low(<=2)={low}"
            )

        return "\n".join(lines)

    def _summarize_activities(
        self,
        activities: List[Dict],
        include_price: bool = True,
        id_field: str = "id",
    ) -> str:
        """Format activities for AI context"""
        lines = []
        for a in activities[:50]:  # Limit to top 50
            price_part = f"Preis={a.get('est_price_pp')}€, " if include_price else ""
            activity_id = a.get(id_field)
            if activity_id is None:
                activity_id = "n/a"
            lines.append(
                f"- [{activity_id}] {a.get('title')}: "
                f"Kategorie={a.get('category')}, "
                f"{price_part}"
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
