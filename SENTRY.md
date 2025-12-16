# Sentry Integration

EventHorizon verwendet [Sentry](https://sentry.io) für Error Tracking, Performance Monitoring und Application Performance Monitoring (APM) in Frontend und Backend.

---

## 📋 Übersicht

### Frontend (React/Vite)
- **Error Tracking**: Automatisches Erfassen von JavaScript-Fehlern und React-Fehlergrenzen
- **Performance Monitoring**: Tracking von Ladezeiten, Navigation und Rendering-Performance
- **Session Replay**: Optional verfügbar für Debugging
- **Tunnel-Endpoint**: Umgeht Ad-Blocker, die Sentry-Requests blockieren

### Backend (FastAPI/Python)
- **Error Tracking**: Automatisches Erfassen von Python-Exceptions
- **Performance Monitoring**: Tracking von API-Requests, Database Queries
- **Profiling**: CPU-Profiling für Performance-Analysen
- **Transaction Tracing**: Distributed Tracing über Frontend und Backend

---

## ⚙️ Konfiguration

### Umgebungsvariablen

Alle Sentry-Konfigurationen befinden sich in der **Root `.env`** Datei:

```env
########################
# Sentry (Backend Error Monitoring & Tracing)
########################
SENTRY_DSN=https://4f348294df475ee68a5f0625eacea6e6@o4510541574111232.ingest.de.sentry.io/4510541666517072
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.5
SENTRY_PROFILES_SAMPLE_RATE=0.5

########################
# Frontend (Vite)
########################
VITE_USE_MOCKS=false
VITE_SENTRY_DSN=https://2c3e839f311d4470b538318a787c56b8@o4510541574111232.ingest.de.sentry.io/4510541685391440
VITE_SENTRY_ENVIRONMENT=development
VITE_SENTRY_TRACES_SAMPLE_RATE=0.5
VITE_APP_VERSION=1.0.0
```

### Konfigurationsparameter

#### Backend
| Parameter | Beschreibung | Empfohlener Wert |
|-----------|-------------|------------------|
| `SENTRY_DSN` | Backend Sentry Project DSN | Aus Sentry Dashboard |
| `SENTRY_ENVIRONMENT` | Umgebungsname (development, staging, production) | `development` / `production` |
| `SENTRY_TRACES_SAMPLE_RATE` | Performance Monitoring Sample Rate (0.0 - 1.0) | `0.1` (prod), `0.5` (dev) |
| `SENTRY_PROFILES_SAMPLE_RATE` | Profiling Sample Rate (0.0 - 1.0) | `0.1` (prod), `0.5` (dev) |

#### Frontend
| Parameter | Beschreibung | Empfohlener Wert |
|-----------|-------------|------------------|
| `VITE_SENTRY_DSN` | Frontend Sentry Project DSN | Aus Sentry Dashboard |
| `VITE_SENTRY_ENVIRONMENT` | Umgebungsname | `development` / `production` |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | Performance Monitoring Sample Rate | `0.1` (prod), `0.5` (dev) |
| `VITE_APP_VERSION` | App Version für Release Tracking | `1.0.0` |

### DSN erhalten

1. Gehe zu [Sentry Dashboard](https://sentry.io)
2. Navigiere zu **Settings** → **Projects** → **[Your Project]** → **Client Keys (DSN)**
3. Kopiere den DSN und füge ihn in die `.env` ein

**Wichtig**: Frontend und Backend sollten **separate Sentry-Projekte** haben für bessere Übersicht!

---

## 🧪 Sentry testen

### Option 1: Dev Sentry Test Seite (Empfohlen)

EventHorizon hat eine dedizierte Test-Seite für Sentry:

1. **Öffne die Test-Seite:**
   ```
   http://localhost:5173/dev/sentry-test
   ```

2. **Verfügbare Tests:**
   - **Frontend Error auslösen**: Wirft einen JavaScript-Fehler
   - **Frontend Message senden**: Sendet eine Info-Nachricht an Sentry
   - **Backend Error auslösen**: Triggert einen Python-Error im Backend
   - **Backend Message senden**: Sendet eine Backend-Nachricht
   - **Backend Transaction testen**: Testet Performance Monitoring

3. **Überprüfe Sentry Dashboard:**
   - Frontend: https://sentry.io/organizations/[org]/issues/?project=[frontend-project-id]
   - Backend: https://sentry.io/organizations/[org]/issues/?project=[backend-project-id]

### Option 2: Manual Testing

#### Frontend testen

Öffne die Browser-Konsole und führe aus:

```javascript
// Error werfen
throw new Error("Test Sentry Error");

// Message senden
Sentry.captureMessage("Test message", "info");
```

#### Backend testen

Rufe die Development-Endpoints auf:

```bash
# Error auslösen
curl http://localhost:8000/api/v1/dev/sentry/test-error

# Message senden
curl http://localhost:8000/api/v1/dev/sentry/test-message

# Transaction testen
curl http://localhost:8000/api/v1/dev/sentry/test-transaction
```

### Option 3: Python CLI (Backend)

Im Backend-Container:

```bash
docker compose -f docker-compose.dev.yml exec backend python

>>> import sentry_sdk
>>> sentry_sdk.capture_message("Test from Python CLI", "info")
>>> raise Exception("Test error from Python CLI")
```

---

## 🔧 Tunnel-Endpoint

### Problem
Ad-Blocker (uBlock Origin, Privacy Badger, etc.) blockieren oft Requests an `sentry.io`, was verhindert, dass Frontend-Fehler erfasst werden.

### Lösung
EventHorizon nutzt einen **Sentry Tunnel Endpoint** über das Backend:

```
Frontend → POST /api/v1/sentry-tunnel → Sentry
```

### Konfiguration

Die Tunnel-Konfiguration befindet sich in:

**Frontend** (`frontend/src/main.tsx`):
```typescript
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  tunnel: "/api/v1/sentry-tunnel",  // ← Tunnel aktiviert
  // ...
});
```

**Backend** (`backend/app/api/endpoints/sentry_tunnel.py`):
```python
@router.post("")
async def sentry_tunnel(request: Request):
    """
    Proxy endpoint to forward Sentry envelopes.
    Bypasses ad-blockers that block sentry.io domains.
    """
    # ... forwarding logic
```

### Testen

1. **Ad-Blocker aktivieren** (z.B. uBlock Origin)
2. **Öffne Dev Tools** → Network Tab
3. **Löse einen Frontend-Fehler aus**
4. **Überprüfe**: Requests gehen an `/api/v1/sentry-tunnel` (nicht blockiert) statt `sentry.io` (blockiert)

---

## 📊 Sentry Dashboard

### Wichtige Bereiche

#### Issues (Fehler)
- **URL**: `https://sentry.io/organizations/[org]/issues/`
- Zeigt alle erfassten Fehler
- Gruppiert gleiche Fehler automatisch
- Stack Traces, User Context, Breadcrumbs

#### Performance
- **URL**: `https://sentry.io/organizations/[org]/performance/`
- API-Response-Zeiten
- Database Queries
- Langsame Transaktionen
- Web Vitals (Frontend)

#### Releases
- **URL**: `https://sentry.io/organizations/[org]/releases/`
- Tracking von Deployments
- Source Maps für Frontend (optional)

---

## 🐛 Troubleshooting

### Frontend-Fehler erscheinen nicht in Sentry

**Mögliche Ursachen:**

1. **DSN nicht konfiguriert**
   ```bash
   # Prüfe .env
   cat .env | grep VITE_SENTRY_DSN
   ```

2. **Ad-Blocker blockiert Requests**
   - Prüfe Network Tab auf blockierte Requests
   - Tunnel-Endpoint sollte das verhindern

3. **Vite-Dev-Server lädt .env nicht**
   ```bash
   # Neustart des Dev-Servers
   cd frontend
   npm run dev
   ```

4. **Sample Rate zu niedrig**
   - Setze `VITE_SENTRY_TRACES_SAMPLE_RATE=1.0` für 100% Sampling im Development

### Backend-Fehler erscheinen nicht

1. **DSN nicht konfiguriert**
   ```bash
   docker compose -f docker-compose.dev.yml exec backend env | grep SENTRY
   ```

2. **Sentry SDK nicht installiert**
   ```bash
   docker compose -f docker-compose.dev.yml exec backend pip list | grep sentry
   ```

3. **Container-Restart nach .env-Änderung**
   ```bash
   docker compose -f docker-compose.dev.yml restart backend
   ```

### Tunnel-Endpoint funktioniert nicht

1. **CORS-Fehler**
   - Prüfe `backend/app/main.py` CORS-Konfiguration
   - Frontend-Origin muss in `allow_origins` sein

2. **404 Not Found**
   ```bash
   # Prüfe ob Route registriert ist
   curl http://localhost:8000/api/v1/sentry-tunnel -X POST
   # Sollte 401 oder 400 zurückgeben, nicht 404
   ```

3. **Backend-Logs prüfen**
   ```bash
   docker compose -f docker-compose.dev.yml logs backend | grep sentry
   ```

---

## 📁 Relevante Dateien

### Frontend
- `frontend/src/main.tsx` - Sentry-Initialisierung
- `frontend/src/pages/DevSentryTest.tsx` - Test-Seite
- `frontend/vite.config.ts` - Vite-Konfiguration (envDir)

### Backend
- `backend/app/main.py` - Sentry-Initialisierung
- `backend/app/api/endpoints/sentry_tunnel.py` - Tunnel-Endpoint
- `backend/app/api/endpoints/dev.py` - Development Test-Endpoints
- `backend/app/api/api.py` - Router-Registrierung

### Konfiguration
- `.env` - Alle Umgebungsvariablen (Root)
- `.env.example` - Beispiel-Konfiguration

---

## 🚀 Best Practices

### Development
- **Sample Rate**: 0.5 - 1.0 (50-100% der Events)
- **Environment**: `development`
- **Profiling**: Aktiviert für Performance-Debugging

### Production
- **Sample Rate**: 0.1 - 0.2 (10-20% der Events)
- **Environment**: `production`
- **Profiling**: 0.1 (10% der Transactions)
- **Release Tracking**: Version aus `VITE_APP_VERSION` setzen

### Sicherheit
- **Nie DSNs in Git committen** (außer in `.env.example` als Placeholder)
- **Sensitive Daten filtern**:
  ```python
  # Backend: Automatisch durch Sentry
  # Passwörter, Tokens, etc. werden standardmäßig gefiltert
  ```

### Performance
- Niedrigere Sample Rates in Production reduzieren Sentry-Kosten
- Performance-kritische Endpoints mit Transactions tracken
- Lange DB-Queries identifizieren und optimieren

---

## 📚 Weitere Ressourcen

- [Sentry React Dokumentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Python Dokumentation](https://docs.sentry.io/platforms/python/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Sentry Tunnel Dokumentation](https://docs.sentry.io/platforms/javascript/troubleshooting/#dealing-with-ad-blockers)

---

**Letzte Aktualisierung**: 2025-12-16
