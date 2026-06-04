# Architecture

## Goal

The app helps a student sign in, import a full exam schedule from `.xlsx`, find their own courses, save selected exams per user, and view upcoming/completed exams with countdown information.

The design priority is reliability for local use, not multi-user scale.

## Runtime Modes

Development:

- Root command: `npm run dev`
- Frontend: Vite dev server at `http://localhost:5173`
- Backend: Express API at `http://localhost:3001`
- `client/src/services/api.js` uses `http://localhost:3001/api` when the browser port is `5173`.

Production-style local run:

- Root command: `npm start`
- The root script builds `client/dist`.
- Express serves static files from `client/dist`.
- Browser opens `http://localhost:3001`.
- API base becomes `/api`.

## Main Data Flow

1. User signs up or signs in.
2. User uploads an `.xlsx` file from the Excel Import panel.
3. `POST /api/schedules/upload` temporarily stores the file, parses the first worksheet, and removes the temporary file.
4. Parsed upload metadata is written to `schedule_uploads` for the signed-in user.
5. Parsed rows are written to `schedule_rows` for the signed-in user.
6. User searches rows with `GET /api/schedules/rows`.
7. User adds selected exams with `POST /api/selections`.
8. Dashboard reads selected exams from `GET /api/selections`.
9. Frontend calculates upcoming/completed status from `examDateTime`.

## Key Boundaries

- Excel parsing belongs in `server/src/services/excelParser.js`.
- PostgreSQL schema setup belongs in `server/src/db/database.js`.
- API route behavior belongs in `server/src/routes`.
- Database-to-frontend DTO conversion belongs in `server/src/utils/rows.js`.
- Frontend API calls belong in `client/src/services/api.js`.
- Dashboard date/status calculations belong in `client/src/utils/examStatus.js`.
- Authentication helpers belong in `server/src/services/auth.js`.
- Auth route protection belongs in `server/src/middleware/auth.js`.

## Design Decisions

- Supabase PostgreSQL is used for deployable persistence.
- Schedules and selections are scoped by `user_id`; online hosting must preserve that boundary.
- The app keeps only one active uploaded schedule. Older uploads are marked inactive during replacement, and active rows are replaced.
- Selected exams are matched to replacement schedules by best-effort course/class/group/room/session fields, so user selections can survive re-upload when possible.
- Duplicate course codes are expected and displayed as separate rows.
- Parser warnings are stored with each row to support future UI improvements.
