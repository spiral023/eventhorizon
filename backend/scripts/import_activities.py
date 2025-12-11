"""
Import activities from JSON file to database
"""
import asyncio
import json
import sys
from pathlib import Path
from uuid import uuid4
from datetime import datetime

# Add parent directory to path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import async_session
from app.models.domain import Activity, EventCategory, Region, Season, RiskLevel


def map_json_to_model(activity_json: dict) -> Activity:
    """Map JSON activity data to SQLAlchemy model"""

    # Map fields from JSON to database model
    # Handle snake_case to match both JSON and model
    return Activity(
        id=uuid4(),
        title=activity_json.get("title"),
        category=EventCategory(activity_json.get("category")),
        tags=activity_json.get("tags", []),

        location_region=Region(activity_json.get("location_region")),
        location_city=activity_json.get("location_city"),
        location_address=activity_json.get("address"),  # JSON has "address", model has "location_address"
        coordinates=activity_json.get("coordinates"),

        est_price_per_person=activity_json.get("est_price_pp"),
        price_comment=activity_json.get("price_comment"),

        short_description=activity_json.get("short_description", ""),
        long_description=activity_json.get("long_description"),
        description=activity_json.get("description"),

        image_url=activity_json.get("image_url"),

        season=Season(activity_json.get("season")) if activity_json.get("season") else None,
        weather_dependent=activity_json.get("weather_dependent", False),
        risk_level=RiskLevel(activity_json.get("risk_level")) if activity_json.get("risk_level") else None,

        accessibility_flags=activity_json.get("accessibility_flags", []),

        duration=activity_json.get("duration"),
        typical_duration_hours=activity_json.get("typical_duration_hours"),

        group_size_min=activity_json.get("min_participants") or activity_json.get("recommended_group_size_min"),
        group_size_max=activity_json.get("recommended_group_size_max"),

        physical_intensity=activity_json.get("physical_intensity"),
        mental_challenge=activity_json.get("mental_challenge"),
        social_interaction_level=activity_json.get("social_interaction_level"),
        competition_level=activity_json.get("competition_level"),

        provider=activity_json.get("provider"),
        website=activity_json.get("website"),
        reservation_url=activity_json.get("reservation_url"),
        menu_url=activity_json.get("menu_url"),
        contact_email=activity_json.get("email"),
        contact_phone=activity_json.get("phone"),
        max_capacity=activity_json.get("max_capacity"),
        outdoor_seating=activity_json.get("outdoor_seating"),
        external_rating=activity_json.get("external_rating"),
        primary_goal=activity_json.get("primary_goal"),
        facebook=activity_json.get("facebook"),
        instagram=activity_json.get("instagram"),

        travel_time_from_office_minutes=activity_json.get("travel_time_from_office_minutes"),
        travel_time_from_office_minutes_walking=activity_json.get("travel_time_from_office_minutes_walking"),

        created_at=datetime.utcnow()
    )


async def import_activities():
    """Import activities from JSON file to database"""

    # Read JSON file
    json_path = Path(__file__).parent.parent / "data" / "activities.json"
    print(f"Reading activities from: {json_path}")

    with open(json_path, "r", encoding="utf-8") as f:
        activities_data = json.load(f)

    print(f"Found {len(activities_data)} activities to import")

    # Import to database
    async with async_session() as db:
        try:
            # Check if activities already exist
            from sqlalchemy.future import select
            result = await db.execute(select(Activity))
            existing = result.scalars().all()

            if existing:
                print(f"Database already contains {len(existing)} activities")
                response = input("Delete existing and reimport? (y/N): ")
                if response.lower() != 'y':
                    print("Import cancelled")
                    return

                # Delete existing
                for activity in existing:
                    await db.delete(activity)
                await db.commit()
                print("Deleted existing activities")

            # Import new activities
            imported_count = 0
            for activity_json in activities_data:
                try:
                    activity = map_json_to_model(activity_json)
                    db.add(activity)
                    imported_count += 1
                except Exception as e:
                    print(f"Error importing activity '{activity_json.get('title')}': {e}")
                    continue

            await db.commit()
            print(f"Successfully imported {imported_count} activities!")

        except Exception as e:
            print(f"Error during import: {e}")
            await db.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(import_activities())
