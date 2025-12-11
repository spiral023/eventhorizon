## Werteänderungen (z. B. Speisekarten-Link) – Leitfaden

Diese Anleitung beschreibt, wie du Inhalte wie `menu_url`, `reservation_url`, `max_capacity`, `outdoor_seating` oder andere Activity-Felder konsistent in JSON, Backend und Datenbank änderst – einmal für die lokale Dev-Umgebung (Docker Compose) und einmal für das Produktivsystem (VPS).

---

## Lokale Entwicklung (Docker Compose)
1. **Wert anpassen**  
   - Bearbeite `backend/data/activities.json` und passe die gewünschten Felder an (z. B. `menu_url`).

2. **Datenbank aktualisieren (FK-sicher)**  
   - Empfohlen (Upsert/Update, keine Löschung nötig, FK-safe):  
     ```bash
     docker compose -f docker-compose.dev.yml exec backend python scripts/seed_activities.py --force
     ```  
     Hinweis: `--force` triggert jetzt ein Update pro Titel (bestehende Activities werden überschrieben/ergänzt, nicht gelöscht).
   - Alternative: kleines Sync-Script, falls du nur ausgewählte Felder refreshen willst:  
     ```bash
     docker compose exec backend python - <<'PY'
     import json, asyncio
     from pathlib import Path
     from sqlalchemy import select
     from app.db.session import async_session
     from app.models.domain import Activity

     FIELDS = ["menu_url", "reservation_url", "max_capacity", "outdoor_seating", "facebook", "instagram", "website", "provider"]
     data = json.loads(Path("/app/data/activities.json").read_text(encoding="utf-8"))

     async def main():
         updated = 0
         async with async_session() as db:
             for item in data:
                 res = await db.execute(select(Activity).where(Activity.title == item["title"]))
                 act = res.scalar_one_or_none()
                 if not act:
                     continue
                 changed = False
                 for f in FIELDS:
                     if f in item and getattr(act, f) != item[f]:
                         setattr(act, f, item[f])
                         changed = True
                 if changed:
                     updated += 1
             if updated:
                 await db.commit()
         print({"updated_rows": updated})
     asyncio.run(main())
     PY
     ```

3. **Frontend sicherstellen**  
   - Die neuen Felder sind bereits im Frontend verknüpft; nach dem Backend-Update reichen ein Neustart/Hot-Reload von Vite (`npm run dev`) bzw. ein kurzer Refresh.

4. **Verifizieren**  
   - API-Check:  
     ```bash
     curl -H "Authorization: Bearer <TOKEN>" "http://localhost:8000/api/v1/activities?limit=1"
     ```  
   - Im UI: Activity-Detailseite öffnen und prüfen, ob Links/Infos aktualisiert sind.

---

## Produktion (VPS)
*Hinweis: Passe die Container-Namen/Ports an deine Umgebung an.*

1. **JSON anpassen**  
   - Aktualisiere `backend/data/activities.json` auf dem Server (oder sync per Git/Deploy).

2. **DB aktualisieren**  
   - Empfohlen (Upsert/Update, löscht nichts, FK-safe):  
     ```bash
     docker exec <backend-container> python scripts/seed_activities.py --force
     ```  
     Hinweis: `--force` aktualisiert bestehende Activities per Titel und legt fehlende neu an.
   - Nur Felder updaten (selektiv):  
     ```bash
     docker exec <backend-container> python - <<'PY'
     import json, asyncio
     from pathlib import Path
     from sqlalchemy import select
     from app.db.session import async_session
     from app.models.domain import Activity

     FIELDS = ["menu_url", "reservation_url", "max_capacity", "outdoor_seating", "facebook", "instagram", "website", "provider"]
     data = json.loads(Path("/app/data/activities.json").read_text(encoding="utf-8"))

     async def main():
         updated = 0
         async with async_session() as db:
             for item in data:
                 res = await db.execute(select(Activity).where(Activity.title == item["title"]))
                 act = res.scalar_one_or_none()
                 if not act:
                     continue
                 changed = False
                 for f in FIELDS:
                     if f in item and getattr(act, f) != item[f]:
                         setattr(act, f, item[f])
                         changed = True
                 if changed:
                     updated += 1
             if updated:
                 await db.commit()
         print({"updated_rows": updated})
     asyncio.run(main())
     PY
     ```

3. **Optional: Backup**  
   - Vor produktiven Änderungen ein DB-Backup ziehen (z. B. `pg_dump`) oder den `activity`-Inhalt exportieren.

4. **Verifizieren**  
   - API-Check gegen die Live-URL, z. B.  
     ```bash
     curl -H "Authorization: Bearer <TOKEN>" "https://<deine-domain>/api/v1/activities?limit=1"
     ```  
   - UI prüfen (Activity-Detail und Event-Info zeigen die Links).

---

## Hinweise
- Migrationen: Die Spalten existieren bereits; bei neuer Umgebung `alembic upgrade head` ausführen. Falls Alembic-History nicht synchron ist, nutze im Zweifel die gezeigten `ALTER TABLE`-Spalten oder synchronisiere die Revisionen.
- Defaults: In `activities.json` sind standardmäßig `max_capacity=100`, `outdoor_seating=false`, `reservation_url` und `menu_url` gesetzt. Wenn du einen Link leer lassen willst, lösche das Feld oder setze `""`; das Frontend blendet leere Links aus.
