# Revenue Path Planner

A single-page, read-only visualization for exploring revenue target scenarios as a NYT-style “Paths-to-Target” decision tree. This project follows the guidelines in `docs/spec.md`, `docs/visual_spec.md`, `docs/requirements.md`, and `docs/task-list.md`.

## Getting started

> Note: package installation from the public registry may be restricted in this environment. If installs fail, use `npm install --ignore-scripts` to generate a lockfile and vendor dependencies separately.

1. Ensure Node.js 18+ is available.
2. (Optional) Copy `.env.example` to `.env.local` and set the CSV path or revenue target override.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
5. Build for production:
   ```bash
   npm run build
   ```

### Local CSV configuration

The app reads opportunities from a local CSV at `/public/data`. By default it looks for `/data/opportunities.csv`. To override the path, set:

- `VITE_LOCAL_CSV_PATH` — example: `/data/opportunities.csv`
- `VITE_REVENUE_TARGET` — optional override for the default $30M target

If no CSV is found or the request fails, the UI falls back to the bundled mock repository for local exploration.

**Expected CSV header (exact order):**
```csv
Account Name,Opportunity Name,Ad Hoc TCV,PWIN,Project Start Date,Top Priority,Portfolio Priority,2026 Factored Revenue,Q1 2026 Revenue,Q2 2026 Revenue,Q3 2026 Revenue,Q4 2026 Revenue,BD/Capture Lead,BAP Stage,Closed,Period of Performance (months)
```

Populate the remaining rows with your opportunity data, using the same column order as above.

## Project structure
- `src/components`: UI surfaces (control strip, scoreboard, path tree, scenario cards).
- `src/data`: CSV repository, mappers, and domain types.
- `src/domain`: Decision-tree logic, path counting, URL state helpers.
- `src/state`: Global state (Zustand store + repository wiring).
- `src/styles`: Global styles for the editorial layout.

## Coding conventions
- TypeScript strict mode; functional React components and hooks.
- Domain-first naming (`Opportunity`, `pWin`, `tcv`, `BAPStage`).
- Keep calculations pure and testable; avoid try/catch around imports.

## Roadmap
Progress is tracked in `docs/task-list.md`. The current prototype loads CSV data (or mock fallback), renders a binary decision tree, supports hover/click/double-click interactions, and encodes scenario state in the URL.
