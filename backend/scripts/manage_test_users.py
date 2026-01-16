# -*- coding: utf-8 -*-
# Achtung: Script noch nicht fertig!
# Anleitung (kurz):
# Dev-Container:
#   docker compose -f ../docker-compose.dev.yml exec backend python scripts/manage_test_users.py
# Prod-Container:
#   docker compose -f ../docker-compose.prod.yml exec backend python scripts/manage_test_users.py
# Hinweis: Das Script nutzt die POSTGRES_* Umgebungsvariablen der jeweiligen Umgebung.
import argparse
import asyncio
import json
import os
import random
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from dotenv import load_dotenv
from sqlalchemy import delete, select

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.security import get_password_hash
from app.core.utils import generate_event_short_code, generate_room_invite_code
from app.db.session import async_session
from app.models.domain import (
    Activity,
    BudgetType,
    Event,
    EventParticipant,
    EventPhase,
    Region,
    Room,
    RoomMember,
    RoomRole,
    User,
    user_favorites,
)

REGISTRY_PATH = Path(__file__).with_name("test_user_registry.json")

GERMAN_FIRST_NAMES = [
    "Anna", "Lena", "Marie", "Sophia", "Laura", "Lea", "Mia", "Hannah", "Clara", "Julia",
    "Ben", "Paul", "Jonas", "Leon", "Luis", "Finn", "Noah", "Felix", "Lukas", "Max",
    "Emilia", "Amelie", "Nina", "Luisa", "Ida", "Johanna", "Greta", "Theresa", "Mila", "Sofia",
    "Tim", "Moritz", "Julian", "Tom", "David", "Jakob", "Jan", "Simon", "Philipp", "Erik",
]

GERMAN_LAST_NAMES = [
    "Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann",
    "Koch", "Bauer", "Richter", "Klein", "Wolf", "Schröder", "Neumann", "Schwarz", "Zimmermann", "Braun",
    "Krüger", "Hofmann", "Hartmann", "Lange", "Schmitt", "Werner", "Schmitz", "Krause", "Meier", "Lehmann",
]

ROOM_NAME_PREFIXES = [
    "Kundenraum", "Pilot-Team", "Kundenstamm", "Testgruppe", "Partner-Team", "Team", "Projektgruppe"
]

EVENT_NAME_PREFIXES = [
    "Teamevent", "Kundenevent", "Pilot-Workshop", "Community-Treff", "Ideen-Session"
]


@dataclass
class BatchRecord:
    batch_id: str
    env: str
    created_at: str
    users: List[str]
    rooms: List[str]
    events: List[str]
    emails: List[str]


def load_registry() -> Dict[str, Any]:
    if not REGISTRY_PATH.exists():
        return {"version": 1, "batches": []}
    try:
        with REGISTRY_PATH.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        if "batches" not in data:
            data["batches"] = []
        return data
    except json.JSONDecodeError:
        return {"version": 1, "batches": []}


def save_registry(data: Dict[str, Any]) -> None:
    with REGISTRY_PATH.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)


def mask_db_info() -> str:
    return f"{settings.POSTGRES_USER}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"


def prompt_text(label: str, default: Optional[str] = None) -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"{label}{suffix}: ").strip()
    return value or (default or "")


def prompt_int(label: str, minimum: int, maximum: int, default: int) -> int:
    while True:
        value = prompt_text(label, str(default))
        try:
            parsed = int(value)
        except ValueError:
            print("Bitte eine Zahl eingeben.")
            continue
        if parsed < minimum or parsed > maximum:
            print(f"Bitte einen Wert zwischen {minimum} und {maximum} eingeben.")
            continue
        return parsed


def prompt_yes_no(label: str, default: bool = False) -> bool:
    default_hint = "j" if default else "n"
    value = prompt_text(f"{label} (j/n)", default_hint).lower()
    return value in {"j", "ja", "y", "yes"}


def random_name() -> tuple[str, str]:
    return random.choice(GERMAN_FIRST_NAMES), random.choice(GERMAN_LAST_NAMES)


def random_preferences() -> Dict[str, int]:
    return {
        "physical": random.randint(1, 5),
        "mental": random.randint(1, 5),
        "social": random.randint(1, 5),
        "competition": random.randint(1, 5),
    }


async def generate_unique_invite_code(db) -> str:
    for _ in range(10):
        code = generate_room_invite_code()
        result = await db.execute(select(Room).where(Room.invite_code == code))
        if not result.scalar_one_or_none():
            return code
    raise RuntimeError("Kein eindeutiger Invite-Code gefunden.")


async def generate_unique_event_code(db) -> str:
    for _ in range(10):
        code = generate_event_short_code()
        result = await db.execute(select(Event).where(Event.short_code == code))
        if not result.scalar_one_or_none():
            return code
    raise RuntimeError("Kein eindeutiger Event-Code gefunden.")


async def create_users(
    db,
    count: int,
    password: str,
    min_favorites: int,
    max_favorites: int,
) -> tuple[List[User], List[str]]:
    activities_result = await db.execute(select(Activity))
    activities = activities_result.scalars().all()
    activity_ids = [activity.id for activity in activities]

    if not activity_ids:
        print("Hinweis: Keine Aktivitäten gefunden. Favoriten werden übersprungen.")

    created_users: List[User] = []
    created_emails: List[str] = []

    for _ in range(count):
        first_name, last_name = random_name()
        email_suffix = uuid4().hex[:6]
        email = f"{first_name.lower()}.{last_name.lower()}.{email_suffix}@eventhorizon.test"
        user = User(
            id=uuid4(),
            email=email,
            first_name=first_name,
            last_name=last_name,
            hashed_password=get_password_hash(password),
            is_active=True,
            activity_preferences=random_preferences(),
        )
        db.add(user)
        created_users.append(user)
        created_emails.append(email)

    await db.commit()

    if activity_ids:
        for user in created_users:
            desired_max = min(max_favorites, len(activity_ids))
            desired_min = min(min_favorites, desired_max)
            if desired_max <= 0:
                continue
            favorite_count = random.randint(desired_min, desired_max)
            chosen = random.sample(activity_ids, favorite_count)
            for activity_id in chosen:
                await db.execute(
                    user_favorites.insert().values(user_id=user.id, activity_id=activity_id)
                )
        await db.commit()

    return created_users, created_emails


async def create_room_with_members(
    db,
    users: List[User],
    room_name: Optional[str] = None,
) -> Room:
    owner = users[0]
    invite_code = await generate_unique_invite_code(db)
    room = Room(
        id=uuid4(),
        name=room_name or f"{random.choice(ROOM_NAME_PREFIXES)} {uuid4().hex[:4].upper()}",
        description="Automatisch generierter Kundenraum",
        invite_code=invite_code,
        created_by_user_id=owner.id,
        created_at=datetime.utcnow(),
    )
    db.add(room)
    await db.commit()
    await db.refresh(room)

    members = []
    for user in users:
        if user.id == owner.id:
            continue
        members.append(
            RoomMember(
                room_id=room.id,
                user_id=user.id,
                role=RoomRole.member,
            )
        )
    db.add_all(members)
    await db.commit()
    return room


async def create_event_for_room(
    db,
    room: Room,
    users: List[User],
    event_name: Optional[str] = None,
) -> Event:
    owner = users[0]
    short_code = await generate_unique_event_code(db)
    month = random.randint(1, 12)
    event = Event(
        id=uuid4(),
        room_id=room.id,
        name=event_name or f"{random.choice(EVENT_NAME_PREFIXES)} {uuid4().hex[:4].upper()}",
        description="Automatisch generiertes Test-Event",
        short_code=short_code,
        phase=EventPhase.proposal,
        time_window={"type": "month", "value": month},
        budget_type=BudgetType.per_person,
        budget_amount=random.choice([25, 35, 45, 60]),
        participant_count_estimate=len(users),
        location_region=random.choice(list(Region)),
        created_by_user_id=owner.id,
        created_at=datetime.utcnow(),
        proposed_activity_ids=[],
        excluded_activity_ids=[],
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    participants = []
    for user in users:
        participants.append(
            EventParticipant(
                event_id=event.id,
                user_id=user.id,
                is_organizer=user.id == owner.id,
                has_voted=random.choice([True, False]),
            )
        )
    db.add_all(participants)
    await db.commit()
    return event


async def delete_batch(db, batch: BatchRecord) -> None:
    user_ids = [UUID(uid) for uid in batch.users]
    room_ids = [UUID(rid) for rid in batch.rooms]
    event_ids = [UUID(eid) for eid in batch.events]

    if user_ids:
        await db.execute(user_favorites.delete().where(user_favorites.c.user_id.in_(user_ids)))
        await db.execute(delete(EventParticipant).where(EventParticipant.user_id.in_(user_ids)))
        await db.execute(delete(RoomMember).where(RoomMember.user_id.in_(user_ids)))

    if event_ids:
        await db.execute(delete(Event).where(Event.id.in_(event_ids)))

    if room_ids:
        await db.execute(delete(Room).where(Room.id.in_(room_ids)))

    if user_ids:
        await db.execute(delete(User).where(User.id.in_(user_ids)))

    await db.commit()


def select_batches_for_action(
    env_label: str,
    batch_id: Optional[str],
    allow_all: bool = True,
) -> List[BatchRecord]:
    batches = list_batches(env_label)
    if not batches:
        print("Keine gespeicherten Batches gefunden.")
        return []

    print("Verfügbare Batches:")
    for batch in batches:
        created_at = batch.created_at.split("T")[0] if batch.created_at else "?"
        print(f"- {batch.batch_id} | {created_at} | Nutzer: {len(batch.users)}")

    selected_id = batch_id
    if selected_id is None:
        prompt_label = "Batch-ID auswählen (leer = alle)" if allow_all else "Batch-ID auswählen"
        selected_id = prompt_text(prompt_label, "" if allow_all else None).strip() or None

    if selected_id:
        selected = [batch for batch in batches if batch.batch_id == selected_id]
    else:
        selected = batches if allow_all else []

    if not selected:
        print("Keine passenden Batches gefunden.")
    return selected


def collect_user_ids(batches: List[BatchRecord]) -> List[UUID]:
    user_ids = []
    for batch in batches:
        user_ids.extend(UUID(uid) for uid in batch.users)
    return list({uid for uid in user_ids})


async def assign_random_favorites(
    db,
    user_ids: List[UUID],
    min_favorites: int,
    max_favorites: int,
) -> None:
    activities_result = await db.execute(select(Activity))
    activities = activities_result.scalars().all()
    activity_ids = [activity.id for activity in activities]

    if not activity_ids:
        print("Keine Aktivitäten gefunden. Favoriten werden nicht vergeben.")
        return

    await db.execute(user_favorites.delete().where(user_favorites.c.user_id.in_(user_ids)))

    max_favorites = min(max_favorites, len(activity_ids))
    min_favorites = min(min_favorites, max_favorites)

    for user_id in user_ids:
        if max_favorites <= 0:
            continue
        favorite_count = random.randint(min_favorites, max_favorites)
        chosen = random.sample(activity_ids, favorite_count)
        for activity_id in chosen:
            await db.execute(
                user_favorites.insert().values(user_id=user_id, activity_id=activity_id)
            )

    await db.commit()


async def clear_favorites(db, user_ids: List[UUID]) -> None:
    await db.execute(user_favorites.delete().where(user_favorites.c.user_id.in_(user_ids)))
    await db.commit()


async def assign_random_preferences(db, user_ids: List[UUID]) -> None:
    result = await db.execute(select(User).where(User.id.in_(user_ids)))
    users = result.scalars().all()
    for user in users:
        user.activity_preferences = random_preferences()
    await db.commit()


async def clear_preferences(db, user_ids: List[UUID]) -> None:
    result = await db.execute(select(User).where(User.id.in_(user_ids)))
    users = result.scalars().all()
    for user in users:
        user.activity_preferences = None
    await db.commit()

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Testnutzer für EventHorizon anlegen oder löschen."
    )
    parser.add_argument("--mode", choices=["create", "delete", "list", "favorites", "preferences"])
    parser.add_argument("--env", choices=["dev", "prod"])
    parser.add_argument("--count", type=int)
    parser.add_argument("--favorites-min", type=int, default=1)
    parser.add_argument("--favorites-max", type=int, default=5)
    parser.add_argument("--create-room", action="store_true")
    parser.add_argument("--create-event", action="store_true")
    parser.add_argument("--delete-batch")
    parser.add_argument("--delete-all", action="store_true")
    parser.add_argument("--batch-id")
    parser.add_argument("--action", choices=["assign", "clear"])
    return parser.parse_args()


async def run_create(args: argparse.Namespace) -> None:
    env_label = args.env or prompt_text("Welche Umgebung? (dev/prod)", "dev").lower()
    count = args.count or prompt_int("Wie viele neue Nutzer sollen erstellt werden?", 1, 100, 10)
    min_favorites = args.favorites_min
    max_favorites = args.favorites_max
    if min_favorites < 0:
        min_favorites = 0
    if max_favorites < min_favorites:
        max_favorites = min_favorites

    print(f"Aktive Datenbank: {mask_db_info()}")
    if not prompt_yes_no("Fortfahren?", default=False):
        print("Abgebrochen.")
        return

    create_room = args.create_room or prompt_yes_no("Neuen Raum erstellen?", default=True)
    create_event = args.create_event or prompt_yes_no("Neues Event erstellen?", default=True)

    password = "TestPasswort123!"
    async with async_session() as db:
        users, emails = await create_users(db, count, password, min_favorites, max_favorites)
        room: Optional[Room] = None
        event: Optional[Event] = None

        if create_room:
            room_name = prompt_text("Raumname (optional leer lassen)", "").strip() or None
            room = await create_room_with_members(db, users, room_name)

        if create_event:
            if not room:
                room = await create_room_with_members(db, users, None)
            event_name = prompt_text("Eventname (optional leer lassen)", "").strip() or None
            event = await create_event_for_room(db, room, users, event_name)

    batch = BatchRecord(
        batch_id=uuid4().hex[:8],
        env=env_label,
        created_at=datetime.utcnow().isoformat(),
        users=[str(user.id) for user in users],
        rooms=[str(room.id)] if room else [],
        events=[str(event.id)] if event else [],
        emails=emails,
    )
    registry = load_registry()
    registry["batches"].append(batch.__dict__)
    save_registry(registry)

    print("Fertig.")
    print(f"Batch-ID: {batch.batch_id}")
    print(f"Neue Nutzer: {len(batch.users)}")
    if room:
        print(f"Raum erstellt: {room.name} ({room.invite_code})")
    if event:
        print(f"Event erstellt: {event.name} ({event.short_code})")


def list_batches(env_label: Optional[str]) -> List[BatchRecord]:
    registry = load_registry()
    batches = []
    for raw in registry.get("batches", []):
        if env_label and raw.get("env") != env_label:
            continue
        batches.append(
            BatchRecord(
                batch_id=raw.get("batch_id", ""),
                env=raw.get("env", ""),
                created_at=raw.get("created_at", ""),
                users=raw.get("users", []),
                rooms=raw.get("rooms", []),
                events=raw.get("events", []),
                emails=raw.get("emails", []),
            )
        )
    return batches


async def run_delete(args: argparse.Namespace) -> None:
    env_label = args.env or prompt_text("Welche Umgebung? (dev/prod)", "dev").lower()
    batches = list_batches(env_label)
    if not batches:
        print("Keine gespeicherten Batches gefunden.")
        return

    print("Verfügbare Batches:")
    for batch in batches:
        created_at = batch.created_at.split("T")[0] if batch.created_at else "?"
        print(f"- {batch.batch_id} | {created_at} | Nutzer: {len(batch.users)}")

    if args.delete_all:
        to_delete = batches
    else:
        batch_id = args.delete_batch or args.batch_id or prompt_text("Batch-ID zum Löschen (leer = alle)", "")
        if batch_id:
            to_delete = [batch for batch in batches if batch.batch_id == batch_id]
        else:
            to_delete = batches

    if not to_delete:
        print("Keine passenden Batches gefunden.")
        return

    print(f"Aktive Datenbank: {mask_db_info()}")
    if not prompt_yes_no("Wirklich löschen?", default=False):
        print("Abgebrochen.")
        return

    async with async_session() as db:
        for batch in to_delete:
            await delete_batch(db, batch)

    registry = load_registry()
    remaining = [
        b for b in registry.get("batches", [])
        if not any(batch.batch_id == b.get("batch_id") for batch in to_delete)
    ]
    registry["batches"] = remaining
    save_registry(registry)

    print("Löschen abgeschlossen.")


async def run_favorites(args: argparse.Namespace) -> None:
    env_label = args.env or prompt_text("Welche Umgebung? (dev/prod)", "dev").lower()
    batches = select_batches_for_action(env_label, args.batch_id, allow_all=True)
    if not batches:
        return

    action = args.action
    if not action:
        choice = prompt_text("Favoriten vergeben oder entfernen? (v/e)", "v").lower()
        action = "assign" if choice in {"v", "vergeben"} else "clear"

    min_favorites = args.favorites_min
    max_favorites = args.favorites_max
    if min_favorites < 0:
        min_favorites = 0
    if max_favorites < min_favorites:
        max_favorites = min_favorites

    print(f"Aktive Datenbank: {mask_db_info()}")
    if not prompt_yes_no("Fortfahren?", default=False):
        print("Abgebrochen.")
        return

    user_ids = collect_user_ids(batches)
    async with async_session() as db:
        if action == "assign":
            await assign_random_favorites(db, user_ids, min_favorites, max_favorites)
            print("Favoriten vergeben.")
        else:
            await clear_favorites(db, user_ids)
            print("Favoriten entfernt.")


async def run_preferences(args: argparse.Namespace) -> None:
    env_label = args.env or prompt_text("Welche Umgebung? (dev/prod)", "dev").lower()
    batches = select_batches_for_action(env_label, args.batch_id, allow_all=True)
    if not batches:
        return

    action = args.action
    if not action:
        choice = prompt_text("Präferenzen vergeben oder zurücksetzen? (v/z)", "v").lower()
        action = "assign" if choice in {"v", "vergeben"} else "clear"

    print(f"Aktive Datenbank: {mask_db_info()}")
    if not prompt_yes_no("Fortfahren?", default=False):
        print("Abgebrochen.")
        return

    user_ids = collect_user_ids(batches)
    async with async_session() as db:
        if action == "assign":
            await assign_random_preferences(db, user_ids)
            print("Präferenzen vergeben.")
        else:
            await clear_preferences(db, user_ids)
            print("Präferenzen zurückgesetzt.")

def run_list(args: argparse.Namespace) -> None:
    env_label = args.env or prompt_text("Welche Umgebung? (dev/prod)", "dev").lower()
    batches = list_batches(env_label)
    if not batches:
        print("Keine gespeicherten Batches gefunden.")
        return

    print("Gespeicherte Batches:")
    for batch in batches:
        print(
            f"- {batch.batch_id} | {batch.created_at} | Nutzer: {len(batch.users)} | "
            f"Räume: {len(batch.rooms)} | Events: {len(batch.events)}"
        )


async def main() -> None:
    load_dotenv()
    args = parse_args()

    if not args.mode:
        print("Was möchtest du tun?")
        print("1) Neue Testnutzer erstellen")
        print("2) Erstellte Testnutzer löschen")
        print("3) Batches anzeigen")
        print("4) Favoriten vergeben")
        print("5) Favoriten entfernen")
        print("6) Präferenzen vergeben")
        print("7) Präferenzen zurücksetzen")
        choice = prompt_text("Auswahl", "1")
        if choice == "2":
            args.mode = "delete"
        elif choice == "3":
            args.mode = "list"
        elif choice == "4":
            args.mode = "favorites"
            args.action = "assign"
        elif choice == "5":
            args.mode = "favorites"
            args.action = "clear"
        elif choice == "6":
            args.mode = "preferences"
            args.action = "assign"
        elif choice == "7":
            args.mode = "preferences"
            args.action = "clear"
        else:
            args.mode = "create"

if args.mode == "create":
        await run_create(args)
    elif args.mode == "delete":
        await run_delete(args)
    elif args.mode == "favorites":
        await run_favorites(args)
    elif args.mode == "preferences":
        await run_preferences(args)
    else:
        run_list(args)


if __name__ == "__main__":
    asyncio.run(main())
