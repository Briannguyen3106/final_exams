# Runbook

## Normal Run

From the project root:

```powershell
npm.cmd start
```

`DATABASE_URL` must be set before starting the server. For local development, use a local Postgres database or a Supabase connection string.

PowerShell example:

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
$env:JWT_SECRET="replace-with-a-long-random-secret"
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

Set `DATABASE_URL` and `JWT_SECRET` in the same PowerShell session before running the dev command.

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

## Supabase DNS Error

If startup fails with an error like:

```text
getaddrinfo ENOTFOUND db.<project-ref>.supabase.co
```

the app has reached database initialization, but Node cannot resolve or use the direct Supabase database host. In Supabase Project Settings > Database, copy a pooled connection string instead of the direct connection string, then update `DATABASE_URL` in `.env`.

Use the transaction or session pooler URI Supabase shows for the project. It commonly uses port `6543` and a host like `*.pooler.supabase.com`.

If the database password contains special URL characters such as `@`, `#`, `%`, `/`, or `?`, use the connection string copied from Supabase or URL-encode those characters in `DATABASE_URL`.

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

- `server/uploads/*`
- `client/dist/*`

`server/uploads/*` contains temporary parser files only. Persistent schedule data lives in PostgreSQL.

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
