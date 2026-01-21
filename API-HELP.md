# API-HELP fuer EventHorizon

Kurzuebersicht der wichtigsten API-Aufrufe (FastAPI, Prefix `API_V1_STR=/api/v1`). Alle geschuetzten Endpoints erwarten `Authorization: Bearer <JWT>` und `Content-Type: application/json` sofern nicht anders angegeben.

---

## Basis und Health

- Basis-URL lokal: `http://localhost:8000/api/v1` (Swagger unter `/docs`, OpenAPI JSON unter `/openapi.json`).
- Healthcheck: `GET /health` → `{ "status": "ok" }`.
- Root ohne Prefix: `GET /` → Welcome-Message (ohne Auth).

---

## Auth (JWT)

- **Registrieren:** `POST /auth/register` mit JSON z.B.
  ```json
  {
    "email": "user@example.com",
    "password": "Passwort123",
    "first_name": "Max",
    "last_name": "Mustermann"
  }
  ```
- **Login:** `POST /auth/login` (`application/x-www-form-urlencoded`, Felder `username`, `password`).  
  Beispiel: `curl -X POST http://localhost:8000/api/v1/auth/login -H "Content-Type: application/x-www-form-urlencoded" -d "username=user@example.com&password=Passwort123"`
- **Token nutzen:** Bei allen Folge-Requests Header `Authorization: Bearer <access_token>`.
- **Eigenes Profil (Token testen):** `GET /auth/me` oder `GET /users/me`.

---

## User

- **Profil lesen:** `GET /users/me`.
- **Profil updaten:** `PATCH /users/me` mit Teilfeldern aus `UserUpdate` (z.B. `department`, `location`, `hobbies`, `avatar_url`, `birthday` als ISO-Datum).
- **Statistiken:** `GET /users/me/stats` → `{ upcoming_events_count, open_votes_count }`.
- **Avatar Upload (zweistufig):**
  1. `POST /users/me/avatar/upload-url` mit `{ "content_type": "...", "file_size": 12345 }` → presigned Upload-URL.
  2. Datei hochladen (direkt zu Storage) und danach `POST /users/me/avatar/process` mit `{ "upload_key": "<from step1>", "output_format": "webp" }`.

---

## Activities

- **Liste:** `GET /activities?skip=0&limit=100` (liefert `favorites_count` je Eintrag).
- **Details:** `GET /activities/{activity_id}`.
- **Favorit-Status:** `GET /activities/{id}/favorite` → `{ is_favorite, favorites_count }`.  
  Toggle: `POST /activities/{id}/favorite`.
- **Kommentare:**
  - Lesen: `GET /activities/{id}/comments?skip=0&limit=50`
  - Anlegen: `POST /activities/{id}/comments` `{ "content": "..." }`
  - Loeschen: `DELETE /activities/{id}/comments/{comment_id}` (nur Owner).

---

## Rooms & Events (Haupt-Workflow)

- **Rooms:**

  - Eigene Rooms: `GET /rooms`.
  - Anlegen: `POST /rooms` `{ "name": "...", "description": "...", "avatar_url": "..." }` → enthaelt `invite_code`.
  - Beitreten per Code: `POST /rooms/join` `{ "invite_code": "ABC123" }`.
  - Mitglieder anzeigen: `GET /rooms/{room_id}/members`.
  - Loeschen: `DELETE /rooms/{room_id}` (nur Ersteller).

- **Events anlegen/auflisten:**

  - In Room erstellen: `POST /rooms/{room_id}/events` mit Feldern aus `EventCreate`, z.B.
    ```json
    {
      "name": "Team Offsite",
      "description": "Ideen sammeln",
      "budget_amount": 150,
      "budget_type": "per_person",
      "proposed_activity_ids": ["<activity-uuid>"],
      "voting_deadline": "2025-12-31T17:00:00Z"
    }
    ```
  - Events eines Rooms: `GET /rooms/{room_id}/events`.
  - Einzelnes Event: `GET /events/{event_id}`.
  - Entferne vorgeschlagene Aktivitaet: `DELETE /events/{event_id}/proposed-activities/{activity_id}` (nur Creator).
  - Aktivitaet fuer Voting aus-/einschliessen: `PATCH /events/{event_id}/activities/{activity_id}/exclude|include` (nur Creator, Phase `proposal`).
  - Event loeschen: `DELETE /events/{event_id}` (nur Creator).

- **Phasen & Voting:**

  - Phase setzen: `PATCH /events/{event_id}/phase` `{ "phase": "proposal|voting|scheduling|info" }`.
  - Voting abgeben: `POST /events/{event_id}/votes` `{ "activity_id": "...", "vote": "for|against|abstain" }`.
  - Gewinner waehlen → Scheduling starten: `POST /events/{event_id}/select-activity` `{ "activity_id": "..." }`.

- **Terminfindung:**

  - Terminoption anlegen: `POST /events/{event_id}/date-options` `{ "date": "2025-01-20T18:00:00", "start_time": "18:00", "end_time": "21:00" }` (max 10, nur Phase `scheduling`).
  - Terminoption loeschen: `DELETE /events/{event_id}/date-options/{date_option_id}` (nur Creator).
  - Antwort geben: `POST /events/{event_id}/date-options/{date_option_id}/response` `{ "response": "yes|no|maybe", "is_priority": false, "contribution": 0, "note": "..." }`.
  - Finalen Termin setzen & in Info-Phase gehen: `POST /events/{event_id}/finalize-date` `{ "date_option_id": "..." }`.

- **Event-Kommentare:** `GET/POST /events/{event_id}/comments` (POST-Body `{ "content": "...", "phase": "proposal|voting|scheduling|info" }`), Loeschen via `DELETE /events/{event_id}/comments/{comment_id}`.

---

## AI-Features

- **Verbindung testen:** `POST /ai/test` `{ "message": "Ping", "model": "<optional>" }`.
- **Team-Präferenzen pro Room:** `GET /ai/rooms/{room_id}/recommendations`.
- **Aktivitaets-Vorschläge fuer Event:** `GET /ai/events/{event_id}/suggestions?use_team_preferences=true`.
- **Einladungen generieren + mailen:** `POST /ai/events/{event_id}/invites` (nur Event-Creator; nutzt `FRONTEND_URL` fuer Links).
- **Voting-Reminder senden:** `POST /ai/events/{event_id}/voting-reminders` (erfordert `voting_deadline`).

---

## Emails

- **Booking-Request an Anbieter:** `POST /emails/booking-request`  
  Body: `{ "activity_id": "...", "event_id": "...", "participant_count": 12, "preferred_date": "2025-02-15", "additional_notes": "..." }`  
  Nur Organizer; Aktivitaet braucht `contact_email`. Sendet auch Bestaetigung an den Organizer.

---

## Quick Smoke-Test

1. Health: `curl http://localhost:8000/api/v1/health`
2. Registrieren/Einloggen, Token notieren.
3. `GET /users/me` mit `Authorization: Bearer <token>` pruefen.
4. `GET /activities` pruefen.
5. Room + Event anlegen und `GET /rooms/{room_id}/events` abrufen.
