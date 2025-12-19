# Revenue Path Planner — Requirements

## Tech Stack
- Single-page application using React with TypeScript in strict mode.
- Build tooling: Vite (or similar) for fast dev server and production builds.
- Styling: CSS modules or scoped CSS with an editorial, minimalist look; design tokens for spacing and color.
- Charting/visualization: SVG + D3 (or D3-like) for custom decision-tree layout and transitions.

## Style & Formatting
- Enforce ESLint and Prettier with TypeScript-aware rules; no unused variables; prefer const; explicit return types for exported functions.
- Functional React components and hooks; prefer composition over inheritance.
- Avoid try/catch around imports (per global guidance); keep calculations pure and testable.

## Naming Conventions
- Use domain terms from the spec: `Opportunity`, `pWin`, `tcv`, `BAPStage`, `revenueTarget`.
- Components named as nouns describing UI surfaces (e.g., `ControlStrip`, `Scoreboard`, `PathTree`, `ScenarioCards`).
- Files use kebab-case for assets/styles and PascalCase for React components; TypeScript modules may use camelCase where appropriate.

## Code Organization
- Folder structure: `src/data` (repositories, adapters), `src/domain` (calculations, path logic), `src/components` (UI), `src/state` (global store/context), `src/styles` (shared styles), `tests` (unit/component tests).
- Component organization: colocate component-specific styles and tests next to components when practical.
- Keep data access isolated behind repository interfaces to simplify adapter swaps.

## State Management
- Lightweight global state via React Context or Zustand to track opportunities, scenario selections, revenue target, and URL state.
- Derive computed values (totals, percentages, path enumerations) via pure domain services to keep state minimal.
- Sync shareable scenario selections to URL query parameters.

## Documentation Standards
- README should cover setup, CSV data placement, scripts, and coding conventions.
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
- **Props/Emits:** Prefer explicit typed props; lift state up only as needed; pass callbacks for toggles.
- **Data Fetching:** Centralized in data repository layer; CSV is read-only and loaded from `/public/data`.
- **Form Handling:** Simple controlled inputs for toggles; validation kept minimal and client-side.
- **API & Error Handling:** Surface read-only errors via non-blocking banners/toasts; log details to console in development.

## Performance
- Aim for recalculation cycles under 100ms; memoize derived data and avoid unnecessary re-renders.
- Use stable node keys to preserve D3 transitions and reduce reflow cost.

## Accessibility
- Ensure keyboard navigation for controls and toggles; provide aria-labels for interactive elements.
- Maintain sufficient color contrast and non-reliance on color alone for meaning.

## Browser Support
- Target modern evergreen desktop and tablet browsers (latest Chrome, Edge, Safari, Firefox); mobile is out of scope for v1.

## Data Requirements
- v1 data source is CSV only, placed in `/public/data`.
- Data is read-only and never mutated by user interactions.
- Normalize PWIN to 0–1 internally; closed opportunities auto-resolve to win/loss.

## Visualization Requirements
- Render a binary decision tree (not a treemap) with smooth cubic Bézier ribbons.
- Encode outcome by color (win = blue, loss = red), probability mass by thickness, PWIN by opacity.
- Order rows by Project Start Date; add faint horizontal gridlines per row.
- Terminal leaves render as small dots, with subtle emphasis for success.

## Interaction Requirements
- Hover highlights full path to the root and fades unrelated paths; thin paths remain hoverable via Voronoi or equivalent hit-testing.
- Click selects a path visually only.
- Double-click locks the first unresolved opportunity on that path and triggers animated reflow.
- Modifier key slows transitions for demo mode.

## UI Surface Requirements
- Control Strip: one compact outcome toggle per opportunity; closed items auto-lock; Reset appears only after a selection.
- Scoreboard: counts and percent of paths that hit/miss target, updated on every interaction.
- Main Visualization: path tree ordered by start date with narrative row labels.
- Scenario Cards: curated presets with one-click application and mini previews.

## Non-Goals
- No forecasting claims, optimization, or ranking.
- No server-side persistence or data mutation.
