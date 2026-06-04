# Data And Parser

## SQLite Storage

Database path:

```text
server/data/exam-schedule.sqlite
```

Uploaded file storage:

```text
server/uploads/
```

Tables:

- `schedule_uploads`: upload metadata and parser settings.
- `schedule_rows`: normalized exam schedule rows.
- `selected_exams`: user-selected schedule rows.

SQLite pragmas:

- `journal_mode = WAL`
- `foreign_keys = ON`

## Schema Decisions

`schedule_rows` stores both normalized fields and raw row data:

- Normalized fields support search, dashboard display, and date logic.
- `parse_warnings_json` keeps parser concerns available for future UI.
- `raw_json` preserves source column values for debugging.

`selected_exams.schedule_row_id` is unique. A schedule row can only be selected once.

## Parser Overview

Parser file:

```text
server/src/services/excelParser.js
```

Main function:

```js
parseWorkbook(filePath, options)
```

The parser:

1. Opens the `.xlsx` with ExcelJS.
2. Uses only the first worksheet.
3. Converts worksheet cells into plain row arrays.
4. Detects the header row from the first 40 rows.
5. Detects known columns using Vietnamese and English aliases.
6. Detects exam session time mappings from row 2 when present.
7. Normalizes schedule rows.
8. Returns parser metadata, preview rows, warnings, and normalized rows.

## Column Detection

Required fields:

- `courseCode`
- `courseName`
- `examDate`
- `examSession`

Aliases are intentionally simple normalized text checks. They remove Vietnamese accents and compare lowercase strings.

Manual mapping in the frontend can override detected mapping. Keep this because real Excel schedules can change column names.

## Session Mapping

Default mapping:

- `Kip 1`: `07:00`
- `Kip 2`: `09:30`
- `Kip 3`: `12:30`
- `Kip 4`: `15:00`
- `Kip 5`: `17:30`

If row 2 contains text like `Kip 1 = 07:00`, parser detects it and uses that instead.

## Date Handling

Accepted date shapes:

- Excel Date objects
- Excel serial dates
- `dd/mm/yyyy`, `dd-mm-yyyy`, `dd.mm.yyyy`
- `yyyy/mm/dd`, `yyyy-mm-dd`, `yyyy.mm.dd`
- JavaScript fallback parsing as a last resort

Stored `examDateTime` is a local ISO-like string without timezone:

```text
YYYY-MM-DDTHH:mm:00
```

This is intentional so local dashboard calculations do not shift dates through UTC conversion.

## Replacement Behavior

When a new schedule replaces the active one:

1. Existing selected rows are read.
2. Selected exams and schedule rows are deleted.
3. Previous uploads are marked inactive.
4. New upload and rows are inserted.
5. Old selections are matched to new rows by best score.

Match score currently considers:

- same course code
- same class code
- same group
- same room code
- same course name
- same exam session

Do not simplify this to course code only; duplicate course codes exist.
