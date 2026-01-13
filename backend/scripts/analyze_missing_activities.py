import asyncio
import sys
import json
from pathlib import Path
from sqlalchemy import select

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import async_session
from app.models.domain import Activity
from app.services.slug_service import generate_slug

async def analyze():
    print("🚀 Starting analysis of missing activities...")

    # 1. Load JSON Data
    json_path = Path(__file__).parent.parent / "data" / "activities.json"
    if not json_path.exists():
        print(f"❌ JSON file not found: {json_path}")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        json_data = json.load(f)
    
    print(f"📋 Source JSON contains {len(json_data)} activities.")

    # 2. Load DB Data
    async with async_session() as db:
        result = await db.execute(select(Activity))
        db_activities = result.scalars().all()
    
    print(f"🗄️  Database contains {len(db_activities)} activities.")
    
    # 3. Analyze
    db_titles = {a.title for a in db_activities}
    db_slugs = {a.slug for a in db_activities}
    
    missing_in_db = []
    slug_mismatches = []
    
    print("\n🔍 Analyzing discrepancies...\n")

    for item in json_data:
        title = item.get("title")
        if not title:
            continue
            
        # Generate expected slug
        expected_slug = generate_slug(title)

        if title not in db_titles:
             # Check if maybe the slug exists (renamed title case)
             if expected_slug in db_slugs:
                 # Find the activity with this slug to see its title
                 existing_act = next((a for a in db_activities if a.slug == expected_slug), None)
                 slug_mismatches.append(f"'{title}' missing, but slug '{expected_slug}' EXISTS with title: '{existing_act.title if existing_act else 'Unknown'}'")
             else:
                 missing_in_db.append(title)

    # Report Missing
    if missing_in_db:
        print(f"❌ {len(missing_in_db)} activities are MISSING in DB:")
        for t in missing_in_db:
            print(f"   - {t}")
    else:
        print("✅ All activities from JSON are present in DB (by title).")

    # Report Mismatches
    if slug_mismatches:
        print(f"\n⚠️  {len(slug_mismatches)} activities have title mismatches (Slug exists):")
        for m in slug_mismatches:
            print(f"   - {m}")

    # Optional: Reverse check (In DB but not in JSON)
    json_titles = {item.get("title") for item in json_data}
    extra_in_db = [t for t in db_titles if t not in json_titles]
    
    if extra_in_db:
        print(f"\nℹ️  {len(extra_in_db)} activities in DB are NOT in JSON (possibly renamed or manually added):")
        for t in extra_in_db:
            print(f"   - {t}")

if __name__ == "__main__":
    asyncio.run(analyze())
