# Scripts Overview

Kurz-Anleitung für die Utilities im Ordner `backend/scripts`. Alle Befehle kannst du entweder lokal im venv oder im laufenden Backend-Container ausführen (z. B. `docker compose -f ../docker-compose.dev.yml exec backend python scripts/<script>.py`).

## Voraussetzungen
- `.env` / Umgebungsvariablen für DB und Services gesetzt (siehe `backend/.env.example`).
- Abhängigkeiten installiert: `pip install -r requirements.txt`.
- Für DB-Schreibzugriffe: laufende Postgres-Instanz (z. B. via `docker compose -f ../docker-compose.dev.yml up backend db`).

## Skripte
- `seed_activities.py`: Lädt `data/activities.json` in die Datenbank. Optional Flags prüfen (siehe Script-Argumente). Typisch:
  ```bash
  python scripts/seed_activities.py
  ```
- `import_activities.py`: Importiert Activities aus einer JSON-Datei (ID-Generierung, Feld-Mapping). Beispiel:
  ```bash
  python scripts/import_activities.py path/to/activities.json
  ```
- `geocode_activities.py`: Ergänzt fehlende Koordinaten in `data/activities.json` via Nominatim (1 req/s). Vor dem Seed/Import laufen lassen:
  ```bash
  python scripts/geocode_activities.py
  ```
- `test_email.py`: Kleiner Smoke-Test für den E-Mail-Versand (Resend). Erwartet `RESEND_API_KEY` in der Umgebung. Aufruf:
  ```bash
  python scripts/test_email.py you@example.com
  ```

## Tipps
- Im Container ausführen, damit die gleichen env vars/Netzwerke wie das Backend greifen.
- Bei Import/Seed: vorher `alembic upgrade head`, damit das Schema aktuell ist.
