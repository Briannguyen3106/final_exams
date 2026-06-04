# Online Deployment

## Target Free Stack

- Render Free Web Service for the Express app.
- Supabase Free project for PostgreSQL.
- React is still built by Vite and served from Express.

This app no longer uses SQLite for runtime persistence. It requires `DATABASE_URL`.

## Supabase Setup

1. Create a Supabase project.
2. Open Project Settings > Database.
3. Copy the PostgreSQL connection string.
4. Use the pooled connection string if Supabase recommends it for hosted/serverless apps.
5. Replace the password placeholder in the URL with the database password.

The server creates the required tables on startup:

- `users`
- `schedule_uploads`
- `schedule_rows`
- `selected_exams`

## Render Setup

Create a new Render Web Service from the GitHub repo.

Build command:

```powershell
npm.cmd run install:all
npm.cmd run build --prefix client
```

Start command:

```powershell
npm.cmd run start --prefix server
```

Environment variables:

```text
DATABASE_URL=<Supabase Postgres connection string>
JWT_SECRET=<long random secret>
NODE_ENV=production
```

Optional:

```text
DATABASE_SSL=false
```

Only set `DATABASE_SSL=false` for a local non-SSL Postgres database. Supabase should use SSL.

## Upload Behavior

Render Free has an ephemeral filesystem, so the app does not rely on `server/uploads/` for long-term storage.

Upload flow:

1. `multer` writes the `.xlsx` to `server/uploads/` temporarily.
2. The parser reads the file.
3. Normalized rows are saved in PostgreSQL.
4. Workbook bytes are saved in `schedule_uploads.file_data` so manual reparse can still work.
5. The temporary upload file is removed.

This preserves the existing upload and manual mapping workflow without requiring Supabase Storage.

## Deployment Notes

- Free Render services spin down after idle periods, so the first request after inactivity can be slow.
- Do not store important runtime data in local files on Render.
- Keep every schedule and selection query scoped by `user_id`.
- If uploaded workbooks become large or many users upload schedules, move workbook storage from PostgreSQL `bytea` to Supabase Storage.
