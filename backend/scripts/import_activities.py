"""
Import activities from JSON file to database with Upsert logic
"""
import asyncio
import json
import sys
from pathlib import Path
from uuid import uuid4, UUID
from datetime import datetime

# Add parent directory to path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import async_session
from app.models.domain import Activity, EventCategory, Region, Season
from app.services.slug_service import generate_slug, generate_unique_slug


def map_json_to_model(
    activity_json: dict,
    existing_activity: Activity = None,
    activity_id: UUID | None = None,
    listing_id: int | None = None,
) -> Activity:
    """Map JSON activity data to SQLAlchemy model"""
    
    # Generate slug if not present (although model requires it, we generate it here for new items)
    # Note: For existing items, we keep the ID and Slug stable unless we want to re-generate slug?
    # Usually better to keep slug stable if title hasn't changed drastically, but here we base lookup on slug.
    
    # We will handle ID and Slug outside or pass them in if existing
    activity_id = existing_activity.id if existing_activity else (activity_id or uuid4())
    
    # Use existing slug if available, otherwise generate new
    # But wait, if we lookup by slug, we already have it.
    # If we lookup by title, we might generate a new slug if title changed?
    # Let's stick to generating slug from title for consistency or use existing.
    
    # Simple approach: Re-map everything. ID is preserved via existing_activity check in main loop.
    # Slug logic: We generate it in main loop to check existence.
    
    # Handle snake_case to match both JSON and model
    return Activity(
        id=activity_id,
        listing_id=listing_id,
        title=activity_json.get("title"),
        # slug is handled by caller
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
        customer_voice=activity_json.get("customer_voice"),

        image_url=activity_json.get("image_url"),

        season=Season(activity_json.get("season")) if activity_json.get("season") else None,
        weather_dependent=activity_json.get("weather_dependent", False),
        typical_duration_hours=activity_json.get("typical_duration_hours"),

        group_size_min=activity_json.get("recommended_group_size_min") or activity_json.get("min_participants"),
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

        created_at=existing_activity.created_at if existing_activity else datetime.utcnow()
    )


def parse_uuid(value: object) -> UUID | None:
    if not value:
        return None
    try:
        return UUID(str(value))
    except (ValueError, TypeError):
        return None


def parse_listing_id(value: object) -> int | None:
    if value is None:
        return None
    try:
        listing_id = int(value)
    except (ValueError, TypeError):
        return None
    return listing_id if listing_id > 0 else None


async def import_activities():
    """Import activities from JSON file to database with Upsert"""

    # Read JSON file
    json_path = Path(__file__).parent.parent / "data" / "activities.json"
    print(f"Reading activities from: {json_path}")

    with open(json_path, "r", encoding="utf-8") as f:
        activities_data = json.load(f)

    print(f"Found {len(activities_data)} activities to import")

    # Import to database
    async with async_session() as db:
        try:
            created_count = 0
            updated_count = 0
            
            print(f"Starting import loop for {len(activities_data)} items...")

            for activity_json in activities_data:
                title = activity_json.get("title")
                if not title:
                    print("Skipping activity without title")
                    continue
                
                listing_id = parse_listing_id(activity_json.get("listing_id"))
                input_id = parse_uuid(activity_json.get("id"))
                input_slug = activity_json.get("slug")

                # Check by listing_id first (stable across title changes)
                existing_activity = None
                if listing_id is not None:
                    result = await db.execute(
                        select(Activity).where(Activity.listing_id == listing_id)
                    )
                    existing_activity = result.scalar_one_or_none()

                # Fallback: check by UUID
                if not existing_activity and input_id:
                    result = await db.execute(
                        select(Activity).where(Activity.id == input_id)
                    )
                    existing_activity = result.scalar_one_or_none()

                # Fallback: check by slug (explicit slug or generated from title)
                slug_for_lookup = input_slug or generate_slug(title)
                if not existing_activity:
                    result = await db.execute(
                        select(Activity).where(Activity.slug == slug_for_lookup)
                    )
                    existing_activity = result.scalar_one_or_none()

                # Determine desired slug
                if existing_activity:
                    desired_slug = input_slug or existing_activity.slug
                else:
                    desired_slug = input_slug or await generate_unique_slug(title, db)
                
                try:
                    if existing_activity:
                        # Update existing
                        # We map json to a TEMPORARY model to get clean fields, then update existing instance
                        temp_model = map_json_to_model(
                            activity_json,
                            existing_activity,
                            listing_id=listing_id or existing_activity.listing_id,
                        )
                        
                        has_changes = False
                        # Update fields on existing_activity
                        for key, new_value in temp_model.__dict__.items():
                            if not key.startswith('_') and key != 'id' and key != 'created_at':
                                if key == "listing_id" and new_value is None:
                                    continue
                                old_value = getattr(existing_activity, key)
                                if old_value != new_value:
                                    setattr(existing_activity, key, new_value)
                                    has_changes = True
                        
                        # Ensure slug is set (though it should match)
                        if existing_activity.slug != desired_slug:
                            existing_activity.slug = desired_slug
                            has_changes = True

                        if has_changes:
                            updated_count += 1
                            print(f"Updated: {title}")
                    else:
                        # Create new
                        new_activity = map_json_to_model(
                            activity_json,
                            activity_id=input_id,
                            listing_id=listing_id,
                        )
                        new_activity.slug = desired_slug
                        db.add(new_activity)
                        created_count += 1
                        print(f"Created: {title}")
                        
                except Exception as e:
                    print(f"Error processing activity '{title}': {e}")
                    continue

            print("Committing changes...")
            await db.commit()
            print(f"Import complete! Created: {created_count}, Updated: {updated_count}")

        except Exception as e:
            print(f"Error during import: {e}")
            await db.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(import_activities())
