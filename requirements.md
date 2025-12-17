# Revenue Path Planner — Requirements

## Tech Stack
- Single-page application using React with TypeScript in strict mode.
- Build tooling: Vite (or similar) for fast dev server and production builds.
- Styling: CSS modules or scoped CSS with a light, non-election theme; optional design tokens for spacing and color.
- Charting/visualization: lightweight library for DAG/tree rendering (e.g., d3-based) that supports custom sizing/opacity.

## Style & Formatting
- Enforce ESLint and Prettier with TypeScript-aware rules; no unused variables; prefer const; explicit return types for exported functions.
- Functional React components and hooks; prefer composition over inheritance.
- Avoid try/catch around imports (per global guidance); keep calculations pure and testable.

## Naming Conventions
- Use domain terms from the spec: `Opportunity`, `Project`, `pWin`, `tcv`, `BAPStage`, `revenueTarget`.
- Components named as nouns describing UI surfaces (e.g., `PathTree`, `OpportunityFilters`, `ScenarioSummary`).
- Files use kebab-case for assets/styles and PascalCase for React components; TypeScript modules may use camelCase where appropriate.

## Code Organization
- Folder structure: `src/data` (repositories, adapters), `src/domain` (calculations, path logic), `src/components` (UI), `src/state` (global store/context), `src/styles` (shared styles), `tests` (unit/component tests).
- Component organization: colocate component-specific styles and tests next to components when practical.
- Keep data access isolated behind repository interfaces to simplify adapter swaps.

## State Management
- Lightweight global state via React Context or Zustand to track opportunities, scenario selections, filters, revenue target, and refresh status.
- Derive computed values (totals, percentages, path enumerations) via pure domain services to keep state minimal.
- Sync shareable scenario selections to URL query parameters when feasible.

## Documentation Standards
- README should cover setup, configuration (sheet ID/range/auth), refresh behavior, scripts, and coding conventions.
- Inline code comments for non-obvious logic; docstrings for domain services and data mappers.
- Maintain changelog notes in PR descriptions; keep task-list.md updated as phases progress.

## Git Workflow
- Feature branches off main; frequent small commits with descriptive messages.
- Run lint/tests before committing when applicable.
- Use pull requests with clear summaries of scope and testing.

## Task Management
- Use `task-list.md` as the living checklist; update status as tasks complete.
- Keep alignment with spec.md and requirements in this document when adding scope.

## Testing
- Unit tests for domain calculations (scenario totals, path enumeration, filters, URL serialization).
- Unit tests for data adapters/mappers with mocked responses.
- Component tests for critical UI interactions (filters, toggles, refresh) using a React testing library.
- Linting and type-checking as part of CI.

## Component Architecture Patterns
- **Props/Emits:** Prefer explicit typed props; lift state up only as needed; pass callbacks for toggles/filters.
- **Data Fetching:** Centralized in data repository layer; UI triggers manual refresh via repository without exposing implementation details.
- **Form Handling:** Simple controlled inputs for filters and toggles; validation kept minimal and client-side.
- **API & Error Handling:** Surface read-only errors via non-blocking banners/toasts; log details to console in development.
- **Environment Variables:** Use Vite environment variables (`VITE_`) for sheet configuration and refresh interval; never commit secrets.

## Performance
- Aim for recalculation cycles under 100ms; memoize derived data and avoid unnecessary re-renders.
- Lazy-load heavy visualization or charting code if needed.

## Accessibility
- Ensure keyboard navigation for controls and toggles; provide aria-labels for interactive elements.
- Maintain sufficient color contrast and non-reliance on color alone for meaning.

## Browser Support
- Target modern evergreen desktop and tablet browsers (latest Chrome, Edge, Safari, Firefox); mobile is out of scope for v1.
