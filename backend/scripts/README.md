# Scripts Overview

Kurz-Anleitung für die Utilities im Ordner `backend/scripts`. Python-Skripte kannst du lokal im venv oder im laufenden Backend-Container ausführen (z. B. `docker compose -f ../docker-compose.dev.yml exec backend python scripts/<script>.py`). Node-Skripte werden lokal mit Node.js ausgeführt.

## Voraussetzungen

- `.env` / Umgebungsvariablen für DB und Services gesetzt (siehe `backend/.env.example`).
- Python-Abhängigkeiten installiert: `pip install -r requirements.txt`.
- Für DB-Schreibzugriffe: laufende Postgres-Instanz (z. B. via `docker compose -f ../docker-compose.dev.yml up backend db`).
- Für Node-Skripte: Node.js 16+ und `npm install` in `backend/scripts/`.

```bash
cd backend/scripts
npm install
```

## Skripte (Python)

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
- `trace_team_analysis.py`: Trace für Team-Analyse. Liest einen Raum per Invite-Code/URL aus der DB, druckt den kompletten Prompt, die OpenRouter-Antwort (inkl. Metadaten) und den deterministischen Synergy-Score.
  ```bash
  # lokal (venv)
  python scripts/trace_team_analysis.py --room-url http://localhost:5173/rooms/WFT-D2P-2Z5
  # im Container (dev)
  docker compose -f ../docker-compose.dev.yml exec backend python scripts/trace_team_analysis.py --room-url http://localhost:5173/rooms/WFT-D2P-2Z5
  # prod (auf der prod-shell)
  python scripts/trace_team_analysis.py --room-url https://event-horizon.sp23.online/rooms/D34-5AA-9ZP
  # optional: Request/Response als JSON speichern
  python scripts/trace_team_analysis.py --room-url http://localhost:5173/rooms/WFT-D2P-2Z5 --output /tmp/ai-trace.json
  ```

## Skripte (Apify / OpenRouter, Node.js)

- `apify_google_maps_reviews.mjs`: Ruft Google-Maps-Daten per Apify Actor `compass/crawler-google-places` ab und speichert pro Activity eine JSON-Datei in `backend/data/activities/`. Interaktiv mit Auswahl und Überschreiben-Prompt.
  ```bash
  cd backend/scripts
  node apify_google_maps_reviews.mjs
  ```
- `process_apify_activity_output.mjs`: Erstellt pro Activity einen Ordner `listing_id_provider` mit `*_basic.json` und `*_reviews.json`. Filtert Reviews > 400 Zeichen, fragt nach Überschreiben.
  ```bash
  cd backend/scripts
  node process_apify_activity_output.mjs
  ```
- `openrouter_customer_voice.mjs`: Aggregiert Reviews per Activity zu einer kurzen Customer-Voice-Zusammenfassung via OpenRouter. Schreibt `*_customer_voice.json`, fragt vor Überschreiben.
  ```bash
  cd backend/scripts
  node openrouter_customer_voice.mjs
  ```
- `update_activities.mjs`: Aktualisiert `backend/data/activities.json` aus den `*_basic.json` und `*_customer_voice.json` Dateien. Zeigt Änderungen vorab, fragt vor dem Schreiben.
  ```bash
  cd backend/scripts
  node update_activities.mjs
  ```

Hinweis: Details zur Apify-Integration stehen in `APIFY.md`.

## Tipps

- Im Container ausführen, damit die gleichen env vars/Netzwerke wie das Backend greifen.
- Bei Import/Seed: vorher `alembic upgrade head`, damit das Schema aktuell ist.
