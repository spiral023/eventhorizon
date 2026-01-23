"""
Seed-Script für Activities
Importiert Activities aus backend/data/activities.json in die Datenbank
"""
import argparse
import asyncio
import sys
import json
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.domain import Activity, EventCategory, Region, Season
from app.core.config import settings
from app.services.slug_service import generate_unique_slug

# Mapping von JSON-Feldern zu Backend-Modell
FIELD_MAPPING = {
    # Direct mappings
    "listing_id": "listing_id",
    "title": "title",
    "category": "category",
    "tags": "tags",
    "location_region": "location_region",
    "short_description": "short_description",
    "long_description": "long_description",
    "image_url": "image_url",
    "season": "season",
    "typical_duration_hours": "typical_duration_hours",
    "provider": "provider",
    "website": "website",
    "reservation_url": "reservation_url",
    "menu_url": "menu_url",
    "max_capacity": "max_capacity",
    "outdoor_seating": "outdoor_seating",
    "facebook": "facebook",
    "instagram": "instagram",
    "weather_dependent": "weather_dependent",
    "external_rating": "external_rating",
    "primary_goal": "primary_goal",
    "competition_level": "competition_level",

    # Renamed fields
    "est_price_pp": "est_price_per_person",
    "address": "location_address",
    "email": "contact_email",
    "phone": "contact_phone",
    "min_participants": "group_size_min",

    # Fields that need special handling
    "price_comment": "price_comment",
    "physical_intensity": "physical_intensity",
    "mental_challenge": "mental_challenge",
    "social_interaction_level": "social_interaction_level",
}

def map_activity_data(json_activity):
    """Map JSON activity data to backend model fields"""
    activity_data = {}

    # Map fields
    for json_field, model_field in FIELD_MAPPING.items():
        if json_field in json_activity:
            activity_data[model_field] = json_activity[json_field]

    # Special handling for coordinates (should be stored as JSON)
    if "coordinates" in json_activity:
        activity_data["coordinates"] = json_activity["coordinates"]

    # Handle location_city if "address" contains city info
    if "address" in json_activity:
        # Try to extract city from address (format: "Street, PLZ City")
        address = json_activity["address"]
        parts = address.split(",")
        if len(parts) >= 2:
            city_part = parts[-1].strip()
            # Extract city name (after PLZ)
            city_tokens = city_part.split()
            if len(city_tokens) >= 2:
                activity_data["location_city"] = " ".join(city_tokens[1:])

    # Set recommended group size based on min_participants if available
    if "recommended_group_size_min" in json_activity:
        activity_data["group_size_min"] = json_activity["recommended_group_size_min"]
    if "recommended_group_size_max" in json_activity:
        activity_data["group_size_max"] = json_activity["recommended_group_size_max"]

    # Convert enums if needed
    if "category" in activity_data:
        try:
            activity_data["category"] = EventCategory[activity_data["category"]]
        except KeyError:
            print(f"⚠️  Unknown category: {activity_data['category']}, using 'action'")
            activity_data["category"] = EventCategory.action

    if "location_region" in activity_data:
        try:
            activity_data["location_region"] = Region[activity_data["location_region"]]
        except KeyError:
            print(f"⚠️  Unknown region: {activity_data['location_region']}, using 'OOE'")
            activity_data["location_region"] = Region.OOE

    if "season" in activity_data:
        try:
            activity_data["season"] = Season[activity_data["season"]]
        except KeyError:
            print(f"⚠️  Unknown season: {activity_data['season']}, using 'all_year'")
            activity_data["season"] = Season.all_year

    return activity_data


async def seed_activities(force: bool = False):
    """Import activities from JSON file into database"""

    # Load JSON file
    json_path = Path(__file__).parent.parent / "data" / "activities.json"

    if not json_path.exists():
        print(f"❌ Datei nicht gefunden: {json_path}")
        return

    print(f"📖 Lade Activities aus: {json_path}")

    with open(json_path, "r", encoding="utf-8") as f:
        activities_json = json.load(f)

    print(f"✓ {len(activities_json)} Activities gefunden\n")

    # Create async engine
    engine = create_async_engine(
        settings.SQLALCHEMY_DATABASE_URI,
        echo=False  # Set to True for SQL logging
    )

    # Create session
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        try:
            # Check if activities already exist
            from sqlalchemy import select
            result = await session.execute(select(Activity))
            existing = result.scalars().all()

            if existing:
                print(f"⚠️  {len(existing)} Activities bereits in der Datenbank vorhanden.")
                if force:
                    print("Automatisches Update (force) – bestehende Activities werden aktualisiert, nicht gelöscht (FK-Schutz).")
                else:
                    try:
                        response = input("Bestehende Activities aktualisieren/ergänzen? (j/n): ")
                    except EOFError:
                        print("Keine Eingabe möglich (non-interactive). Mit --force oder Eingabe erneut ausführen.")
                        return
                    if response.lower() != 'j':
                        print("Abgebrochen.")
                        return

            existing_by_title = {a.title: a for a in existing}

            created = 0
            updated = 0
            errors = 0

            for idx, activity_json in enumerate(activities_json, 1):
                try:
                    activity_data = map_activity_data(activity_json)
                    title = activity_data.get("title")
                    if title and title in existing_by_title:
                        act = existing_by_title[title]
                        for field, value in activity_data.items():
                            # Don't update slug on existing activities
                            if field != 'slug':
                                setattr(act, field, value)
                        updated += 1
                        print(f"[{idx:2d}/{len(activities_json)}] ↻ Aktualisiert: {title}")
                    else:
                        # Generate unique slug for new activity
                        if title:
                            activity_data['slug'] = await generate_unique_slug(title, session)
                        activity = Activity(**activity_data)
                        session.add(activity)
                        created += 1
                        print(f"[{idx:2d}/{len(activities_json)}] ✓ Neu: {activity.title}")
                except Exception as e:
                    errors += 1
                    print(f"[{idx:2d}/{len(activities_json)}] ❌ Fehler: {activity_json.get('title', 'Unknown')}")
                    print(f"          Grund: {e}")

            await session.commit()

            print(f"\n{'='*60}")
            print(f"✅ Import abgeschlossen – Neu: {created}, Aktualisiert: {updated}")
            if errors > 0:
                print(f"⚠️  {errors} Fehler beim Import")
            print(f"{'='*60}")

        except Exception as e:
            await session.rollback()
            print(f"\n❌ Fehler beim Import: {e}")
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed activities from activities.json")
    parser.add_argument("--force", action="store_true", help="bestehende Activities ohne Rückfrage löschen und neu importieren")
    args = parser.parse_args()

    print("🌱 Seeding Activities aus activities.json...\n")
    asyncio.run(seed_activities(force=args.force))
