# Agent Notes

This project is an exam schedule manager with sign in/sign up, Excel import, course selection, and a persistent per-user exam dashboard.

## Project Shape

- Root scripts coordinate the app.
- `client/` is a React + Vite frontend.
- `server/` is a Node.js + Express API with Supabase/PostgreSQL persistence through `pg`.
- The one-server production-style local flow is `npm start`, which builds the frontend and serves it from the Express server on `http://localhost:3001`.
- The development flow is `npm run dev`, which starts Vite on `http://localhost:5173` and the API on `http://localhost:3001`.

## Important Commands

On this Windows machine, prefer `npm.cmd` from PowerShell if plain `npm` fails because of execution policy.

Set `DATABASE_URL` and `JWT_SECRET` before starting the backend:

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
$env:JWT_SECRET="replace-with-a-long-random-secret"
```

```powershell
npm.cmd run install:all
npm.cmd run dev
npm.cmd start
npm.cmd run build --prefix client
npm.cmd run start --prefix server
```

## Maintenance Rules

- Keep the current auth/user flow stable. Do not rewrite authentication or frontend pages unless the user explicitly asks.
- Persistent data lives in PostgreSQL via `DATABASE_URL`; `server/uploads/` is temporary parser storage only.
- Keep PostgreSQL schema changes conservative. Existing user data matters.
- Keep API response DTOs in camelCase for the frontend, even though database columns use snake_case.
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
- Sign up/sign in works.
- Upload, search, add selection, remove selection, and clear selection still work if the touched code affects those flows.

## Documentation Map

- `.docs/architecture.md` explains the overall request flow and boundaries.
- `.docs/frontend.md` explains React state, API usage, and UI decisions.
- `.docs/backend-api.md` explains Express routes and server decisions.
- `.docs/data-parser.md` explains PostgreSQL tables and Excel parsing decisions.
- `.docs/online-deployment.md` explains Render + Supabase deployment.
- `.docs/runbook.md` lists common local issues and fixes.
