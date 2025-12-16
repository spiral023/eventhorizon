# Docker-HowTo for das Dev-Setup

Kurze Sammlung der wichtigsten Docker- und Compose-Befehle fuer das lokale Backend-Development mit `docker-compose.dev.yml`.

---

## Voraussetzungen

- Docker und Docker Compose sind installiert.
- `docker-compose.dev.yml` liegt im Projekt-Root.
- Backend-Service in Compose heisst `backend`.
- Optionaler Container-Name direkt ueber Docker: `eventhorizon-backend-1`.

---

## 1. Container- und Service-Uebersicht

### Laufende Container

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}'
```

### Services im Dev-Compose

```bash
docker compose -f docker-compose.dev.yml ps
```

---

## 2. Starten, Stoppen, Neustarten

### Backend starten bzw. neu bauen

```bash
docker compose -f docker-compose.dev.yml up -d backend
```

```bash
docker compose -f docker-compose.dev.yml up -d --build backend
```

### Backend neu starten, stoppen, entfernen

```bash
docker compose -f docker-compose.dev.yml restart backend
```

```bash
docker compose -f docker-compose.dev.yml stop backend
```

```bash
docker compose -f docker-compose.dev.yml rm -f backend
```

### Kompletten Dev-Stack stoppen und entfernen

```bash
docker compose -f docker-compose.dev.yml down
```

---

## 3. Logs, Shell und Debugging

### Logs des Backend-Services (ueber Compose)

```bash
docker compose -f docker-compose.dev.yml logs -f backend
```

```bash
docker compose -f docker-compose.dev.yml logs -f --tail=100 backend
```

### Shell im Backend-Container

```bash
docker compose -f docker-compose.dev.yml exec backend sh
```

> `exec` nutzt den laufenden Container. Fuer einmalige Tasks kannst du auch `run --rm` einsetzen.

### Direkt ueber Docker (ohne Compose)

```bash
docker logs -f eventhorizon-backend-1
```

```bash
docker exec eventhorizon-backend-1 sh -c "cd /app && python -m pip install -r requirements.txt"
```

---

## 4. Debugging und Inspektion

### Env, Files und Prozesse

```bash
docker compose -f docker-compose.dev.yml exec backend env
```

```bash
docker compose -f docker-compose.dev.yml exec backend sh -c "ls -lah"
```

```bash
docker top eventhorizon-backend-1
```

### Netzwerk und IP

```bash
docker inspect eventhorizon-backend-1 | jq '.[0].NetworkSettings.IPAddress'
```

```bash
docker network ls
```

```bash
docker inspect <network-name>
```

### Image-Infos und Compose-Config

```bash
docker inspect eventhorizon-backend-1 | grep -i '"Image"' -n
```

```bash
docker compose -f docker-compose.dev.yml config
```

---

## 5. Typische Dev-Tasks im Backend-Container

### Python-Dependencies installieren

```bash
docker compose -f docker-compose.dev.yml exec backend sh -c "cd /app && python -m pip install -r requirements.txt"
```

```bash
docker compose -f docker-compose.dev.yml run --rm backend sh -c "cd /app && python -m pip install -r requirements.txt"
```

### Einzelnes Paket im Backend Container

```bash
docker compose -f docker-compose.dev.yml exec backend pip install unidecode
```

### Tests und Infos

```bash
docker compose -f docker-compose.dev.yml exec backend python -m pytest
```

```bash
docker compose -f docker-compose.dev.yml exec backend sh -c "python -m pip list"
```

```bash
docker compose -f docker-compose.dev.yml exec backend sh -c "cat /etc/os-release"
```

---

## 6. Images, Volumes und Cleanup

### Images und Volumes anzeigen

```bash
docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}'
```

```bash
docker volume ls
```

```bash
docker volume inspect <volume-name>
```

### Aufraeumen und Platzverbrauch

```bash
docker system df
```

```bash
docker rmi $(docker images -f "dangling=true" -q)
```

```bash
docker system prune -f
```

---

## 7. Kleine Quality-of-Life-Helfer

```bash
docker stats
```

```bash
docker compose -f docker-compose.dev.yml config
```

## 8. Datenbank-Migration erstellen - DEV

```bash
docker compose -f docker-compose.dev.yml exec backend alembic revision --autogenerate -m "description"
```

## 9. Datenbank-Migration erstellen - PROD

```bash
docker compose -f docker-compose.prod.yml exec backend alembic revision --autogenerate -m "description"
```

## 10. Datenbank-Migration im Docker Backend Container anwenden

```bash
docker compose -f docker-compose.dev.yml exec backend alembic upgrade head
```

## 11. Aktivitäten seeden (lädt Activities aus: /app/data/activities.json)

```bash
docker compose -f docker-compose.dev.yml exec backend python scripts/seed_activities. (-- force zum überschreiben)
```

## 12. Nano Banana Bilder in .webp Dateien konvertieren

```bash
docker compose -f docker-compose.dev.yml exec backend python scripts/convert_images.py --format webp --quality 60
```
