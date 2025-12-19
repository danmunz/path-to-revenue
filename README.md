# Revenue Path Planner

A single-page, read-only visualization to explore paths to a revenue target using Salesforce pipeline exports via Google Sheets. This project follows the guidelines in `spec.md`, `requirements.md`, and `task-list.md`.

## Getting started

> Note: package installation from the public registry may be restricted in this environment. If installs fail, use `npm install --ignore-scripts` to generate a lockfile and vendor dependencies separately.

1. Ensure Node.js 18+ is available.
2. Copy `.env.example` to `.env.local` and set Google Sheets credentials (see below).
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

### Google Sheets configuration

The app reads opportunities from a Google Sheet (tab: `data`, range: `A1:P31`) via the Sheets API. Configure these environment variables (Vite expects the `VITE_` prefix):

- `VITE_GOOGLE_SHEETS_ID` — spreadsheet ID
- `VITE_GOOGLE_SHEETS_RANGE` — range (e.g., `data!A1:P31`)
- `VITE_GOOGLE_API_KEY` — API key with read access to the sheet
- `VITE_REFRESH_INTERVAL_MS` — optional; defaults to 24h
- `VITE_REVENUE_TARGET` — optional override of the default $10M target

If configuration is missing, the UI falls back to the bundled mock repository for local exploration. Keep API keys out of source control; store them in untracked `.env.local`.

## Project structure
- `src/components`: UI components (visualization shell, lists, controls).
- `src/data`: Domain types and repository contracts.
- `src/domain`: Calculation and path logic (placeholder for future phases).
- `src/state`: Global state (Zustand store + repository wiring).
- `src/styles`: Shared styles.

## Coding conventions
- TypeScript strict mode; functional React components and hooks.
- Domain-first naming (`Project`, `pWin`, `tcv`, `BAPStage`).
- Keep calculations pure and testable; avoid try/catch around imports.

## Roadmap
Progress is tracked in `task-list.md`. The current prototype loads mock opportunities, lets you toggle win/loss status, filter by pWin/BAP stage/priority, and shows suggested paths toward the target. Upcoming work includes real data adapters, deeper path visualization, URL sharing, and automated tests.
