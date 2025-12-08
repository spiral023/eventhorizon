"""
Geocode activities via Nominatim and persist coordinates into activities.json.
Respects 1 request per second; skips entries that already have coordinates.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "activities.json"

# Region code to human label for better geocoding context
REGION_LABELS: Dict[str, str] = {
    "OOE": "Oberoesterreich",
    "TIR": "Tirol",
    "SBG": "Salzburg",
    "STMK": "Steiermark",
    "KTN": "Kaernten",
    "VBG": "Vorarlberg",
    "NOE": "Niederoesterreich",
    "WIE": "Wien",
    "BGL": "Burgenland",
}

USER_AGENT = "eventhorizon-geocoder/1.0 (contact: frontend)"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


def build_address(activity: dict) -> Optional[str]:
    """Build a geocoding query string from available activity fields."""
    parts: List[str] = []

    if activity.get("address"):
        parts.append(str(activity["address"]))
    if activity.get("location_address"):
        parts.append(str(activity["location_address"]))
    if activity.get("location_city"):
        parts.append(str(activity["location_city"]))

    region = activity.get("location_region")
    if region and region in REGION_LABELS:
        parts.append(REGION_LABELS[region])

    parts.append("Austria")

    query = ", ".join([p for p in parts if p])
    return query or None


def geocode(address: str) -> Optional[Tuple[float, float]]:
    """Query Nominatim for a single address."""
    params = {
        "format": "json",
        "q": address,
        "limit": 1,
        "addressdetails": 0,
        "countrycodes": "at",
    }
    headers = {
        "User-Agent": USER_AGENT,
        "Accept-Language": "de",
    }

    response = requests.get(NOMINATIM_URL, params=params, headers=headers, timeout=15)
    response.raise_for_status()
    data = response.json()
    if isinstance(data, list) and data:
        lat = float(data[0]["lat"])
        lon = float(data[0]["lon"])
        return (lat, lon)
    return None


def main() -> None:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))

    cache: Dict[str, Tuple[float, float]] = {}
    updated = 0
    skipped_existing = 0
    skipped_missing_address = 0

    for idx, activity in enumerate(data, start=1):
        if activity.get("coordinates"):
            skipped_existing += 1
            continue

        address = build_address(activity)
        if not address:
            skipped_missing_address += 1
            continue

        coords = cache.get(address)
        if coords is None:
            try:
                coords = geocode(address)
            except Exception as exc:  # noqa: BLE001
                print(f"[{idx}] Failed to geocode '{address}': {exc}")
                coords = None
            # Respect 1 request/second for Nominatim
            time.sleep(1)

            if coords:
                cache[address] = coords

        if coords:
            activity["coordinates"] = [coords[0], coords[1]]
            updated += 1
            print(f"[{idx}] Added coordinates {coords} for '{activity.get('title', 'unknown')}'")
        else:
            print(f"[{idx}] No coordinates found for '{activity.get('title', 'unknown')}'")

    if updated:
        DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        f"Done. Updated {updated} activities. "
        f"Skipped existing: {skipped_existing}, "
        f"skipped missing address: {skipped_missing_address}."
    )


if __name__ == "__main__":
    main()
