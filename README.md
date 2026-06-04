# Local Exam Schedule Manager

A local-only web app for importing an Excel exam schedule, selecting your own courses, and keeping a persistent personalized exam dashboard.

## Stack

- React + Vite frontend
- Node.js + Express backend
- SQLite local database
- `xlsx` for Excel parsing

## Setup

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

The SQLite database is stored at `server/data/exam-schedule.sqlite`. Uploaded Excel files are stored in `server/uploads`.

## Major Files

- `server/src/server.js` starts the local API server.
- `server/src/app.js` wires middleware and API routes.
- `server/src/db/database.js` opens SQLite and creates tables.
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
- Selected exams persist in SQLite until manually removed.
