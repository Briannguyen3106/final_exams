# Backend API

## Stack

- Express 4
- `better-sqlite3`
- `multer` for `.xlsx` uploads
- `exceljs` for parsing
- `helmet`, `cors`, and `morgan`

## Server Startup

- `server/src/server.js` initializes SQLite and starts the Express app.
- Default port is `3001`.
- `server/src/app.js` wires middleware, API routes, static frontend serving, and error handling.

Static frontend serving:

- Express serves `client/dist` when it exists.
- The root `npm start` builds the client before starting the server.

## Routes

Health:

- `GET /api/health`
- Returns `{ ok: true }`.

Schedules:

- `GET /api/schedules/current`
- Returns active upload metadata and up to 50 rows.

- `GET /api/schedules/rows?query=...`
- Searches active schedule rows by course code, course name, or class code.
- Empty query returns up to 100 rows.

- `POST /api/schedules/upload`
- Accepts a single `.xlsx` file.
- Stores the upload in `server/uploads`.
- Parses and replaces the active schedule.

- `POST /api/schedules/reparse`
- Reuses the stored active file.
- Accepts manual `headerRowIndex` and `columnMapping`.

- `DELETE /api/schedules/current`
- Deletes active schedule rows, selected exams, upload records, and stored uploaded files.

Selections:

- `GET /api/selections`
- Returns selected exams joined to schedule row data.

- `POST /api/selections`
- Body: `{ scheduleRowId }`.
- Inserts a selected exam. Duplicate selected row IDs are ignored by SQLite uniqueness.

- `DELETE /api/selections/:id`
- Removes one selected exam by selection ID.

- `DELETE /api/selections`
- Clears all selected exams.

## Error Handling

Route handlers call `next(error)` for expected failures.

Errors return JSON:

```json
{ "error": "message" }
```

Use `server/src/utils/httpError.js` for status-specific errors.

## Important Decisions

- Keep route responses as DTOs with camelCase field names.
- Keep file upload validation strict to `.xlsx`.
- Do not parse all worksheets unless requested. Current behavior uses the first worksheet only.
- Preserve the `replaceActiveSchedule` selection-rematching logic when modifying imports.
