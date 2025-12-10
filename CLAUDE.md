# CLAUDE.md

**Guidance for AI Agents working on EventHorizon.**

## Context & Architecture
See `GEMINI.md` for full architectural details, tech stack, and conventions.
See `README.md` for deployment and user documentation.

## Quick Cheat Sheet

### Development Commands
Run these from `frontend/` unless specified:
```bash
npm run dev        # Frontend: http://localhost:5173
npm run build      # Production build
npm run lint       # Run ESLint
npm test           # Run Vitest
```

### Docker / Backend Commands
Run from root:
```bash
docker compose -f docker-compose.dev.yml up -d  # Start Dev Stack (Hot Reload)
docker compose logs -f backend                  # Tail Backend Logs
docker restart eventhorizon-backend-1           # Manual restart (if needed)
```

### Database Access
```bash
# Connect to DB
docker exec -it eventhorizon-db-1 psql -U eventhorizon_usr -d eventhorizon

# Reset DB (via Alembic)
docker exec eventhorizon-backend-1 alembic downgrade base
docker exec eventhorizon-backend-1 alembic upgrade head
```

### Key Paths
- **Frontend Source:** `frontend/src/`
- **Backend Source:** `backend/app/`
- **API Definition:** `backend/app/main.py` & `backend/app/api/`
- **DB Models:** `backend/app/models/`
- **AI Service:** `backend/app/services/ai_service.py`
- **Emails:** `backend/app/services/email_service.py` & `templates/`

## Coding Rules

### General
- **Language:** Code/Comments in English. UI Text in German.
- **Style:** Follow existing patterns. Use `cn()` for Tailwind.
- **Safety:** Never commit secrets. Use `.env`.

### Frontend (React)
- **State:** Zustand for global, TanStack Query for server state.
- **Styling:** Tailwind CSS + Shadcn UI.
- **Imports:** Use `@/` alias.

### Backend (FastAPI)
- **Async:** Use `async def` for all endpoints/services.
- **Typing:** Use strict Pydantic models.
- **Config:** Use `settings` from `app.core.config`.

## Common Tasks

### Adding a new API Endpoint
1. Define Pydantic Schema in `backend/app/schemas/`.
2. Add Endpoint in `backend/app/api/endpoints/`.
3. Register in `backend/app/api/api.py`.
4. Add Frontend Service method in `frontend/src/services/apiClient.ts`.
5. Update Frontend UI to consume it.

### Modifying AI Logic
- Edit `backend/app/services/ai_service.py`.
- Adjust prompts carefully.
- Test with mock data first if possible to save API tokens.