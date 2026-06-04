# Runbook

## Normal Run

From the project root:

```powershell
npm.cmd start
```

Open:

```text
http://localhost:3001
```

## Development Run

```powershell
npm.cmd run dev
```

Open:

```text
http://localhost:5173
```

API:

```text
http://localhost:3001/api/health
```

## Windows npm Note

If PowerShell says `npm.ps1 cannot be loaded because running scripts is disabled`, use `npm.cmd` instead of `npm`.

Example:

```powershell
npm.cmd start
```

## Blank Page Checklist

1. Rebuild the client:

```powershell
npm.cmd run build --prefix client
```

2. Confirm `client/vite.config.js` exists and includes `@vitejs/plugin-react`.

3. Restart the server from the root:

```powershell
npm.cmd start
```

4. Check health:

```powershell
Invoke-RestMethod http://localhost:3001/api/health
```

5. If port `3001` is already in use, find the listener:

```powershell
netstat -ano | Select-String ':3001'
```

Then stop the stale process if it belongs to this project.

## Common Local Files

Generated local data:

- `server/data/exam-schedule.sqlite`
- `server/data/exam-schedule.sqlite-wal`
- `server/data/exam-schedule.sqlite-shm`
- `server/uploads/*`
- `client/dist/*`

These are local runtime/build artifacts. Do not edit SQLite files by hand.

## Quick Manual Test

After code changes affecting upload/search/dashboard:

1. Start the app.
2. Open `http://localhost:3001`.
3. Upload a `.xlsx` schedule.
4. Confirm the import summary appears.
5. Search by course code or name.
6. Add one exam.
7. Confirm it appears in My Exams.
8. Remove it.
9. Use Clear all with multiple selections.
