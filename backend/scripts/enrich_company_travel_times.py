"""
Enrich company travel times using Openrouteservice.

- Reads companies and activities from the database.
- Stores walking and driving minutes in company_activity_travel_time.
- Can run once or as a nightly scheduler (01:00 Europe/Vienna).
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

import requests
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.models.domain import Activity, Company, CompanyActivityTravelTime

ORS_BASE_URL = "https://api.openrouteservice.org"


def setup_logger(level: str) -> logging.Logger:
    logger = logging.getLogger("company-travel-times")
    logger.setLevel(level)
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(levelname)s] %(message)s")
    handler.setFormatter(formatter)
    if not logger.handlers:
        logger.addHandler(handler)
    return logger


def parse_coordinates(value: Any) -> Optional[Tuple[float, float]]:
    if isinstance(value, list) and len(value) == 2:
        return float(value[0]), float(value[1])
    if isinstance(value, tuple) and len(value) == 2:
        return float(value[0]), float(value[1])
    return None


def to_ors_coords(lat_lon: Tuple[float, float]) -> List[float]:
    return [lat_lon[1], lat_lon[0]]


def build_company_query(company: Company) -> str:
    parts = [company.address, f"{company.postal_code} {company.city}", "Austria"]
    return ", ".join([part for part in parts if part])


def ors_geocode(api_key: str, text: str, logger: logging.Logger) -> Optional[Tuple[float, float]]:
    url = f"{ORS_BASE_URL}/geocode/search"
    params = {
        "api_key": api_key,
        "text": text,
        "size": 1,
    }
    logger.debug("Geocoding company address: %s", text)
    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()
    features = data.get("features") or []
    if not features:
        return None
    coords = features[0].get("geometry", {}).get("coordinates")
    if not coords or len(coords) != 2:
        return None
    lon, lat = coords
    return float(lat), float(lon)


def ors_route_duration(
    api_key: str,
    profile: str,
    start: Tuple[float, float],
    end: Tuple[float, float],
    logger: logging.Logger,
    retries: int = 3,
    pause: float = 0.5,
) -> Optional[float]:
    url = f"{ORS_BASE_URL}/v2/directions/{profile}"
    payload = {"coordinates": [to_ors_coords(start), to_ors_coords(end)]}
    headers = {"Authorization": api_key, "Content-Type": "application/json"}
    for attempt in range(1, retries + 1):
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=60)
            if response.status_code in {429, 500, 502, 503, 504}:
                logger.debug("ORS %s retryable status %s", profile, response.status_code)
                time.sleep(pause * attempt)
                continue
            response.raise_for_status()
            data = response.json()
            summary = None
            if data.get("features"):
                summary = data["features"][0].get("properties", {}).get("summary")
            if summary is None and data.get("routes"):
                summary = data["routes"][0].get("summary")
            if not summary or "duration" not in summary:
                logger.debug("ORS %s missing duration in response", profile)
                return None
            return float(summary["duration"])
        except requests.RequestException as exc:
            logger.debug("ORS %s request error (attempt %s/%s): %s", profile, attempt, retries, exc)
            time.sleep(pause * attempt)
    return None


def minutes_from_seconds(seconds: Optional[float]) -> Optional[int]:
    if seconds is None:
        return None
    return max(1, int(round(seconds / 60)))


async def fetch_companies(session: AsyncSession, company_id: Optional[int]) -> List[Company]:
    stmt = select(Company)
    if company_id is not None:
        stmt = stmt.where(Company.id == company_id)
    result = await session.execute(stmt.order_by(Company.name))
    return result.scalars().all()


async def fetch_activities(session: AsyncSession, limit: Optional[int]) -> List[Activity]:
    stmt = select(Activity).order_by(Activity.listing_id)
    if limit is not None:
        stmt = stmt.limit(limit)
    result = await session.execute(stmt)
    return result.scalars().all()


async def fetch_existing_travel_times(
    session: AsyncSession,
    company_id: int,
) -> Dict[Any, CompanyActivityTravelTime]:
    result = await session.execute(
        select(CompanyActivityTravelTime).where(CompanyActivityTravelTime.company_id == company_id)
    )
    rows = result.scalars().all()
    return {row.activity_id: row for row in rows}


async def upsert_travel_time(
    session: AsyncSession,
    company_id: int,
    activity_id: Any,
    walk_minutes: Optional[int],
    drive_minutes: Optional[int],
) -> None:
    stmt = insert(CompanyActivityTravelTime).values(
        company_id=company_id,
        activity_id=activity_id,
        walk_minutes=walk_minutes,
        drive_minutes=drive_minutes,
        updated_at=datetime.utcnow(),
    ).on_conflict_do_update(
        index_elements=[
            CompanyActivityTravelTime.company_id,
            CompanyActivityTravelTime.activity_id,
        ],
        set_={
            "walk_minutes": walk_minutes,
            "drive_minutes": drive_minutes,
            "updated_at": datetime.utcnow(),
        },
    )
    await session.execute(stmt)


async def run_once(args: argparse.Namespace, logger: logging.Logger) -> None:
    api_key = os.getenv("OPENROUTESERVICE_API_KEY")
    if not api_key:
        raise SystemExit("OPENROUTESERVICE_API_KEY is not set")

    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, future=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        companies = await fetch_companies(session, args.company_id)
        activities = await fetch_activities(session, args.limit)
        logger.info("Loaded %s companies and %s activities", len(companies), len(activities))

        route_cache: Dict[Tuple[str, Tuple[float, float], Tuple[float, float]], Optional[float]] = {}

        for company in companies:
            logger.info("Processing company %s (id=%s)", company.name, company.id)
            company_coords = parse_coordinates(company.coordinates)
            if company_coords is None:
                query = build_company_query(company)
                try:
                    coords = ors_geocode(api_key, query, logger)
                except Exception as exc:  # noqa: BLE001
                    logger.warning("Geocoding failed for %s: %s", company.name, exc)
                    coords = None
                if coords:
                    company.coordinates = [coords[0], coords[1]]
                    company_coords = coords
                    session.add(company)
                    await session.flush()
                    logger.debug("Company %s geocoded to %s", company.name, coords)

            if company_coords is None:
                logger.warning("Skipping company %s due to missing coordinates", company.name)
                continue

            existing_map = await fetch_existing_travel_times(session, company.id)
            updated = 0
            skipped = 0

            for activity in activities:
                activity_coords = parse_coordinates(activity.coordinates)
                if activity_coords is None:
                    skipped += 1
                    logger.debug("Skipping activity without coordinates: %s", activity.title)
                    continue

                existing = existing_map.get(activity.id)
                has_walk = existing and existing.walk_minutes is not None
                has_drive = existing and existing.drive_minutes is not None
                if not args.force and has_walk and has_drive:
                    skipped += 1
                    continue

                logger.debug("Routing to activity %s (listing_id=%s)", activity.title, activity.listing_id)
                drive_seconds = route_cache.get(("driving-car", company_coords, activity_coords))
                if drive_seconds is None:
                    drive_seconds = ors_route_duration(api_key, "driving-car", company_coords, activity_coords, logger)
                    route_cache[("driving-car", company_coords, activity_coords)] = drive_seconds
                    time.sleep(args.sleep)

                walk_seconds = route_cache.get(("foot-walking", company_coords, activity_coords))
                if walk_seconds is None:
                    walk_seconds = ors_route_duration(api_key, "foot-walking", company_coords, activity_coords, logger)
                    route_cache[("foot-walking", company_coords, activity_coords)] = walk_seconds
                    time.sleep(args.sleep)

                await upsert_travel_time(
                    session,
                    company.id,
                    activity.id,
                    minutes_from_seconds(walk_seconds),
                    minutes_from_seconds(drive_seconds),
                )
                updated += 1

            await session.commit()
            logger.info(
                "Company %s updated travel times: %s updated, %s skipped",
                company.name,
                updated,
                skipped,
            )

    await engine.dispose()


def next_run_at_one(tz_name: str) -> Tuple[datetime, datetime]:
    tz = ZoneInfo(tz_name)
    now = datetime.now(tz)
    target = now.replace(hour=1, minute=0, second=0, microsecond=0)
    if now >= target:
        target = target + timedelta(days=1)
    return now, target


def run_schedule(args: argparse.Namespace, logger: logging.Logger) -> None:
    while True:
        now, target = next_run_at_one(args.timezone)
        sleep_seconds = max(1, int((target - now).total_seconds()))
        logger.info("Next run at %s (%s seconds)", target.isoformat(), sleep_seconds)
        time.sleep(sleep_seconds)
        try:
            logger.info("Starting scheduled run")
            asyncio.run(run_once(args, logger))
            logger.info("Scheduled run completed")
        except Exception as exc:  # noqa: BLE001
            logger.exception("Scheduled run failed: %s", exc)


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich company travel times in DB.")
    parser.add_argument("--company-id", type=int, default=None, help="Limit to a single company")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of activities")
    parser.add_argument("--force", action="store_true", help="Recompute all travel times")
    parser.add_argument("--sleep", type=float, default=0.2, help="Sleep between route requests")
    parser.add_argument("--timezone", default="Europe/Vienna", help="Timezone for scheduling")
    parser.add_argument("--schedule", action="store_true", help="Run nightly at 01:00")
    parser.add_argument("--log-level", default="DEBUG")
    args = parser.parse_args()

    logger = setup_logger(args.log_level.upper())

    if args.schedule:
        run_schedule(args, logger)
        return

    asyncio.run(run_once(args, logger))


if __name__ == "__main__":
    main()
