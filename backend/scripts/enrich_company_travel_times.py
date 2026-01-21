"""
Enrich frontend/src/data/companies.ts with walking + driving travel times to activities.

Requires:
  OPENROUTESERVICE_API_KEY in environment.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

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


def load_activities(path: Path) -> List[Dict[str, Any]]:
    return json.loads(path.read_text(encoding="utf-8"))


def extract_companies_array(text: str) -> str:
    match = re.search(r"export const companies: Company\[\]\s*=\s*(\[[\s\S]*?\])\s*;", text)
    if not match:
        raise ValueError("Could not find companies array in companies.ts")
    return match.group(1)


def ts_array_to_json(ts_array: str) -> str:
    with_keys = re.sub(r"([{\s,])([a-zA-Z_][a-zA-Z0-9_]*)\s*:", r'\1"\2":', ts_array)
    no_trailing_commas = re.sub(r",\s*([}\]])", r"\1", with_keys)
    return no_trailing_commas


def load_companies(path: Path) -> List[Dict[str, Any]]:
    text = path.read_text(encoding="utf-8")
    ts_array = extract_companies_array(text)
    json_text = ts_array_to_json(ts_array)
    return json.loads(json_text)


def serialize_companies_ts(companies: List[Dict[str, Any]]) -> str:
    companies_json = json.dumps(companies, ensure_ascii=True, indent=2)
    return (
        "export type Company = {\n"
        "  id: number;\n"
        "  name: string;\n"
        "  address: string;\n"
        "  postalCode: string;\n"
        "  city: string;\n"
        "  industry: string;\n"
        "  coordinates?: [number, number];\n"
        "  travelTimes?: Record<string, { walkMinutes: number | null; driveMinutes: number | null }>;\n"
        "};\n\n"
        f"export const companies: Company[] = {companies_json};\n\n"
        "export const getCompanyById = (id?: number | null) =>\n"
        "  typeof id === \"number\" ? companies.find((company) => company.id === id) : undefined;\n\n"
        "export const searchCompanies = (query: string) => {\n"
        "  const normalized = query.trim().toLowerCase();\n"
        "  if (!normalized) return [];\n"
        "  return companies.filter((company) => {\n"
        "    return (\n"
        "      company.name.toLowerCase().includes(normalized) ||\n"
        "      company.city.toLowerCase().includes(normalized) ||\n"
        "      company.industry.toLowerCase().includes(normalized) ||\n"
        "      company.address.toLowerCase().includes(normalized) ||\n"
        "      company.postalCode.includes(normalized)\n"
        "    );\n"
        "  });\n"
        "};\n"
    )


def resolve_companies_path(user_path: Optional[Path]) -> Path:
    if user_path:
        return user_path
    candidates: List[Path] = []
    env_path = os.getenv("COMPANIES_PATH")
    if env_path:
        candidates.append(Path(env_path))
    backend_dir = Path(__file__).resolve().parents[1]
    repo_root = backend_dir.parent
    candidates.append(repo_root / "frontend" / "src" / "data" / "companies.ts")
    candidates.append(Path("/frontend/src/data/companies.ts"))
    candidates.append(Path.cwd() / "frontend" / "src" / "data" / "companies.ts")
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(
        "companies.ts not found. Tried: " + ", ".join(str(c) for c in candidates)
    )


def resolve_activities_path(user_path: Optional[Path]) -> Path:
    if user_path:
        return user_path
    candidates: List[Path] = []
    env_path = os.getenv("ACTIVITIES_PATH")
    if env_path:
        candidates.append(Path(env_path))
    backend_dir = Path(__file__).resolve().parents[1]
    repo_root = backend_dir.parent
    candidates.append(backend_dir / "data" / "activities.json")
    candidates.append(repo_root / "backend" / "data" / "activities.json")
    candidates.append(Path("/backend/data/activities.json"))
    candidates.append(Path.cwd() / "backend" / "data" / "activities.json")
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(
        "activities.json not found. Tried: " + ", ".join(str(c) for c in candidates)
    )


def normalize_company_payload(company: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": company.get("id"),
        "name": company.get("name"),
        "address": company.get("address"),
        "postal_code": company.get("postalCode") or company.get("postal_code"),
        "city": company.get("city"),
        "industry": company.get("industry"),
        "coordinates": company.get("coordinates"),
    }


async def upsert_companies_and_travel_times(
    companies: List[Dict[str, Any]],
    logger: logging.Logger,
) -> None:
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, future=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        listing_map: Dict[int, Any] = {}
        activity_result = await session.execute(select(Activity.id, Activity.listing_id))
        for activity_id, listing_id in activity_result.all():
            if listing_id is not None:
                listing_map[int(listing_id)] = activity_id

        company_upserts = 0
        travel_upserts = 0
        skipped_missing_id = 0

        for company in companies:
            payload = normalize_company_payload(company)
            company_id = payload.get("id")
            if company_id is None:
                skipped_missing_id += 1
                logger.warning("Company missing id, skipping DB upsert: %s", payload.get("name"))
                continue

            stmt = insert(Company).values(**payload).on_conflict_do_update(
                index_elements=[Company.id],
                set_={
                    "name": payload["name"],
                    "address": payload["address"],
                    "postal_code": payload["postal_code"],
                    "city": payload["city"],
                    "industry": payload["industry"],
                    "coordinates": payload["coordinates"],
                },
            )
            await session.execute(stmt)
            company_upserts += 1

            travel_times = company.get("travelTimes") or {}
            for listing_key, times in travel_times.items():
                try:
                    listing_id = int(listing_key)
                except (TypeError, ValueError):
                    logger.debug("Invalid listing_id key: %s", listing_key)
                    continue

                activity_id = listing_map.get(listing_id)
                if not activity_id:
                    logger.debug("No activity match for listing_id %s", listing_id)
                    continue

                walk_minutes = times.get("walkMinutes") if isinstance(times, dict) else None
                drive_minutes = times.get("driveMinutes") if isinstance(times, dict) else None

                travel_stmt = insert(CompanyActivityTravelTime).values(
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
                await session.execute(travel_stmt)
                travel_upserts += 1

        await session.commit()

        logger.info(
            "DB upserts complete. Companies: %s, travel times: %s, companies missing id: %s",
            company_upserts,
            travel_upserts,
            skipped_missing_id,
        )

    await engine.dispose()


def build_company_query(company: Dict[str, Any]) -> str:
    parts = [
        company.get("address"),
        f"{company.get('postalCode', '')} {company.get('city', '')}".strip(),
        "Austria",
    ]
    return ", ".join([part for part in parts if part])


def get_coordinates_from_activity(activity: Dict[str, Any]) -> Optional[Tuple[float, float]]:
    coords = activity.get("coordinates")
    if isinstance(coords, list) and len(coords) == 2:
        return float(coords[0]), float(coords[1])
    return None


def to_ors_coords(lat_lon: Tuple[float, float]) -> List[float]:
    return [lat_lon[1], lat_lon[0]]


def ors_geocode(api_key: str, text: str, logger: logging.Logger) -> Optional[Tuple[float, float]]:
    url = f"{ORS_BASE_URL}/geocode/search"
    params = {
        "api_key": api_key,
        "text": text,
        "size": 1,
    }
    logger.debug("Geocoding: %s", text)
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


def iter_activities(
    activities: Iterable[Dict[str, Any]],
    limit: Optional[int] = None,
) -> Iterable[Dict[str, Any]]:
    count = 0
    for activity in activities:
        yield activity
        count += 1
        if limit is not None and count >= limit:
            break


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich companies with travel times to activities.")
    parser.add_argument("--companies-path", type=Path, default=None)
    parser.add_argument("--activities-path", type=Path, default=None)
    parser.add_argument("--limit", type=int, default=None, help="Limit number of activities.")
    parser.add_argument("--force", action="store_true", help="Recompute all travel times.")
    parser.add_argument("--sleep", type=float, default=0.2, help="Sleep between route requests.")
    parser.add_argument("--skip-file", action="store_true", help="Do not update companies.ts")
    parser.add_argument("--skip-db", action="store_true", help="Do not write results to the database")
    parser.add_argument("--log-level", default="DEBUG")
    args = parser.parse_args()

    logger = setup_logger(args.log_level.upper())
    api_key = os.getenv("OPENROUTESERVICE_API_KEY")
    if not api_key:
        raise SystemExit("OPENROUTESERVICE_API_KEY is not set")

    companies_path: Path = resolve_companies_path(args.companies_path)
    activities_path: Path = resolve_activities_path(args.activities_path)

    logger.info("Loading companies from %s", companies_path)
    companies = load_companies(companies_path)
    logger.info("Loading activities from %s", activities_path)
    activities = load_activities(activities_path)

    route_cache: Dict[Tuple[str, Tuple[float, float], Tuple[float, float]], Optional[float]] = {}

    for company in companies:
        company_name = company.get("name", "unknown")
        logger.info("Processing company: %s", company_name)
        company_coords = None
        if isinstance(company.get("coordinates"), list) and len(company["coordinates"]) == 2:
            company_coords = (float(company["coordinates"][0]), float(company["coordinates"][1]))
        else:
            query = build_company_query(company)
            if not query:
                logger.warning("No address data for company %s", company_name)
            else:
                company_coords = ors_geocode(api_key, query, logger)
                if company_coords:
                    company["coordinates"] = [company_coords[0], company_coords[1]]
                    logger.debug("Company %s geocoded to %s", company_name, company_coords)
                else:
                    logger.warning("No coordinates found for company %s", company_name)

        travel_times = company.get("travelTimes") or {}

        for activity in iter_activities(activities, args.limit):
            listing_id = activity.get("listing_id")
            if listing_id is None:
                logger.debug("Skipping activity without listing_id: %s", activity.get("title"))
                continue
            activity_key = str(listing_id)
            if not args.force and activity_key in travel_times:
                logger.debug("Skipping existing travel time for activity %s", activity_key)
                continue

            activity_coords = get_coordinates_from_activity(activity)
            if not company_coords or not activity_coords:
                logger.debug(
                    "Missing coordinates for company or activity %s (%s)",
                    activity_key,
                    activity.get("title"),
                )
                travel_times[activity_key] = {"walkMinutes": None, "driveMinutes": None}
                continue

            logger.debug("Routing to activity %s (%s)", activity_key, activity.get("title"))
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

            travel_times[activity_key] = {
                "walkMinutes": minutes_from_seconds(walk_seconds),
                "driveMinutes": minutes_from_seconds(drive_seconds),
            }

        company["travelTimes"] = travel_times
        logger.info("Company %s updated with %s travel times", company_name, len(travel_times))

    if not args.skip_db:
        asyncio.run(upsert_companies_and_travel_times(companies, logger))

    if not args.skip_file:
        companies_ts = serialize_companies_ts(companies)
        companies_path.write_text(companies_ts, encoding="utf-8")
        logger.info("Updated companies saved to %s", companies_path)


if __name__ == "__main__":
    main()
