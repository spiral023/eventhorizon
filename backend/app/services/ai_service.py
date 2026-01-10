"""
OpenRouter AI Service für EventHorizon

Verwendet die OpenAI SDK mit OpenRouter als base_url.
Alle Calls verwenden Structured Outputs für type-safe Responses.
"""

from openai import OpenAI
from typing import List, Dict, Any, Optional
import json
import os
import logging

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
        max_tokens: int = 2000
    ) -> str:
        """
        Basis-Funktion für alle AI-Calls

        Args:
            model: OpenRouter model identifier (e.g., "openai/gpt-4o")
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
            logger.info(f"Making OpenRouter completion: model={model}, temperature={temperature}")

            completion = self.client.chat.completions.create(
                extra_headers=self.default_headers,
                model=model,
                messages=messages,
                response_format=response_format,
                temperature=temperature,
                max_tokens=max_tokens
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
        current_distribution: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Analysiere Team-Präferenzen für einen Room

        Args:
            room_id: Room UUID
            members: Liste von User-Objekten mit Präferenzen
            activities: Verfügbare Aktivitäten aus der Datenbank
            current_distribution: Optionale Liste der echten Kategorie-Verteilung [{category, percentage}]

        Returns:
            TeamPreferenceSummary als Dict mit:
            - categoryDistribution: [{category, percentage}]
            - preferredGoals: [string]
            - recommendedActivityIds: [string]
            - teamVibe: "action" | "relax" | "mixed"
            - insights: [string]
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
                                    "percentage": {"type": "number"},
                                    "count": {"type": "integer"}
                                },
                                "required": ["category", "percentage", "count"],
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
                        "synergyScore": {
                            "type": "number",
                            "description": "0-100 indicating how well the team's preferences align"
                        },
                        "strengths": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "challenges": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "teamPersonality": {
                            "type": "string",
                            "description": "A creative name for the team profile"
                        },
                        "socialVibe": {
                            "type": "string",
                            "enum": ["low", "medium", "high"]
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
                        "synergyScore",
                        "strengths",
                        "challenges",
                        "teamPersonality",
                        "socialVibe",
                        "insights"
                    ],
                    "additionalProperties": False
                }
            }
        }

        # Prepare context
        members_summary = self._summarize_members(members)
        activities_summary = self._summarize_activities(activities)
        distribution_context = ""
        if current_distribution:
            distribution_context = "\n**Tatsächliches Abstimmungsverhalten (Favoriten):**\n"
            for item in current_distribution:
                distribution_context += f"- {item['category']}: {item['percentage']}%\n"

        messages = [
            {
                "role": "system",
                "content": """Du bist ein Experte für Team-Psychologie, Gruppendynamik und Event-Planung.
                Deine Aufgabe ist es, aus den individuellen Profilen eines Teams ein tiefgreifendes Gesamtprofil zu erstellen.
                Analysiere die Präferenzen der Team-Mitglieder und erstelle eine strategische Analyse.
                Antworte auf Deutsch mit inspirierenden, präzisen und psychologisch fundierten Einblicken."""
            },
            {
                "role": "user",
                "content": f"""Führe eine umfassende Team-Analyse durch:

**Team-Mitglieder ({len(members)} Personen):**
{members_summary}
{distribution_context}
**Verfügbare Aktivitäten:**
{activities_summary}

Aufgabe:
1. Ermittle die bevorzugten Aktivitätskategorien (Prozentverteilung). Nutze die Favoritendaten als primäre Quelle, falls vorhanden.
2. Identifiziere die 3 wichtigsten Team-Ziele.
3. Empfehle 3-5 Aktivitäten (IDs), die perfekt zum Teamprofil passen.
4. Bestimme den Team-Vibe (action/relax/mixed).
5. Berechne einen Synergy-Score (0-100): Wie gut harmonieren die Interessen?
6. Identifiziere 2-3 konkrete Stärken des Teams in der Zusammenarbeit.
7. Benenne 2 Herausforderungen, die bei der Planung auftreten könnten.
8. Gib dem Team ein prägnantes "Personality Profile" (z.B. 'Die Dynamischen Entdecker').
9. Bestimme den 'Social Vibe' (low/medium/high) - wie viel Interaktion wird bevorzugt?
10. Gib 3 tiefgreifende Insights zur Teamdynamik.

Berücksichtige:
- Gemeinsamkeiten und starke Kontraste in den Profilen.
- Die Balance zwischen Budget-Realität und Wünschen.
- Physische Anforderungen vs. angegebene Hobbys."""
            }
        ]

        response = self._make_completion(
            model="deepseek/deepseek-chat",
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

        Args:
            event: Event-Objekt
            recipient: User-Objekt des Empfängers
            days_until_deadline: Tage bis zur Deadline

        Returns:
            Dict mit subject, body, urgency
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
                Kein Druck, aber klarer Call-to-Action."""
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
