# DB-HELP (Arbeiten direkt im DB-Container mit `docker exec`)

Kurzer Leitfaden, um im laufenden Postgres-Container (Service `db`, Postgres 15) per `docker exec` zu arbeiten.

---

## Container finden
```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
# typischer Name: eventhorizon-db-1
```
Setze unten `<DB_CONTAINER>` entsprechend.

---

## Quickstart: psql & Shell
- Interaktive Shell:  
  ```bash
  docker exec -it <DB_CONTAINER> sh
  ```
- Direkt psql (interaktiv):  
  ```bash
  docker exec -it <DB_CONTAINER> psql -U user -d eventhorizon
  ```
- Nützliche psql-Shortcuts: `\\dt` (Tabellen), `\\l` (DBs), `\\q` (quit).

---

## SQL-Befehle per `docker exec`
- Einmalige Query (ohne interaktiv):  
  ```bash
  docker exec -i <DB_CONTAINER> psql -U user -d eventhorizon -c 'SELECT COUNT(*) FROM "user";'
  ```
- User nach Email löschen:  
  ```bash
  docker exec -i <DB_CONTAINER> psql -U user -d eventhorizon -c "DELETE FROM \"user\" WHERE email = 'user@example.com';"
  ```
- Alle User + abhängige Daten leeren (vorsichtig!):  
  ```bash
  docker exec -i <DB_CONTAINER> psql -U user -d eventhorizon -c 'TRUNCATE TABLE "user" CASCADE;'
  ```
- Alle Tabellen leeren (hart, zerstört komplette Dev-Daten):  
  ```bash
  docker exec -i <DB_CONTAINER> psql -U user -d eventhorizon -c \
  "DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE'; END LOOP; END $$;"
  ```

---

## Migrations (Alembic, im Backend-Container)
- Interaktive Shell im Backend holen:  
  ```bash
  docker compose -f docker-compose.dev.yml exec backend sh
  cd /app
  ```
- Bestehende Migrations anwenden (upgrade to head):  
  ```bash
  docker compose -f docker-compose.dev.yml exec backend sh -c "cd /app && alembic upgrade head"
  ```
- Downgrade (z.B. ein Schritt zurück):  
  ```bash
  docker compose -f docker-compose.dev.yml exec backend sh -c "cd /app && alembic downgrade -1"
  ```
- Neue Migration erzeugen (auto-generate, kurze Nachricht anpassen):  
  ```bash
  docker compose -f docker-compose.dev.yml exec backend sh -c "cd /app && alembic revision --autogenerate -m \"desc\""
  ```
  Danach die generierte Migration prüfen und bei Bedarf erneut `alembic upgrade head` ausführen.

---

## Backup / Restore
- Dump erstellen (Host speichert Datei):  
  ```bash
  docker exec <DB_CONTAINER> pg_dump -U user -d eventhorizon > db-backup.sql
  ```
- Dump zurückspielen (überschreibt Daten!):  
  ```bash
  cat db-backup.sql | docker exec -i <DB_CONTAINER> psql -U user -d eventhorizon
  ```

---

## Start/Stop (falls nötig)
- DB starten (falls gestoppt, via Compose):  
  ```bash
  docker compose -f docker-compose.dev.yml up -d db
  ```
- Stoppen:  
  ```bash
  docker compose -f docker-compose.dev.yml stop db
  ```
- Komplett-Reset (Volumes wipen, destruktiv):  
  ```bash
  docker compose -f docker-compose.dev.yml down -v
  docker compose -f docker-compose.dev.yml up -d db
  ```
