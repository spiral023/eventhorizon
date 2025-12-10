# EventHorizon - System Context

Dies ist die zentrale Kontext-Datei für KI-Agenten. Sie beschreibt Architektur, Konventionen und Workflows für das gesamte Projekt (Frontend + Backend).

## 1. Projektübersicht
EventHorizon ist eine Plattform für soziale Eventplanung in Teams.
- **Ziel:** Kollaborative Entscheidungsfindung für Teamevents (Ideen -> Voting -> Termin -> Infos).
- **Struktur:** Room-basiert (wie Slack/Discord), mit Rollen (Owner, Admin, Member).

## 2. Tech Stack

### Frontend (`frontend/`)
*   **Core:** React 18, Vite, TypeScript.
*   **UI:** Shadcn UI (Radix Primitives), Tailwind CSS.
*   **State:** Zustand (Auth/Global), TanStack Query (Server Data).
*   **Routing:** React Router v6.
*   **Forms:** React Hook Form + Zod.
*   **Maps:** React Leaflet.

### Backend (`backend/`)
*   **Core:** FastAPI (Python 3.11+).
*   **Database:** PostgreSQL 15, SQLAlchemy (Async), Alembic (Migrations).
*   **AI:** OpenRouter SDK (Zugriff auf Claude 3.5 Sonnet, GPT-4o, Gemini 2.0).
*   **Email:** Resend API + Jinja2 Templates.

### Infrastructure
*   **Dev:** Docker Compose (lokal).
*   **Prod:** Docker Compose + Traefik Reverse Proxy (SSL via LetsEncrypt).

## 3. Architektur & Datenfluss

### Event Phasen-Modell
Events durchlaufen strikte Phasen (`frontend/src/utils/phaseStateMachine.ts`):
1.  **Proposal:** Aktivitäten vorschlagen (AI-gestützt).
2.  **Voting:** Team stimmt ab.
3.  **Scheduling:** Datum finden.
4.  **Info:** Finales Event mit Buchungsdetails.

### API & Kommunikation
*   **REST API:** `/api/v1` (FastAPI).
*   **Auth:** OAuth2 Password Bearer (JWT).
*   **AI Integration:** Backend kapselt OpenRouter Calls. Frontend ruft Endpoints wie `/api/v1/ai/analyze-team` auf.

## 4. Coding Conventions

### General
*   **Sprache:** Code/Kommentare in Englisch. UI-Texte in Deutsch.
*   **Typing:** Strict Typing (TypeScript & Python Type Hints).

### Frontend
*   **Components:** Functional Components. `const Component = () => {}`.
*   **Imports:** Absolute Imports `@/...`.
*   **Styling:** `className={cn("...", className)}` Pattern nutzen.

### Backend
*   **Structure:** `app/api/endpoints`, `app/services`, `app/models`, `app/schemas`.
*   **Services:** Business Logic in `services/` (z.B. `ai_service.py`), nicht in Routen.
*   **Config:** Pydantic `BaseSettings` in `core/config.py`.

## 5. Setup & Deployment

### Environment Variables (.env)
*   **Frontend:** `VITE_USE_MOCKS=false` (Prod)
*   **Backend:**
    *   `OPENROUTER_API_KEY`: Für AI Features.
    *   `RESEND_API_KEY`: Für Mails.
    *   `POSTGRES_...`: DB Credentials.

### Produktions-Deployment
Siehe `README.md`. Container laufen in einem internen Docker-Netzwerk. Nur Frontend (Nginx) wird via Traefik exposet.
