# Frontend

## Stack

- React 18
- Vite
- Plain CSS in `client/src/styles.css`
- API wrapper in `client/src/services/api.js`

`client/vite.config.js` must stay present. It enables `@vitejs/plugin-react`, which provides the correct JSX runtime for production builds.

## Entry Points

- `client/src/main.jsx` mounts React into `#root`.
- `client/src/App.jsx` owns the main workflow state.

## App State

`App.jsx` keeps these important state values:

- `user`: signed-in user metadata, or `null`.
- `authChecked`: whether the stored token has been checked.
- `currentUpload`: active schedule metadata, or `null`.
- `importResult`: parser result after upload/reparse.
- `searchQuery`: current course search text.
- `searchResults`: rows shown in Course Selection.
- `selectedExams`: rows selected for My Exams.
- `busy`: upload/reparse/replace loading state.
- `message` and `error`: user-facing notices.
- `now`: timestamp used to recalculate dashboard status.

Initial auth load calls:

- `api.getMe()` when a stored token exists

Signed-in data load calls:

- `api.getCurrentSchedule()`
- `api.getSelections()`

Search is debounced by 250ms and only runs after a schedule exists.

## Components

`ImportPanel.jsx`

- Handles file upload.
- Shows active schedule summary.
- Shows detected headers and manual mapping controls after upload/reparse.
- Sends `headerRowIndex` as zero-based to the backend.

`CourseSearch.jsx`

- Lists parsed schedule rows.
- Allows adding one row at a time.
- Uses row `id`, not course code, because duplicate course codes are valid.

`Dashboard.jsx`

- Splits selected exams into upcoming and completed.
- Shows nearest/upcoming visual states.
- Allows remove and clear all.

## API Base Decision

`client/src/services/api.js` chooses API base by browser port:

- On Vite dev port `5173`, use `http://localhost:3001/api`.
- On server-served port `3001`, use `/api`.

This keeps one frontend build usable in both local development and `npm start`.

## Auth Decision

The frontend stores the signed auth token in `localStorage` and sends it as an `Authorization: Bearer <token>` header through `client/src/services/api.js`.

When there is no valid user, the first screen is the sign in/sign up form. The upload/search/dashboard workflow is only rendered after auth succeeds.

## UI Style

The UI is intentionally utilitarian:

- Dense panels and tables.
- Minimal decoration.
- Clear upload/search/dashboard workflow.
- Horizontal table scroll for small screens.

Avoid turning this into a landing page. The first authenticated screen should remain the working app, not marketing content.
