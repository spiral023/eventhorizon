# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"eventhorizon" is a React/TypeScript web application for corporate team event planning. The app facilitates a multi-phase workflow where teams can propose activities, vote on them, schedule dates, and manage event logistics. Built with Vite, React Router, shadcn/ui components, TanStack Query, Zustand for state management, and Zod for validation.

The project was initially scaffolded with Lovable (lovable.dev) and is maintained in German, with UI text in German but code/comments in English.

## Development Commands

```bash
# Install dependencies
npm i

# Start development server (http://localhost:8080)
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Run ESLint
npm run lint

# Preview production build
npm run preview
```

## Core Architecture

### Event Phase State Machine

Events follow a strict 4-phase lifecycle managed by `src/utils/phaseStateMachine.ts`:

1. **proposal** → Organizers propose activities
2. **voting** → Team members vote on proposed activities
3. **scheduling** → Date options are proposed and responses collected
4. **info** → Final event details are displayed

Phase transitions are unidirectional and managed by admins/owners only. The state machine enforces:
- Valid transitions via `canTransition(from, to)`
- Role-based permissions via `canManageEvent(role)`
- Deadline-based auto-advancement logic

### State Management

**Zustand Stores** (`src/stores/`):
- `authStore.ts`: User authentication, room roles, persisted via localStorage
  - Mock authentication system (currently always logged in)
  - Room-specific role mapping: `roomRoles: Record<string, RoomRole>`
  - Roles: `owner`, `admin`, `member`

**TanStack Query**: Server state caching for API calls (rooms, events, activities)

### Data Layer

**Mock API** (`src/services/apiClient.ts`):
- All API functions return `Promise<ApiResult<T>>` where `ApiResult = { data: T, error?: ApiError }`
- In-memory data stores for rooms, activities, events
- Simulated network delays (50-800ms)
- No real backend; data resets on page reload

**Domain Types** (`src/types/domain.ts`):
- `Room`, `Event`, `Activity`, `User` core entities
- `EventTimeWindow` discriminated union (season/month/weekRange/freeText)
- Helper functions: `formatTimeWindow()`, `formatBudget()`
- Label/color mappings for categories, regions, seasons, phases, risk levels

**Validation** (`src/schemas/index.ts`):
- Zod schemas for all form inputs
- `CreateEventSchema`, `DateOptionSchema`, etc.
- Export inferred TypeScript types: `CreateEventInput = z.infer<typeof CreateEventSchema>`

### Routing & Auth

**React Router** (`src/App.tsx`):
- Public route: `/login`
- Protected routes wrapped in `<ProtectedRoute>` (RequireAuth + AppLayout)
- Route structure:
  - `/` - Home
  - `/rooms` - Room list
  - `/rooms/:roomId` - Room detail
  - `/rooms/:roomId/events/new` - Create event
  - `/rooms/:roomId/events/:eventId` - Event detail
  - `/activities` - Activity catalog
  - `/activities/:activityId` - Activity detail
  - `/team`, `/profile`, `/map`, `/settings`

**Auth Guards**:
- `RequireAuth.tsx`: Redirects to /login if not authenticated
- `RequireRole.tsx`: Restricts actions based on room role

### UI Components

**Layout** (`src/components/layout/`):
- `AppLayout`: Header + Sidebar + main content area (fixed sidebar, 64 width)
- Dark mode enforced globally via `useDarkMode()` hook in App.tsx

**Feature Components**:
- `src/components/events/`: Event cards, voting UI, date scheduling, phase headers
- `src/components/activities/`: Activity cards, filters
- `src/components/shared/`: Reusable dialogs (CreateRoom, EditProfile, ShareRoom)

**UI Library** (`src/components/ui/`):
- shadcn/ui components (Radix primitives + Tailwind)
- Custom theme via `tailwind.config.ts`
- Form handling with react-hook-form + Zod resolver

### Path Aliases

- `@/*` resolves to `src/*` (configured in `vite.config.ts` and `tsconfig.json`)

## Activity Data

The app contains 30 mock activities (`mockActivities` in `apiClient.ts`) for team building in Upper Austria (OOE):
- Categories: action, food, relax, party, culture, outdoor, creative
- Rich metadata: price, duration, group size, intensity scales (1-5), risk level, seasonal availability
- Austrian regions: OOE, TIR, SBG, STMK, KTN, VBG, NOE, WIE, BGL

Activities include escape rooms, lasertag, karting, bowling, restaurants, breweries, etc.

## Key Conventions

**Language**:
- UI strings: German
- Code/comments: English
- User-facing errors/validation: German

**Imports**:
- Use `@/` alias for all src imports
- Group imports: React → third-party → internal (types, components, utils)

**Component Patterns**:
- Functional components with TypeScript
- Props interfaces named `{Component}Props`
- Use `children: React.ReactNode` for component composition

**Styling**:
- Tailwind utility classes
- Custom colors defined in theme (primary, destructive, warning, success)
- Dark mode always enabled
- Animations: `animate-fade-in`, `animate-slide-up`

**Forms**:
- react-hook-form with Zod resolver
- shadcn/ui Form components
- Always validate with Zod schemas from `src/schemas/`

**Date Handling**:
- Use `date-fns` for date operations
- ISO strings for API/storage
- Display format: German locale

## Testing Current Features

Since there's no real backend:
- Login works with any credentials
- Data persists only during session
- Pre-populated mock data includes 4 rooms, 30 activities, 2 events

## Common Gotchas

- Room roles are manually set in `authStore` initialization (room-1: admin, room-4: owner, etc.)
- Phase transitions require admin/owner role - check `canManageEvent()` before showing UI
- Event voting deadline affects auto-advancement logic
- `EventTimeWindow` is a discriminated union - always check `.type` field
- All API calls are async with artificial delays - use TanStack Query for loading states
