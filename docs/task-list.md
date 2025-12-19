# Revenue Path Planner — Task List

## Phase 1: Project Setup
- Initialize React + TypeScript SPA scaffold (e.g., Vite) with strict TypeScript config.
- Configure linting/formatting (ESLint, Prettier) and add basic scripts.
- Establish base folder structure: `src/data`, `src/domain`, `src/components`, `src/styles`, `src/state`, `tests`.
- Document coding conventions and development setup in README.

## Phase 2: Data Layer
- Define domain types (`Opportunity`, `ResolvedOutcome`, `DataRepository`, `ScenarioSelection`).
- Implement CSV repository: read-only loader from `/public/data`, column mapping, normalization rules.
- Implement data normalization utilities (PWIN 0–1, closed-win/loss detection, sort by Project Start Date).
- Add unit tests for data parsing/mapping and normalization.

## Phase 3: Domain Services
- Build scenario calculator: derive default statuses for closed opportunities; compute totals vs. revenue target.
- Build decision-tree generator with early termination when target is met.
- Implement path counting with implicit leaves (`2^(remainingDepth)`) for success/failure totals.
- Build URL serializer: encode/decode scenario selections into query parameters for shareable scenarios.
- Unit-test calculators, tree generation, path counting, and serialization.

## Phase 4: UI Components
- Implement layout shell with desktop/tablet support and editorial typography.
- Build Control Strip with per-opportunity win/loss toggles and contextual Reset.
- Build Scoreboard showing counts/percent of paths reaching target.
- Create `PathTree` visualization with smooth ribbon paths (color = outcome, thickness = probability, opacity = PWIN).
- Add row labels with conditional sentences and faint horizontal gridlines.
- Add Scenario Cards with presets and miniature previews.
- Component tests for critical UI interactions (controls, hover, double-click).

## Phase 5: State and Integration
- Set up global state (React Context/Zustand) for opportunities, scenario selections, and revenue target.
- Wire data repository to state hydration; apply domain services for calculations and tree generation.
- Sync URL query parameters with scenario selections for sharing.
- Implement path hover hit-testing (Voronoi or equivalent) and selection behavior.

## Phase 6: Quality, Performance, and Accessibility
- Optimize recalculation performance (<100ms target) and avoid unnecessary renders.
- Preserve stable node keys to support smooth transitions.
- Verify accessibility basics (keyboard navigation, aria labels, color/contrast checks).
- Validate behavior on target browsers.
- Finalize README with setup, CSV placement, and known open questions.
