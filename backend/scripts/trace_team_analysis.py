import argparse
import asyncio
import json
import os
import re
import sys
from urllib.parse import urlparse

from dotenv import load_dotenv
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

# Setup path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.ai_prompts import (
    TEAM_ANALYSIS_SYSTEM_PROMPT,
    TEAM_ANALYSIS_USER_PROMPT,
)
from app.api.endpoints.ai import (
    _build_coverage_stat,
    _calculate_normalized_category_distribution,
    _calculate_synergy_score,
    _calculate_team_preference_averages,
    _calculate_team_vibe,
    _has_activity_preferences,
)
from app.db.session import async_session
from app.models.domain import Room, RoomMember, User, Activity
from app.services.ai_service import ai_service


def _parse_invite_code(value: str) -> str:
    if not value:
        return ""
    if "://" in value:
        path = urlparse(value).path
        parts = [p for p in path.split("/") if p]
        if len(parts) >= 2 and parts[-2] == "rooms":
            return parts[-1]
    return value.strip()


def _build_schema() -> dict:
    return {
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


async def _load_room_data(invite_code: str):
    async with async_session() as db:
        room_result = await db.execute(
            select(Room).where(Room.invite_code == invite_code)
        )
        room = room_result.scalar_one_or_none()
        if not room:
            raise RuntimeError(f"Room not found for invite code: {invite_code}")

        members_result = await db.execute(
            select(User)
            .options(selectinload(User.favorite_activities))
            .where(
                or_(
                    User.id.in_(
                        select(RoomMember.user_id).where(RoomMember.room_id == room.id)
                    ),
                    User.id == room.created_by_user_id,
                )
            )
        )
        members = members_result.scalars().all()

        stats_result = await db.execute(
            select(Activity.category, func.count(Activity.id)).group_by(Activity.category)
        )
        availability_counts = {
            (cat.value if hasattr(cat, "value") else str(cat)): count
            for cat, count in stats_result.all()
        }

        (
            normalized_distribution,
            raw_distribution,
            availability_distribution,
            total_favorites,
        ) = _calculate_normalized_category_distribution(members, availability_counts)

        activities_result = await db.execute(select(Activity))
        activities = activities_result.scalars().all()

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
                "listing_id": a.listing_id,
                "title": a.title,
                "category": a.category,
                "est_price_pp": a.est_price_per_person,
                "location_region": a.location_region,
                "season": a.season,
                "primary_goal": a.primary_goal,
                "physical_intensity": a.physical_intensity,
                "social_interaction_level": a.social_interaction_level,
            }
            for a in activities
        ]

        distribution_context = (
            {
                "normalized": normalized_distribution,
                "raw": raw_distribution,
                "availability": availability_distribution,
                "totalFavorites": total_favorites,
            }
            if total_favorites > 0
            else None
        )

        team_preferences = _calculate_team_preference_averages(members)
        favorites_participation = _build_coverage_stat(
            sum(1 for m in members if len(m.favorite_activities) > 0),
            len(members),
        )
        preferences_coverage = _build_coverage_stat(
            sum(1 for m in members if _has_activity_preferences(m.activity_preferences)),
            len(members),
        )
        synergy_score = _calculate_synergy_score(members)
        team_vibe = _calculate_team_vibe(normalized_distribution, team_preferences)

        return (
            room,
            members_data,
            activities_data,
            distribution_context,
            normalized_distribution,
            team_preferences,
            favorites_participation,
            preferences_coverage,
            synergy_score,
            team_vibe,
        )


async def _run(invite_code: str, model: str, temperature: float, max_tokens: int, output_path: str | None):
    (
        room,
        members_data,
        activities_data,
        distribution_context,
        normalized_distribution,
        team_preferences,
        favorites_participation,
        preferences_coverage,
        synergy_score,
        team_vibe,
    ) = await _load_room_data(invite_code)

    if not ai_service.client:
        raise RuntimeError("OPENROUTER_API_KEY not set - cannot call OpenRouter")

    members_summary = ai_service._summarize_members(members_data)
    activities_summary = ai_service._summarize_activities(
        activities_data, include_price=False, id_field="listing_id"
    )
    distribution_summary = ai_service._format_distribution_context(distribution_context)

    messages = [
        {"role": "system", "content": TEAM_ANALYSIS_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": TEAM_ANALYSIS_USER_PROMPT.format(
                member_count=len(members_data),
                members_summary=members_summary,
                distribution_context=distribution_summary,
                activities_summary=activities_summary,
            ),
        },
    ]

    request_payload = {
        "base_url": os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
        "model": model,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "response_format": _build_schema(),
        "messages": messages,
        "extra_headers": ai_service.default_headers,
        "room": {"id": str(room.id), "name": room.name, "invite_code": room.invite_code},
    }

    print("=== OpenRouter Request (JSON) ===")
    print(json.dumps(request_payload, indent=2, ensure_ascii=False))
    print("\n=== System Prompt ===")
    print(messages[0]["content"])
    print("\n=== User Prompt ===")
    print(messages[1]["content"])

    completion = ai_service.client.chat.completions.create(
        extra_headers=ai_service.default_headers,
        model=model,
        messages=messages,
        response_format=_build_schema(),
        temperature=temperature,
        max_tokens=max_tokens,
    )

    if hasattr(completion, "model_dump"):
        response_dump = completion.model_dump()
    elif hasattr(completion, "dict"):
        response_dump = completion.dict()
    else:
        response_dump = {"raw": repr(completion)}
    response_dump["response_text"] = completion.choices[0].message.content

    print("\n=== OpenRouter Response (raw) ===")
    print(json.dumps(response_dump, indent=2, ensure_ascii=False))
    print("\n=== OpenRouter Response (content) ===")
    print(completion.choices[0].message.content)

    print("\n=== Deterministic Synergy Score ===")
    print(synergy_score)

    try:
        llm_data = json.loads(completion.choices[0].message.content)
    except Exception:
        llm_data = {}

    listing_id_map = {
        str(a.get("listing_id")): a.get("id")
        for a in activities_data
        if a.get("listing_id") is not None and a.get("id") is not None
    }
    mapped_recommended_ids = []
    for raw_id in llm_data.get("recommendedActivityIds", []):
        key = str(raw_id).strip()
        mapped = listing_id_map.get(key)
        if mapped:
            mapped_recommended_ids.append(mapped)
        elif key in listing_id_map.values():
            mapped_recommended_ids.append(key)

    api_response = {
        "categoryDistribution": normalized_distribution,
        "preferredGoals": llm_data.get("preferredGoals", []),
        "recommendedActivityIds": mapped_recommended_ids,
        "teamVibe": team_vibe,
        "synergyScore": synergy_score,
        "strengths": llm_data.get("strengths", []),
        "challenges": llm_data.get("challenges", []),
        "teamPersonality": llm_data.get("teamPersonality", ""),
        "socialVibe": llm_data.get("socialVibe", "medium"),
        "insights": llm_data.get("insights", []),
        "memberCount": len(members_data),
        "teamPreferences": team_preferences,
        "favoritesParticipation": favorites_participation,
        "preferencesCoverage": preferences_coverage,
    }

    print("\n=== Simulated API Response (server-side fields applied) ===")
    print(json.dumps(api_response, indent=2, ensure_ascii=False))

    if output_path:
        with open(output_path, "w", encoding="utf-8") as handle:
            json.dump(
                {
                    "request": request_payload,
                    "response": response_dump,
                    "api_response": api_response,
                },
                handle,
                indent=2,
                ensure_ascii=False,
            )
        print(f"\nSaved request/response to: {output_path}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Trace team analysis prompt and OpenRouter response for a room."
    )
    parser.add_argument("--invite-code", help="Room invite code like D34-5AA-9ZP.")
    parser.add_argument("--room-url", help="Room URL like https://.../rooms/D34-5AA-9ZP.")
    parser.add_argument("--model", default="deepseek/deepseek-v3.2")
    parser.add_argument("--temperature", type=float, default=0.5)
    parser.add_argument("--max-tokens", type=int, default=2000)
    parser.add_argument("--output", help="Optional path to write request/response JSON.")
    parser.add_argument("--env-file", help="Optional path to a .env file.")

    args = parser.parse_args()

    if args.env_file:
        load_dotenv(args.env_file, override=False)
    else:
        load_dotenv(override=False)

    invite_code = _parse_invite_code(args.invite_code or args.room_url or "")
    if not invite_code:
        raise SystemExit("Provide --invite-code or --room-url.")

    if not re.match(r"^[A-Z0-9-]+$", invite_code, re.IGNORECASE):
        print(f"Warning: invite code looks unusual: {invite_code}")

    asyncio.run(
        _run(
            invite_code=invite_code,
            model=args.model,
            temperature=args.temperature,
            max_tokens=args.max_tokens,
            output_path=args.output,
        )
    )
    return 0


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    raise SystemExit(main())
