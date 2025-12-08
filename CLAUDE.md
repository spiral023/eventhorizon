# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"eventhorizon" is a React/TypeScript web application for corporate team event planning. The app facilitates a multi-phase workflow where teams can propose activities, vote on them, schedule dates, and manage event logistics. Built with Vite, React Router, shadcn/ui components, TanStack Query, Zustand for state management, and Zod for validation.

The project was initially scaffolded with Lovable (lovable.dev) and is maintained in German, with UI text in German but code/comments in English.

## Development Commands

```bash
# Install dependencies
npm i

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Run ESLint
npm run lint

# Run tests with Vitest
npm test

# Preview production build
npm run preview
```

**Note**: All commands should be run from the `frontend/` directory.

## Core Architecture

### Event Phase State Machine

Events follow a strict 4-phase lifecycle managed by `frontend/src/utils/phaseStateMachine.ts`:

1. **proposal** → Organizers propose activities
2. **voting** → Team members vote on proposed activities
3. **scheduling** → Date options are proposed and responses collected
4. **info** → Final event details are displayed

Phase transitions are unidirectional and managed by admins/owners only. The state machine enforces:

- Valid transitions via `canTransition(from, to)`
- Role-based permissions via `canManageEvent(role)`
- Deadline-based auto-advancement logic via `shouldAutoAdvance()`

### State Management

**Zustand Store** (`frontend/src/stores/authStore.ts`):

- User authentication state and room roles
- Persisted to localStorage (only `isAuthenticated` and `roomRoles`)
- Mock authentication system (currently always succeeds)
- Room-specific role mapping: `roomRoles: Record<string, RoomRole>`
- Roles: `owner`, `admin`, `member`
- Default roles configured: room-1 (admin), room-2/3 (member), room-4 (owner)

**TanStack Query**: Configured via `QueryClientProvider` in `App.tsx`, available for server state caching but currently underutilized (pages use direct API calls with local state)

### Data Layer

**API Client** (`frontend/src/services/apiClient.ts`):

- Dual-mode: mock mode (in-memory data) or real backend mode
- Controlled via `VITE_USE_MOCKS` environment variable
- All API functions return `Promise<ApiResult<T>>` where `ApiResult = { data: T, error?: ApiError }`
- Mock mode includes simulated network delays (50-800ms)
- Real mode proxies to backend at `http://localhost:8000/api/v1`
- Contains 30 mock activities for team building in Upper Austria
- No persistence in mock mode - data resets on page reload

**Domain Types** (`frontend/src/types/domain.ts`):

- All types derived from Zod schemas using `z.infer<typeof Schema>`
- Core entities: `Room`, `Event`, `Activity`, `User`
- `EventTimeWindow`: discriminated union (season/month/weekRange/freeText)
- Helper functions: `formatTimeWindow()`, `formatBudget()`
- Label/color mappings for categories, regions, seasons, phases, risk levels

**Validation** (`frontend/src/schemas/index.ts`):

- Zod schemas for all form inputs and domain entities
- German error messages
- Used with react-hook-form via `@hookform/resolvers/zod`

### Routing & Auth

**Structure** (`frontend/src/App.tsx`):

- Entry point: `frontend/src/main.tsx` → `App` component
- Dark mode enforced globally via `useDarkMode()` hook
- All routes wrapped in `PageTransition` for Framer Motion animations

**Routes**:

- `/login` - Public login page
- `/` - Home page (protected)
- `/rooms` - Room list (protected)
- `/rooms/:roomId` - Room detail (protected)
- `/rooms/:roomId/events/new` - Create event (protected)
- `/rooms/:roomId/events/:eventId` - Event detail (protected)
- `/activities` - Activity catalog (protected)
- `/activities/:activityId` - Activity detail (protected)
- `/team` - Team analysis (protected)
- `/profile` - User profile (protected)
- `/map` - Leaflet map view (protected)
- `/settings` - Settings (protected)

**Auth Guards**:

- `RequireAuth` component redirects unauthenticated users to `/login`
- `RequireRole` component restricts UI based on room role
- `ProtectedRoute` wrapper combines `RequireAuth` + `AppLayout`

### UI Components

**Layout** (`frontend/src/components/layout/`):

- `AppLayout`: Header + fixed Sidebar (64 units wide) + main content area
- Dark mode theme with gradient background
- Sidebar includes static nav and dynamic room/event tree

**Feature Components**:

- `frontend/src/components/events/`: Event cards, voting UI, date scheduling, phase headers
- `frontend/src/components/activities/`: Activity cards, filter panels
- `frontend/src/components/shared/`: Reusable dialogs (CreateRoom, EditProfile, ShareRoom)

**UI Library** (`frontend/src/components/ui/`):

- shadcn/ui components (Radix primitives + Tailwind)
- Copy-paste approach (not npm package)
- Custom theme via `frontend/tailwind.config.ts`

### Path Aliases

- `@/*` resolves to `frontend/src/*` (configured in `vite.config.ts` and `tsconfig.json`)
- Always use `@/` imports for internal modules

## Activity Data

The app contains 30 mock activities in `apiClient.ts` for team building in Upper Austria:

- Categories: action, food, relax, party, culture, outdoor, creative
- Rich metadata: price, duration, group size, intensity scales (1-5), risk level, seasonal availability
- Austrian regions: OOE, TIR, SBG, STMK, KTN, VBG, NOE, WIE, BGL

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
- Use `children: React.ReactNode` for composition

**Styling**:

- Tailwind utility classes
- Custom colors defined in theme (primary, destructive, warning, success)
- Dark mode always enabled
- Animations: `animate-fade-in`, `animate-slide-up`, etc.

**Forms**:

- react-hook-form with Zod resolver
- shadcn/ui Form components
- Always validate with Zod schemas from `frontend/src/schemas/`

**Date Handling**:

- Use `date-fns` for date operations
- ISO strings for API/storage
- Display format: German locale

## Project Structure

```
eventhorizon/
├── frontend/               # React application
│   ├── src/
│   │   ├── main.tsx       # Entry point
│   │   ├── App.tsx        # Root with routing & providers
│   │   ├── components/    # UI components
│   │   │   ├── activities/
│   │   │   ├── auth/      # Auth guards (RequireAuth, RequireRole)
│   │   │   ├── events/    # Event workflow components
│   │   │   ├── layout/    # AppLayout, Header, Sidebar
│   │   │   ├── shared/    # Reusable components
│   │   │   └── ui/        # shadcn/ui primitives
│   │   ├── pages/         # Route-level pages
│   │   ├── stores/        # Zustand stores
│   │   ├── services/      # API client
│   │   ├── types/         # TypeScript definitions
│   │   ├── schemas/       # Zod validation schemas
│   │   ├── utils/         # Business logic utilities
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility libraries (cn function)
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
└── backend/               # Backend services (separate)
```

## Common Gotchas

- Room roles are manually set in `authStore` initialization (room-1: admin, room-4: owner, etc.)
- Phase transitions require admin/owner role - check `canManageEvent()` before showing UI
- Event voting deadline affects auto-advancement logic via `shouldAutoAdvance()`
- `EventTimeWindow` is a discriminated union - always check `.type` field
- All API calls are async with artificial delays in mock mode
- TypeScript strict mode is disabled (implicit any, unused vars allowed)
- TanStack Query is configured but pages use manual `useState` + `useEffect` patterns
- No persistence in mock mode - all data resets on page reload

## Critical Files Reference

**Entry & Config**:

- `frontend/src/main.tsx` - React root + service worker
- `frontend/src/App.tsx` - Routing + providers + dark mode
- `frontend/vite.config.ts` - Build config + API proxy
- `frontend/tailwind.config.ts` - Theme & animations
- `frontend/tsconfig.json` - TypeScript config + path aliases

**State & Data**:

- `frontend/src/stores/authStore.ts` - Auth state + room roles
- `frontend/src/services/apiClient.ts` - API client (mock + real)
- `frontend/src/types/domain.ts` - Business types + UI helpers
- `frontend/src/schemas/index.ts` - Zod validation

**Business Logic**:

- `frontend/src/utils/phaseStateMachine.ts` - Event lifecycle FSM

**Layout & Auth**:

- `frontend/src/components/layout/AppLayout.tsx` - Main layout
- `frontend/src/components/auth/RequireAuth.tsx` - Auth guard
- `frontend/src/components/auth/RequireRole.tsx` - RBAC guard

**Info**: When needed login with username philipp.asanger@gmail.com and password athlon2006
