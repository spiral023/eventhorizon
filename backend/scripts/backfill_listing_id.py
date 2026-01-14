"""
Backfill listing_id for existing activities using a legacy JSON file.
Matches by slug derived from legacy titles (or legacy slug if present).
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.db.session import async_session
from app.models.domain import Activity
from app.services.slug_service import generate_slug


def load_activities(path: Path) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("Expected JSON array in source file.")
    return data


async def backfill_listing_id(source_path: Path, force: bool) -> None:
    activities = load_activities(source_path)
    print(f"Loaded {len(activities)} activities from {source_path}")

    updated = 0
    skipped = 0
    missing = 0
    conflicts = 0

    async with async_session() as db:
        for idx, activity_json in enumerate(activities, 1):
            title = activity_json.get("title")
            if not title:
                skipped += 1
                continue

            legacy_slug = activity_json.get("slug") or generate_slug(title)
            listing_id = activity_json.get("listing_id") or idx

            result = await db.execute(
                select(Activity).where(Activity.slug == legacy_slug)
            )
            existing_activity = result.scalar_one_or_none()

            if not existing_activity:
                missing += 1
                print(f"Missing in DB: {title} ({legacy_slug})")
                continue

            if existing_activity.listing_id is not None and not force:
                if existing_activity.listing_id != listing_id:
                    conflicts += 1
                    print(
                        f"Conflict for {title}: DB={existing_activity.listing_id} JSON={listing_id}"
                    )
                else:
                    skipped += 1
                continue

            existing_activity.listing_id = int(listing_id)
            updated += 1

        await db.commit()

    print(
        f"Done. Updated: {updated}, Skipped: {skipped}, Missing: {missing}, Conflicts: {conflicts}"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Backfill listing_id on existing activities using a legacy JSON file."
    )
    parser.add_argument(
        "--source",
        default="data/activities_backup_20260114_023440.json",
        help="Path to legacy activities JSON file.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite listing_id even if already set (use with care).",
    )
    args = parser.parse_args()

    source = Path(__file__).parent.parent / args.source
    if not source.exists():
        raise SystemExit(f"Source file not found: {source}")

    asyncio.run(backfill_listing_id(source, args.force))
