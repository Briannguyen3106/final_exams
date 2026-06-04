# Exam Schedule Manager

A web app for signing in, importing an Excel exam schedule, selecting your own courses, and keeping a persistent personalized exam dashboard.

## Stack

- React + Vite frontend
- Node.js + Express backend
- Supabase PostgreSQL persistence through `pg`
- `exceljs` for Excel parsing
- Built-in email/password auth with signed tokens

## Setup

Set `DATABASE_URL` and `JWT_SECRET` before starting the backend. Use a Supabase Postgres connection string for deployment, or a local Postgres connection string for development.

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
$env:JWT_SECRET="replace-with-a-long-random-secret"
```

```powershell
npm install
npm run install:all
npm run dev
```

Open:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

For the simplest local run with one server:

```powershell
npm start
```

Open http://localhost:3001.

After the frontend has already been built, you can relaunch only the server with:

```powershell
npm run start --prefix server
```

Persistent data is stored in PostgreSQL. Uploaded Excel files are written to `server/uploads` only temporarily while parsing; normalized schedule rows and workbook bytes for manual reparse are stored in PostgreSQL.

## Major Files

- `server/src/server.js` starts the local API server.
- `server/src/app.js` wires middleware and API routes.
- `server/src/db/database.js` opens the Postgres pool and creates tables.
- `server/src/routes/auth.js` handles sign up, sign in, and session lookup.
- `server/src/middleware/auth.js` protects user-owned API routes.
- `server/src/services/excelParser.js` detects headers, session mappings, and normalizes schedule rows.
- `server/src/routes/schedules.js` handles upload, reparse, search, and schedule replacement.
- `server/src/routes/selections.js` stores and returns selected exams.
- `client/src/App.jsx` owns the main UI workflow.
- `client/src/components` contains the upload, mapping, search, and dashboard UI.
- `client/src/services/api.js` contains API calls.
- `client/src/utils/examStatus.js` calculates status and countdown on load/refresh.

## Notes

- The app parses the first worksheet only.
- If the second row contains session mappings such as `Kip 1 = 07:00`, those are detected automatically. Otherwise defaults are used.
- Header rows are auto-detected from known Vietnamese schedule columns. You can override the header row and column mapping after upload.
- Selected exams persist in PostgreSQL until manually removed.
- For free online deployment, use Render for the Express app and Supabase for Postgres. See `.docs/online-deployment.md`.
