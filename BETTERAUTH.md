# Better Auth Integration Guide

Dieses Dokument beschreibt die Better Auth Integration für EventHorizon (FastAPI + React SPA + Traefik) und dient als Referenz für lokale Entwicklung und Produktion.

## Architektur-Überblick
- Better Auth läuft als eigener Sidecar (`auth`), erreichbar unter `/api/auth/*` (same-origin via Traefik/Vite-Proxy).
- Backend (FastAPI) agiert als Resource Server: JWT-Verifikation via JWKS, Mapping auf Domain-User.
- Frontend nutzt `better-auth` Client (React) mit Session-Cookies + kurzlebigem JWT (für Backend).
- Datenbank: Shared Postgres, Better Auth Tabellen in separatem Schema `auth` (Konfliktfrei zur App-DB).

## Services & Routing
- Dev:
  - Vite-Proxies: `/api` → `http://localhost:8000`, `/api/auth` → `http://localhost:3000`.
  - Compose: `docker-compose.dev.yml` startet `db`, `backend`, `auth`.
- Prod:
  - Traefik-Labels routen `/api/auth` → auth-Service, `/api` → backend, `/` → frontend.

## Wichtige Env Variablen
Gemeinsam (Dev/Prod, .env / .env.example):
- `BETTER_AUTH_SECRET` (stark, random)
- `BETTER_AUTH_BASE_URL` (Dev: `http://localhost:5173`, Prod: `https://event-horizon.sp23.online`)
- `BETTER_AUTH_BASE_PATH` (`/api/auth`)
- `BETTER_AUTH_JWT_ISSUER` (`eventhorizon-auth`)
- `BETTER_AUTH_JWT_AUDIENCE` (`eventhorizon-api`)
- `BETTER_AUTH_JWKS_URL` (Dev: `http://localhost:3000/api/auth/jwks`, Prod: über Traefik)
- `BETTER_AUTH_TRUSTED_ORIGINS` (Dev: `http://localhost:5173`, Prod: `https://event-horizon.sp23.online`)
- `BETTER_AUTH_JWKS_CACHE_SECONDS` (z. B. 300)
- `BETTER_AUTH_DB_SCHEMA` (`auth`) – eigenes Schema für Better Auth Tabellen.

Backend-spezifisch:
- Nutzt `BETTER_AUTH_JWKS_URL`, `BETTER_AUTH_ISSUER`, `BETTER_AUTH_AUDIENCE` in `app/core/config.py`.

## Auth-Service (auth/)
- Runtime: Node 20, Hono + Better Auth.
- JWT-Plugin mit RS256 (JWKS bereitgestellt).
- DB: Postgres Pool, `search_path=auth,public`; Schema `auth` wird bei Start angelegt.
- Migrations: werden beim Start ausgeführt; „table exists“ wird geloggt und übersprungen.

### Dockerfiles
- `Dockerfile.dev`: Hot Reload (`npm run dev`, tsx watch).
- `Dockerfile`: Build mit `tsup`, Start `node dist/server.js`.

## Backend (FastAPI)
- `get_current_user` validiert Bearer-JWT gegen JWKS (RS256), prüft Issuer/Audience/exp.
- Mapping: `sub` → `user.id` oder `email` → `user.email`; falls kein User existiert, wird ein Minimal-User aus Claims angelegt (first/last name aus `name`, Dummy-Hash).
- Geschützte Endpunkte nutzen unverändert `Depends(get_current_user)`.

## Frontend
- Auth-Client: `frontend/src/lib/authClient.ts` (`better-auth/react`, basePath `/api/auth`).
- Session: Cookies (HttpOnly) vom Auth-Service; kurzlebiges JWT via `/api/auth/token` für Backend-Aufrufe.
- apiClient (`frontend/src/services/apiClient.ts`):
  - Kein LocalStorage mehr.
  - Bearer-Header wird on-demand via `fetchJwtToken()` geholt und in-memory gecached.
  - Login/Registration nutzen `signInWithEmail` / `signUpWithEmail`.

## Dev-Workflow
1) Env setzen (siehe oben), ggf. `POSTGRES_PASSWORD` mit `$` quoten/escapen.
2) Install:
   - `cd auth && npm install`
   - `cd frontend && npm install`
3) Start:
   - `docker compose -f docker-compose.dev.yml up --build auth backend` (Frontend separat `npm run dev`).
4) Test:
   - Register/Login unter `http://localhost:5173/login?mode=register`.
   - `/api/v1/users/me` muss mit gesetztem Cookie + JWT (aus `/api/auth/token`) 200 liefern.

## Prod-Deployment (Kurzcheckliste)
1) Secrets/Env setzen (Secret, Issuer/Audience, Trusted Origins).
2) `docker compose -f docker-compose.prod.yml build auth backend frontend`.
3) Traefik: `/api/auth` Router aktiv, TLS `websecure`, certresolver konfiguriert.
4) Smoke-Test: JWKS erreichbar, Login/Logout, `/api/v1/users/me` 200.

## Fehlermuster & Fixes
- **422 bei Registration**: E-Mail existiert bereits in Better Auth DB → andere Mail nutzen oder `DROP SCHEMA auth CASCADE; CREATE SCHEMA auth;` (Dev).
- **401 bei `/users/me`**: Prüfen, ob JWT RS256 ist (Key in JWKS), Issuer/Audience korrekt, und ob Auto-User-Anlage im Backend läuft (Logs).
- **Migrationsfehler „relation exists“**: Wird nun geloggt und übersprungen; ok.
- **Compose-Warnungen mit `$`**: Passwort mit `$` quoten/escapen.

## Security-Hinweise
- Keine Tokens im LocalStorage (nur Cookies + kurzlebige JWTs).
- `trustedOrigins` auf exakte Frontend-Origen beschränken.
- Cookies in Prod: `Secure`, `SameSite=None` (Better Auth handled bei HTTPS).
- RS256 JWKS, Cache mit TTL, Issuer/Audience prüfen.

## Email OTP (implementiert)
- Server: `auth/src/server.ts` nutzt `emailOTP` Plugin + Resend (ENV: `RESEND_API_KEY`, `MAIL_FROM_EMAIL`), OTP Länge 6, gültig 5 Minuten, 3 Versuche. Default-Email-Verifizierung via OTP (`overrideDefaultEmailVerification=true`).
- Client: `frontend/src/lib/authClient.ts` bindet `emailOTPClient` Plugin ein; die Methoden stehen auf `authClient.emailOtp` / `authClient.signIn.emailOtp` bereit.
- Flows:
  - OTP senden: `authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" | "email-verification" | "forget-password" })`
  - OTP-Login: `authClient.signIn.emailOtp({ email, otp })`
  - Email-Verifizierung: `authClient.emailOtp.verifyEmail({ email, otp })`
  - Passwort-Reset: `authClient.emailOtp.resetPassword({ email, otp, password })`
  - Optional Check: `authClient.emailOtp.checkVerificationOtp({ email, type, otp })`
- Hinweis: In Dev ohne RESEND_API_KEY wird der OTP im Log ausgegeben (Warnung); in Prod Resend aktivieren.
