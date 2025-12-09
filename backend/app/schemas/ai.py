"""
Pydantic Schemas für AI-related Responses
"""

from pydantic import BaseModel, Field
from typing import List, Literal


class CategoryDistribution(BaseModel):
    """Kategorie-Verteilung im Team"""
    category: str
    percentage: float = Field(ge=0, le=100, description="Prozentanteil der Kategorie")


class TeamPreferenceSummary(BaseModel):
    """Team-Präferenz-Analyse Ergebnis"""
    category_distribution: List[CategoryDistribution] = Field(
        alias="categoryDistribution",
        description="Verteilung der bevorzugten Aktivitätskategorien"
    )
    preferred_goals: List[str] = Field(
        alias="preferredGoals",
        description="Haupt-Ziele des Teams (z.B. teambuilding, fun, relax)"
    )
    recommended_activity_ids: List[str] = Field(
        alias="recommendedActivityIds",
        description="Empfohlene Aktivitäts-IDs"
    )
    team_vibe: Literal["action", "relax", "mixed"] = Field(
        alias="teamVibe",
        description="Allgemeine Team-Stimmung"
    )
    insights: List[str] = Field(
        description="Insights über die Team-Dynamik"
    )

    class Config:
        populate_by_name = True


class MatchFactors(BaseModel):
    """Match-Faktoren für Aktivitäts-Empfehlung"""
    budget_match: float = Field(
        ge=0,
        le=100,
        alias="budgetMatch",
        description="Budget-Übereinstimmung (0-100)"
    )
    season_match: float = Field(
        ge=0,
        le=100,
        alias="seasonMatch",
        description="Saison-Übereinstimmung (0-100)"
    )
    group_size_match: float = Field(
        ge=0,
        le=100,
        alias="groupSizeMatch",
        description="Gruppengrößen-Übereinstimmung (0-100)"
    )
    preference_match: float = Field(
        ge=0,
        le=100,
        alias="preferenceMatch",
        description="Präferenz-Übereinstimmung (0-100)"
    )

    class Config:
        populate_by_name = True


class AiRecommendation(BaseModel):
    """AI-Aktivitäts-Empfehlung"""
    activity_id: str = Field(
        alias="activityId",
        description="ID der empfohlenen Aktivität"
    )
    score: float = Field(
        ge=0,
        le=100,
        description="Gesamt-Score (0-100)"
    )
    reason: str = Field(
        description="Begründung für die Empfehlung"
    )
    match_factors: MatchFactors = Field(
        alias="matchFactors",
        description="Detaillierte Match-Faktoren"
    )

    class Config:
        populate_by_name = True


class EventInvite(BaseModel):
    """Generierte Event-Einladung"""
    subject: str = Field(description="E-Mail Betreff")
    body: str = Field(description="E-Mail Text")
    call_to_action: str = Field(
        alias="callToAction",
        description="Call-to-Action Button-Text"
    )

    class Config:
        populate_by_name = True


class VotingReminder(BaseModel):
    """Generierte Voting-Erinnerung"""
    subject: str = Field(description="E-Mail Betreff")
    body: str = Field(description="E-Mail Text")
    urgency: Literal["low", "medium", "high"] = Field(
        description="Dringlichkeit der Erinnerung"
    )
