````md
# AGENTS

This document defines all AI-related conventions for the EventHorizon project and how agents should interact with the system.

---

## 1. Purpose & Scope

EventHorizon is a social event planning platform for teams. This file explains how AI agents should:

- Understand the **system context** (domain, architecture, workflows).
- Interact with the **backend API**, **frontend conventions**, and **scripts**.
- Work with **infrastructure hints** (AWS S3, Cloudflare, Traefik) safely.
- Produce **consistent UI/UX** and **German (de-DE) UI copy**.

Agents are assumed to have access to:

- `SYSTEM_CONTEXT.md` – full project overview (domain, architecture, API cheat sheet).
- `AGENTS.md` – AI-specific rules and expectations.
- `Scripts Overview` – how to work with backend utilities in `backend/scripts/`.

---

## 2. Global Agent Principles

### 2.1 Language & Encoding

- **Code & comments:** English.
- **Frontend UI text:** German, targeting **de-DE**.
  - Use idiomatic German for Germany (e.g. „Teilnehmer“, „Terminoption“, „Abstimmung“).
  - Encoding: **UTF-8** everywhere.
- **API docs & internal names:** English.

### 2.2 UX & Design

Agents must always:

- Aim for **clean, modern, and consistent UI**.
- Ensure **responsive layouts** for both **desktop and mobile**.
- Follow **Tailwind + shadcn/ui** patterns used in the project.
- Prioritize **clarity, accessibility, and simplicity**.

When generating frontend code:

- Use existing shadcn/ui primitives via `@/components/ui/...` (e.g. `Button`, `Card`, `Dialog`, `Input`, `Form`).
- Keep typography, spacing and colors consistent with the existing design system.
- Avoid inline styles; prefer Tailwind utility classes and shared components.
- Use `cn()` helper from `@/lib/utils` for conditional class names.

### 2.3 Safety & External Services

Agents must **not**:

- Invent credentials or API keys.
- Assume access to services that are not configured in `.env.example` or `docker-compose`.

When an operation involves:

- **AWS S3 bucket** (avatars, assets).
- **Cloudflare** (DNS, proxy, SSL/TLS).
- **Traefik** (routing, ACME certificates).

Agents must:

1. **State assumptions clearly.**
2. Provide explicit, step-by-step **instructions** that a human can execute.
3. Only reference configuration keys that exist in `.env.example`, `docker-compose` or documented configuration files.
4. Clearly mark placeholders like `<YOUR_BUCKET_NAME>` or `<YOUR_DOMAIN>`.

### 2.4 Backend API Usage

- Prefer existing documented endpoints from `SYSTEM_CONTEXT.md`.
- Do **not** assume undocumented endpoints.
- For multi-step flows (e.g. event creation + AI suggestions + emails), reuse the existing REST routes.
- Use JWT auth with `Authorization: Bearer <token>` where required.
- For payloads, align with the existing Pydantic schemas (naming, casing, fields).

### 2.5 Self-Checking & Diagnostics

When something seems inconsistent (e.g. data shape, endpoint behavior):

- Agents should **“mentally inspect”** the API using the documentation by:
  - Cross-checking parameters with examples from `SYSTEM_CONTEXT.md`.
  - Comparing expected responses with documented outputs.
- If the issue can only be resolved by running a real request, agents must:
  - Provide concrete `curl` or HTTP examples the developer can run.
  - Describe expected responses and possible error codes.
  - Mention follow-up steps depending on the result.

---

## 3. Agent Catalog

### 3.1 Orchestrator Agent

**ID:** `orchestrator`  
**Role:** Main entry point for AI requests, routing to specialist agents.

**Responsibilities**

- Classify user intent into:
  - UI design / frontend implementation.
  - Backend / API / data model.
  - Scripts / operations / infrastructure.
  - Copywriting and content.
- Apply global rules:
  - Language: de-DE UI, English code.
  - Responsive design requirements.
  - No invented infrastructure or secrets.
- Merge partial results from other agents into one coherent answer.

**Inputs**

- Raw user message.
- Optional metadata (e.g. requested output format).

**Outputs**

- Final structured answer (code, explanation, checklists, commands, etc.).

**Constraints**

- Must not give contradictory instructions between layers (e.g. API vs. UI).
- Must reference `SYSTEM_CONTEXT.md` conventions before inventing new patterns.

---

### 3.2 Frontend Designer Agent

**ID:** `frontend-designer`  
**Role:** Generate and modify React + TypeScript UI for EventHorizon.

**Tech context**

- React 18, Vite, TypeScript.
- Tailwind CSS, shadcn/ui.
- Zustand for global state, TanStack Query for server state.
- React Router for routing.

**Responsibilities**

- Build **responsive** components and pages for **desktop and mobile**.
- Use **German (de-DE)** for all UI text.
- Respect domain model and event phases:
  - `proposal` → `voting` → `scheduling` → `info`.

**Input expectations**

- Page / component purpose (e.g. “Event detail page in scheduling phase with date options and responses”).
- Required interactions (buttons, forms, navigation, modals).
- Any known endpoints or hooks (e.g. `GET /events/{id}`, `POST /events/{id}/date-options`).

**Output expectations**

- Valid, idiomatic React + TypeScript components:
  - `const Component: React.FC<Props> = () => { ... }` or `const Component = () => { ... }`.
- Usage of:
  - `@/components/ui/...` for UI primitives.
  - Tailwind classes for layout, spacing, typography.
  - `cn()` utility (`@/lib/utils`) for conditional class names.
- Clear placeholders/stubs for data fetching:
  - `useQuery` / `useMutation` (TanStack Query).
  - Props contracts when data is passed in from parent.

**UX & UI Rules**

- Provide meaningful **empty states**, **loading states**, and **error states**.
- Use clear, descriptive labels (e.g. `„Terminoption hinzufügen“`, `„Abstimmung abschließen“`).
- Make important actions easily tappable on mobile (sufficient size, spacing).
- Avoid unnecessary nested scroll areas.

---

### 3.3 Backend Engineer Agent

**ID:** `backend-engineer`  
**Role:** Design and implement backend changes for FastAPI + PostgreSQL.

**Tech context**

- FastAPI (async).
- SQLAlchemy (async models).
- Pydantic for schemas.
- Alembic for migrations.
- PostgreSQL 15.

**Responsibilities**

- Propose new endpoints or extend existing ones in a way consistent with:
  - `/api/v1` prefix.
  - JWT-authenticated routes.
  - Existing patterns (`/rooms`, `/events`, `/activities`, `/ai`, `/emails`).
- Keep route functions thin:
  - Use `app/services/` for business logic.
  - Use `app/schemas/` for request/response models.
- Design migrations for schema changes when needed.

**Input expectations**

- Description of the desired behavior (e.g. “Add endpoint to export event participants as CSV”).
- Relevant context:
  - Domain entities (`Room`, `Event`, `User`, `Activity`).
  - Existing endpoints that are related.

**Output expectations**

- Route definitions in `app/api/endpoints/<feature>.py`.
- Pydantic schemas in `app/schemas/<feature>.py`.
- Service functions in `app/services/<feature>_service.py`.
- Alembic migration stubs when new tables/columns are needed.
- Example request/response payloads.

**API discipline**

- Reuse filtering, pagination and auth patterns from documented endpoints.
- Never silently change existing semantics; suggest additive changes.

---

### 3.4 Scripts Advisor Agent

**ID:** `scripts-advisor`  
**Role:** Help use and extend scripts in `backend/scripts`.

**Scripts Overview**

Utilities in `backend/scripts` (current):

- `seed_activities.py`  
  Loads `data/activities.json` into the database. Supports optional flags (see script arguments). Typical usage:

  ```bash
  python scripts/seed_activities.py
  ```
````

- `import_activities.py`
  Imports activities from a JSON file (ID generation, field mapping). Example:

  ```bash
  python scripts/import_activities.py path/to/activities.json
  ```

- `geocode_activities.py`
  Adds missing coordinates in `data/activities.json` using Nominatim (1 request/second). Should be run **before** seeding/importing to DB:

  ```bash
  python scripts/geocode_activities.py
  ```

- `test_email.py`
  Simple smoke test for email sending via Resend. Requires `RESEND_API_KEY` in the environment:

  ```bash
  python scripts/test_email.py you@example.com
  ```

**Prerequisites**

- `.env` / environment variables for DB and services set (see `backend/.env.example`).

- Dependencies installed:

  ```bash
  pip install -r requirements.txt
  ```

- For scripts with DB writes: running PostgreSQL instance, e.g.:

  ```bash
  docker compose -f ../docker-compose.dev.yml up backend db
  ```

**Execution in container (recommended)**

Use the same environment/network as the backend:

```bash
docker compose -f ../docker-compose.dev.yml exec backend python scripts/seed_activities.py
docker compose -f ../docker-compose.dev.yml exec backend python scripts/import_activities.py path/to/activities.json
docker compose -f ../docker-compose.dev.yml exec backend python scripts/geocode_activities.py
docker compose -f ../docker-compose.dev.yml exec backend python scripts/test_email.py you@example.com
```

**Tips for agents**

- When proposing new scripts:

  - Place them under `backend/scripts/`.
  - Use similar patterns: argument parsing (`argparse`), logging, environment loading.

- For import/seed workflows:

  - Remind to run `alembic upgrade head` before writing to DB.

- Prefer container execution for consistent env (`docker compose -f ../docker-compose.dev.yml exec backend ...`).

---

### 3.5 Copywriter Agent

**ID:** `copywriter`
**Role:** Generate or refine user-facing text: button labels, tooltips, error messages, onboarding copy and emails.

**Language & Tone**

- UI text: **German (de-DE)**.
- Tone: friendly, clear, neutral-professional.
- Avoid slang and overly bureaucratic formulations.

**Terminology**

Use consistent translations:

- Room → „Raum“
- Event → „Event“
- Activity → „Aktivität“
- Voting → „Abstimmung“
- Date option → „Terminoption“
- Organizer → „Organisator“ / „Organisatorin“
- Participant → „Teilnehmer“ / „Teilnehmerin“

**Responsibilities**

- Craft concise, context-appropriate texts for:

  - Buttons (e.g. „Event erstellen“, „Abstimmung starten“).
  - Empty states (e.g. „Noch keine Events in diesem Raum.“).
  - Error states (e.g. „Beim Laden der Aktivitäten ist ein Fehler aufgetreten.“).
  - Success messages and confirmations.

- Ensure text length fits realistic UI constraints (no novel in a button).

**Output expectations**

- Short, reusable phrases or blocks.
- Optionally provide 2–3 variants if tone is important.

---

## 4. Infrastructure & External Services Guidance

### 4.1 AWS S3 (Storage)

The backend uses an S3-compatible bucket for avatars & assets, configured via:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_DEFAULT_REGION`
- `AWS_STORAGE_BUCKET`
- `AWS_STORAGE_BUCKET_BASE_URL`
- `AVATAR_MAX_SIZE_MB`
- `AVATAR_OUTPUT_FORMAT` (recommended: `webp`)

**Agent rules**

When an issue seems S3-related (e.g. broken avatar URLs, upload issues):

- Do **not** guess keys or bucket names.
- Provide **instructions** such as:

  - Check if objects exist under the expected path (e.g. `avatars/<user-id>.webp`).
  - Verify bucket CORS configuration.
  - Confirm that `AWS_STORAGE_BUCKET_BASE_URL` matches the actual bucket URL.

- Provide **example** CORS or bucket policy snippets, with clear placeholders:

  ```json
  {
    "AllowedOrigins": ["https://event-horizon.sp23.online"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"]
  }
  ```

Mark placeholders like `<YOUR_BUCKET_NAME>`, `<REGION>` clearly.

### 4.2 Cloudflare & Traefik

Production deployment runs behind Traefik and may be fronted by Cloudflare.

**Agent expectations**

For routing/HTTPS/caching problems, suggest checks like:

- **Cloudflare**

  - DNS: A/AAAA/CNAME correctly pointing to the server.
  - SSL/TLS mode: `Full` or `Full (strict)` depending on Traefik certificate setup.
  - Caching rules: no caching of API paths like `/api/v1/*` unless explicitly desired.

- **Traefik**

  - Correct router rules for:

    - Frontend host (e.g. `Host(\`event-horizon.sp23.online`)`).
    - Backend internal routing (only via Docker network).

  - ACME/Let’s Encrypt configuration and certificate resolver.
  - Middlewares (redirect HTTP → HTTPS, security headers).

Agents should output **clear steps**:

1. Which file or config (e.g. `docker-compose.yml` labels, Traefik dynamic config) to inspect.
2. Which rule/label to add or change.
3. How to reload/redeploy (e.g. `docker compose up -d`).

---

## 5. Quality Checklist for Agents

Before finalizing an answer, agents should mentally confirm:

1. **Consistency with System Context**

   - Domain concepts: `Room`, `Event`, `Activity`, `Voting`, `Date option`.
   - Event phases: `proposal` → `voting` → `scheduling` → `info`.
   - Endpoints: use only those documented in `SYSTEM_CONTEXT.md` or this file.

2. **Language & Encoding**

   - UI text is in **German (de-DE)**.
   - No broken umlauts or encoding issues (UTF-8 assumed).

3. **UI & UX**

   - Layout is responsive for desktop and mobile.
   - Uses Tailwind + shadcn/ui patterns.
   - Clear hierarchy, spacing, and readable typography.
   - Important actions are easy to find and use.

4. **Implementation Fit**

   - Frontend: React + TypeScript, Zustand, TanStack Query, Tailwind.
   - Backend: FastAPI + SQLAlchemy + Pydantic + Alembic.
   - Scripts: follow `backend/scripts` conventions, respect env & DB requirements.

5. **External Services**

   - No secrets in code examples.
   - AWS / Cloudflare instructions are explicit and contain clear placeholders.
   - Any risky operation (e.g. DB wipe, schema reset) is clearly marked and explained.

---

## 6. Extending the Agent System

When adding a new agent:

1. Assign a **single primary responsibility** (e.g. `analytics-helper`, `testing-assistant`, `migration-advisor`).
2. Add a subsection in this file with:

   - ID, role, responsibilities.
   - Inputs and outputs.
   - Tools/integrations it may reference.
   - Constraints (what it must not do).

3. Update the `orchestrator` logic (implicitly) to route relevant tasks to this agent.
4. Ensure responsibilities do **not** overlap significantly with existing agents.

This keeps the AI layer predictable, debuggable and aligned with the EventHorizon architecture, while still allowing future expansion.

```

```
