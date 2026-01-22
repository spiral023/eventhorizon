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
RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class RateLimiter:
    def __init__(self, min_interval: float) -> None:
        self.min_interval = max(0.0, min_interval)
        self._last_request = 0.0

    def wait(self) -> None:
        if self.min_interval <= 0:
            return
        now = time.monotonic()
        elapsed = now - self._last_request
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
        self._last_request = time.monotonic()


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


def build_activity_query(activity: Activity) -> str:
    region = getattr(activity.location_region, "value", activity.location_region)
    parts = [
        activity.location_address,
        activity.location_city,
        str(region) if region else None,
        "Austria",
    ]
    fallback = activity.provider or activity.title
    if fallback:
        parts.append(fallback)
    return ", ".join([part for part in parts if part])


def format_activity_label(activity: Activity) -> str:
    parts = []
    if activity.listing_id is not None:
        parts.append(f"listing_id={activity.listing_id}")
    if activity.provider:
        parts.append(f"provider={activity.provider}")
    if activity.location_address:
        parts.append(f"address={activity.location_address}")
    if not parts and activity.title:
        parts.append(f"title={activity.title}")
    return " | ".join(parts) if parts else f"id={activity.id}"


def retry_delay(response: requests.Response, attempt: int, base: float, max_delay: float) -> float:
    retry_after = response.headers.get("Retry-After")
    if retry_after:
        try:
            return min(max_delay, float(retry_after))
        except ValueError:
            pass
    return min(max_delay, base * (2 ** (attempt - 1)))


def ors_geocode(
    api_key: str,
    text: str,
    logger: logging.Logger,
    rate_limiter: RateLimiter,
    retries: int,
    backoff_base: float,
    backoff_max: float,
) -> Optional[Tuple[float, float]]:
    url = f"{ORS_BASE_URL}/geocode/search"
    params = {
        "api_key": api_key,
        "text": text,
        "size": 1,
    }
    for attempt in range(1, retries + 1):
        try:
            rate_limiter.wait()
            response = requests.get(url, params=params, timeout=30)
            if response.status_code in RETRYABLE_STATUS:
                delay = retry_delay(response, attempt, backoff_base, backoff_max)
                logger.debug("ORS geocode retryable status %s (sleep %.1fs)", response.status_code, delay)
                time.sleep(delay)
                continue
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
        except requests.RequestException as exc:
            delay = min(backoff_max, backoff_base * (2 ** (attempt - 1)))
            logger.debug("ORS geocode request error (attempt %s/%s): %s", attempt, retries, exc)
            time.sleep(delay)
    return None


def ors_route_duration(
    api_key: str,
    profile: str,
    start: Tuple[float, float],
    end: Tuple[float, float],
    logger: logging.Logger,
    rate_limiter: RateLimiter,
    retries: int,
    backoff_base: float,
    backoff_max: float,
) -> Optional[float]:
    url = f"{ORS_BASE_URL}/v2/directions/{profile}"
    payload = {"coordinates": [to_ors_coords(start), to_ors_coords(end)]}
    headers = {"Authorization": api_key, "Content-Type": "application/json"}
    for attempt in range(1, retries + 1):
        try:
            rate_limiter.wait()
            response = requests.post(url, json=payload, headers=headers, timeout=60)
            if response.status_code in RETRYABLE_STATUS:
                delay = retry_delay(response, attempt, backoff_base, backoff_max)
                logger.debug("ORS %s retryable status %s (sleep %.1fs)", profile, response.status_code, delay)
                time.sleep(delay)
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
            delay = min(backoff_max, backoff_base * (2 ** (attempt - 1)))
            logger.debug("ORS %s request error (attempt %s/%s): %s", profile, attempt, retries, exc)
            time.sleep(delay)
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

    rate_limiter = RateLimiter(args.min_interval)
    async with async_session() as session:
        companies = await fetch_companies(session, args.company_id)
        activities = await fetch_activities(session, args.limit)
        logger.info("Loaded %s companies and %s activities", len(companies), len(activities))
        logger.info(
            "ORS settings: min_interval=%ss max_retries=%s backoff_base=%s backoff_max=%s",
            args.min_interval,
            args.max_retries,
            args.backoff_base,
            args.backoff_max,
        )
        logger.info("Geocode missing activities: %s", args.geocode_missing_activities)

        route_cache: Dict[Tuple[str, Tuple[float, float], Tuple[float, float]], Optional[float]] = {}

        for company in companies:
            logger.info("Processing company %s (id=%s)", company.name, company.id)
            company_coords = parse_coordinates(company.coordinates)
            if company_coords is None:
                query = build_company_query(company)
                logger.debug("Geocoding company address: %s", query)
                try:
                    coords = ors_geocode(
                        api_key,
                        query,
                        logger,
                        rate_limiter,
                        args.max_retries,
                        args.backoff_base,
                        args.backoff_max,
                    )
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
                activity_label = format_activity_label(activity)
                activity_coords = parse_coordinates(activity.coordinates)
                if activity_coords is None and args.geocode_missing_activities:
                    query = build_activity_query(activity)
                    if query:
                        logger.debug("Geocoding activity %s", activity_label)
                        try:
                            coords = ors_geocode(
                                api_key,
                                query,
                                logger,
                                rate_limiter,
                                args.max_retries,
                                args.backoff_base,
                                args.backoff_max,
                            )
                        except Exception as exc:  # noqa: BLE001
                            logger.warning("Geocoding failed for activity %s: %s", activity_label, exc)
                            coords = None
                        if coords:
                            activity.coordinates = [coords[0], coords[1]]
                            activity_coords = coords
                            session.add(activity)
                            await session.flush()
                            logger.debug("Activity %s geocoded to %s", activity_label, coords)
                if activity_coords is None:
                    skipped += 1
                    logger.debug("Skipping activity without coordinates: %s", activity_label)
                    continue

                existing = existing_map.get(activity.id)
                has_walk = existing and existing.walk_minutes is not None
                has_drive = existing and existing.drive_minutes is not None
                if not args.force and has_walk and has_drive:
                    skipped += 1
                    continue

                logger.debug("Routing to activity %s", activity_label)
                drive_seconds = route_cache.get(("driving-car", company_coords, activity_coords))
                if drive_seconds is None:
                    drive_seconds = ors_route_duration(
                        api_key,
                        "driving-car",
                        company_coords,
                        activity_coords,
                        logger,
                        rate_limiter,
                        args.max_retries,
                        args.backoff_base,
                        args.backoff_max,
                    )
                    route_cache[("driving-car", company_coords, activity_coords)] = drive_seconds
                    time.sleep(args.sleep)

                walk_seconds = route_cache.get(("foot-walking", company_coords, activity_coords))
                if walk_seconds is None:
                    walk_seconds = ors_route_duration(
                        api_key,
                        "foot-walking",
                        company_coords,
                        activity_coords,
                        logger,
                        rate_limiter,
                        args.max_retries,
                        args.backoff_base,
                        args.backoff_max,
                    )
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
    parser.add_argument("--sleep", type=float, default=0.0, help="Additional sleep after each request")
    parser.add_argument("--min-interval", type=float, default=1.5, help="Minimum seconds between ORS requests")
    parser.add_argument("--max-retries", type=int, default=5, help="Max retries for ORS requests")
    parser.add_argument("--backoff-base", type=float, default=1.0, help="Base backoff seconds for retries")
    parser.add_argument("--backoff-max", type=float, default=20.0, help="Max backoff seconds for retries")
    parser.add_argument("--geocode-missing-activities", action="store_true", help="Geocode activities if missing coords")
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
