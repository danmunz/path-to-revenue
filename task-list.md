# Revenue Path Planner — Task List

## Phase 1: Project Setup
- Initialize React + TypeScript SPA scaffold (e.g., Vite) with strict TypeScript config.
- Configure linting/formatting (ESLint, Prettier) and add basic scripts.
- Establish base folder structure: `src/data`, `src/domain`, `src/components`, `src/styles`, `src/state`, `tests`.
- Document coding conventions and development setup in README.

## Phase 2: Data Layer
- Define domain types (`Project`, `QuarterlyRevenue`, `DataRepository`, `DataSourceConfig`).
- Implement Google Sheets repository: sheet column mapping, refresh interval, manual refresh, read-only flag.
- Implement configuration loader for sheet ID/range/auth and refresh interval.
- Add unit tests for data parsing/mapping and refresh behavior (with mocked Sheets responses).
- Status: Google Sheets repository and env-driven config loader added (default daily refresh); tests and manual refresh wiring are still pending.

## Phase 3: Domain Services
- Build scenario calculator: derive default statuses for closed opportunities; compute totals vs. revenue target; aggregate quarterly rollups.
- Build path explorer: enumerate combinations meeting/exceeding target with filters (pWin thresholds, BAP stage, lead, priority).
- Build URL serializer: encode/decode scenario selections into query parameters for shareable scenarios.
- Unit-test calculators, filters, and serialization.

## Phase 4: UI Components
- Implement layout shell with responsive desktop/tablet support.
- Create `PathTree` visualization (size = TCV, opacity = pWin) ordered by start date.
- Add control panels: filters, opportunity list with toggles, scenario summary, quarterly revenue chart.
- Add manual refresh control and display data timestamp.
- Component tests for critical UI interactions (filters, toggles, refresh).

## Phase 5: State and Integration
- Set up global state (React Context/Zustand) for opportunities, scenario selections, filters, refresh status, and revenue target.
- Wire data repository to state hydration; apply domain services for calculations and path generation.
- Sync URL query parameters with scenario selections for sharing.

## Phase 6: Quality, Performance, and Accessibility
- Optimize recalculation performance (<100ms target) and avoid unnecessary renders.
- Verify accessibility basics (keyboard navigation, aria labels, color/contrast checks).
- Validate responsive behavior and performance on target browsers.
- Finalize README with setup, configuration, refresh behavior, and known open questions.
