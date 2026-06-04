# Agent Notes

This project is a local-only exam schedule manager. Treat it as a personal utility for importing an Excel schedule, selecting courses, and keeping a persistent exam dashboard.

## Project Shape

- Root scripts coordinate the app.
- `client/` is a React + Vite frontend.
- `server/` is a Node.js + Express API with SQLite persistence.
- The one-server production-style local flow is `npm start`, which builds the frontend and serves it from the Express server on `http://localhost:3001`.
- The development flow is `npm run dev`, which starts Vite on `http://localhost:5173` and the API on `http://localhost:3001`.

## Important Commands

On this Windows machine, prefer `npm.cmd` from PowerShell if plain `npm` fails because of execution policy.

```powershell
npm.cmd run install:all
npm.cmd run dev
npm.cmd start
npm.cmd run build --prefix client
npm.cmd run start --prefix server
```

## Maintenance Rules

- Keep the app local-first. Do not add cloud services, accounts, auth, or external storage unless the user explicitly asks.
- Preserve uploaded Excel files in `server/uploads/` and persistent data in `server/data/exam-schedule.sqlite`.
- Keep SQLite schema migrations conservative. Existing local user data matters.
- Keep API response DTOs in camelCase for the frontend, even though SQLite columns use snake_case.
- The parser intentionally accepts imperfect Excel files and returns warnings instead of failing when possible.
- Search and selection behavior should support duplicate course codes. Do not assume course code is unique.
- Do not remove the manual reparse/mapping workflow; it is the escape hatch when auto-detection is wrong.
- When changing frontend JSX/build behavior, keep `client/vite.config.js`. It enables `@vitejs/plugin-react`; without it, production builds can render blank because JSX compiles to `React.createElement` in files that do not import `React`.

## Verification Checklist

After changes, run the most relevant checks:

```powershell
npm.cmd run build --prefix client
npm.cmd start
```

Then verify:

- `http://localhost:3001/api/health` returns `{ "ok": true }`.
- `http://localhost:3001` renders the UI, not a blank page.
- Upload, search, add selection, remove selection, and clear selection still work if the touched code affects those flows.

## Documentation Map

- `.docs/architecture.md` explains the overall request flow and boundaries.
- `.docs/frontend.md` explains React state, API usage, and UI decisions.
- `.docs/backend-api.md` explains Express routes and server decisions.
- `.docs/data-parser.md` explains SQLite tables and Excel parsing decisions.
- `.docs/runbook.md` lists common local issues and fixes.
