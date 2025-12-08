# EventHorizon Project Context

## Project Overview
EventHorizon is a social event planning application built with React, Vite, and TypeScript. It facilitates organizing events through distinct phases: proposal, voting, scheduling, and information. The app features a room-based architecture where users can collaborate, propose activities, vote, and schedule events.

## Tech Stack
*   **Frontend Framework:** React 18 (with Hooks)
*   **Build Tool:** Vite
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS, Shadcn UI (Radix UI primitives), `lucide-react` for icons.
*   **State Management:** 
    *   **Global Client State:** Zustand (persisted auth state).
    *   **Server State:** TanStack Query (React Query).
*   **Routing:** React Router DOM (v6+).
*   **Maps:** React Leaflet.
*   **Validation:** Zod + React Hook Form.

## Development Workflow

### Key Scripts
*   **Start Dev Server:** `npm run dev` (Runs on localhost, typically port 8080 or 5173)
*   **Build:** `npm run build`
*   **Lint:** `npm run lint`
*   **Preview Build:** `npm run preview`

### Architecture & Structure
*   `src/App.tsx`: Main application entry point, routing configuration, and global providers (QueryClient, Toaster).
*   `src/components/`:
    *   `ui/`: Reusable, atomic UI components (Shadcn UI). **Do not modify these unless necessary for global styling fixes.**
    *   `layout/`: Structural components (AppLayout, Header, Sidebar).
    *   `auth/`, `events/`, `activities/`, `shared/`: Feature-specific domain components.
*   `src/pages/`: Top-level page components corresponding to routes.
*   `src/stores/`: Global state management (e.g., `authStore.ts` using Zustand).
*   `src/services/`: API client and data fetching logic (`apiClient.ts`).
*   `src/types/`: Domain models and type definitions (`domain.ts`).
*   `src/lib/`: Utility functions (`utils.ts` primarily for `cn` class merging).

## Coding Conventions

### Styling
*   Use **Tailwind CSS** utility classes for styling.
*   Use the `cn()` utility (from `@/lib/utils`) to merge class names conditionally.
*   Adhere to the Shadcn UI design system.

### State Management
*   Use **Zustand** for global client-side state (authentication, user preferences).
*   Use **TanStack Query** for async data fetching and caching.
*   Avoid prop drilling; prefer composition or context where appropriate (though Zustand is preferred for global state).

### Typing
*   Strict TypeScript usage.
*   Define domain interfaces in `src/types/domain.ts` (e.g., `Event`, `Room`, `Activity`, `User`).
*   Use Zod schemas (`src/schemas/`) for form validation.

### Component Structure
*   **Functional Components:** Use `const Component = () => {}` syntax.
*   **Imports:** Use absolute path aliases (`@/`) for imports within `src`.
    *   Example: `import { Button } from "@/components/ui/button";`

### Event Logic
*   **Phases:** Events transition through specific phases: `proposal` -> `voting` -> `scheduling` -> `info`.
*   **Roles:** Users have roles within rooms (`owner`, `admin`, `member`) which dictate permissions.

## Key Domain Concepts
*   **Room:** A group of users (like a workspace or chat group).
*   **Event:** A specific occurrence being planned within a room.
*   **Activity:** A potential option for an event (e.g., "Go-Karting", "Dinner").
*   **Voting:** Users vote on activities (`for`, `against`, `abstain`).
*   **Date Option:** Potential dates for the event, voted on during the scheduling phase.
