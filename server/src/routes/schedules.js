import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { getDb, withTransaction } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { parseWorkbook } from '../services/excelParser.js';
import { httpError } from '../utils/httpError.js';
import { rowToDto } from '../utils/rows.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const valid = file.originalname.toLowerCase().endsWith('.xlsx');
    cb(valid ? null : httpError(400, 'Please upload a .xlsx file.'), valid);
  }
});

export const schedulesRouter = express.Router();
schedulesRouter.use(requireAuth);

schedulesRouter.get('/current', async (req, res, next) => {
  try {
    const db = getDb();
    const uploadResult = await db.query(
      'SELECT * FROM schedule_uploads WHERE user_id = $1 AND active = 1 ORDER BY id DESC LIMIT 1',
      [req.user.id]
    );
    const uploadRow = uploadResult.rows[0];
    if (!uploadRow) {
      res.json({ upload: null, rows: [] });
      return;
    }

    const rowResult = await db.query(
      'SELECT * FROM schedule_rows WHERE user_id = $1 AND upload_id = $2 ORDER BY course_code, course_name LIMIT 50',
      [req.user.id, uploadRow.id]
    );
    res.json({ upload: uploadToDto(uploadRow), rows: rowResult.rows.map(rowToDto) });
  } catch (error) {
    next(error);
  }
});

schedulesRouter.get('/fields', (_req, res) => {
  res.json({
    fields: [
      'schoolFaculty',
      'classCode',
      'courseCode',
      'courseName',
      'notes',
      'group',
      'examPeriod',
      'week',
      'dayOfWeek',
      'examDate',
      'examSession',
      'studentCount',
      'examRoom',
      'examRoomCode'
    ]
  });
});

schedulesRouter.get('/rows', async (req, res, next) => {
  const query = String(req.query.query || '').trim();
  try {
    const db = getDb();
    const activeResult = await db.query(
      'SELECT id FROM schedule_uploads WHERE user_id = $1 AND active = 1 ORDER BY id DESC LIMIT 1',
      [req.user.id]
    );
    const active = activeResult.rows[0];
    if (!active) {
      res.json([]);
      return;
    }

    if (!query) {
      const rowResult = await db.query(
        'SELECT * FROM schedule_rows WHERE user_id = $1 AND upload_id = $2 ORDER BY course_code, course_name LIMIT 100',
        [req.user.id, active.id]
      );
      res.json(rowResult.rows.map(rowToDto));
      return;
    }

    const pattern = `%${query}%`;
    const rowResult = await db.query(`
      SELECT *
      FROM schedule_rows
      WHERE user_id = $1
        AND upload_id = $2
        AND (course_code ILIKE $3 OR course_name ILIKE $3 OR class_code ILIKE $3)
      ORDER BY course_code, course_name, exam_datetime
      LIMIT 100
    `, [req.user.id, active.id, pattern]);

    res.json(rowResult.rows.map(rowToDto));
  } catch (error) {
    next(error);
  }
});

schedulesRouter.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw httpError(400, 'No Excel file was uploaded.');

    const fileData = fs.readFileSync(req.file.path);
    const parsed = await parseWorkbook(req.file.path);
    await replaceActiveSchedule({
      userId: req.user.id,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      fileData,
      parsed
    });

    fs.rmSync(req.file.path, { force: true });
    res.json(buildImportResponse(parsed));
  } catch (error) {
    if (req.file?.path) fs.rmSync(req.file.path, { force: true });
    next(error);
  }
});

schedulesRouter.post('/reparse', async (req, res, next) => {
  let tempPath;
  try {
    const db = getDb();
    const activeResult = await db.query(
      'SELECT * FROM schedule_uploads WHERE user_id = $1 AND active = 1 ORDER BY id DESC LIMIT 1',
      [req.user.id]
    );
    const active = activeResult.rows[0];
    if (!active) throw httpError(404, 'No uploaded schedule is available to reparse.');
    if (!active.file_data) throw httpError(404, 'The uploaded Excel file is not available to reparse.');

    tempPath = path.join(uploadDir, `${active.stored_name}-reparse.xlsx`);
    fs.writeFileSync(tempPath, active.file_data);

    const headerRowIndex = Number(req.body.headerRowIndex);
    const columnMapping = req.body.columnMapping || {};
    const parsed = await parseWorkbook(tempPath, {
      headerRowIndex: Number.isInteger(headerRowIndex) ? headerRowIndex : undefined,
      columnMapping
    });

    await replaceActiveSchedule({
      userId: req.user.id,
      originalName: active.original_name,
      storedName: active.stored_name,
      fileData: active.file_data,
      parsed
    });

    res.json(buildImportResponse(parsed));
  } catch (error) {
    next(error);
  } finally {
    if (tempPath) fs.rmSync(tempPath, { force: true });
  }
});

schedulesRouter.delete('/current', async (req, res, next) => {
  try {
    await withTransaction(async (db) => {
      await db.query('DELETE FROM selected_exams WHERE user_id = $1', [req.user.id]);
      await db.query('DELETE FROM schedule_rows WHERE user_id = $1', [req.user.id]);
      await db.query('DELETE FROM schedule_uploads WHERE user_id = $1', [req.user.id]);
    });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

async function replaceActiveSchedule({ userId, originalName, storedName, fileData, parsed }) {
  await withTransaction(async (db) => {
    const previousSelectionsResult = await db.query(`
      SELECT sr.*
      FROM selected_exams se
      JOIN schedule_rows sr ON sr.id = se.schedule_row_id
      WHERE se.user_id = $1
    `, [userId]);
    const previousSelections = previousSelectionsResult.rows;

    await db.query('DELETE FROM selected_exams WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM schedule_rows WHERE user_id = $1', [userId]);
    await db.query('UPDATE schedule_uploads SET active = 0 WHERE user_id = $1', [userId]);

    const uploadResult = await db.query(`
      INSERT INTO schedule_uploads (
        user_id, original_name, stored_name, file_data, worksheet_name, header_row_index,
        column_mapping_json, session_mapping_json, row_count, active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)
      RETURNING id
    `, [
      userId,
      originalName,
      storedName,
      fileData,
      parsed.worksheetName,
      parsed.headerRowIndex,
      JSON.stringify(parsed.columnMapping),
      JSON.stringify(parsed.sessionMapping),
      parsed.rows.length
    ]);
    const uploadId = uploadResult.rows[0].id;

    const insertedRows = [];
    for (const row of parsed.rows) {
      const inserted = await db.query(`
        INSERT INTO schedule_rows (
          upload_id, user_id, source_row_number, school_faculty, class_code, course_code,
          course_name, notes, course_group, exam_period, week, day_of_week,
          exam_date_raw, exam_session, student_count, exam_room, exam_room_code,
          exam_time, exam_datetime, parse_warnings_json, raw_json
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
        RETURNING id
      `, [
        uploadId,
        userId,
        row.sourceRowNumber,
        row.schoolFaculty,
        row.classCode,
        row.courseCode,
        row.courseName,
        row.notes,
        row.group,
        row.examPeriod,
        row.week,
        row.dayOfWeek,
        row.examDateRaw,
        row.examSession,
        row.studentCount,
        row.examRoom,
        row.examRoomCode,
        row.examTime,
        row.examDateTime,
        JSON.stringify(row.parseWarnings),
        JSON.stringify(row.raw)
      ]);
      insertedRows.push({ id: inserted.rows[0].id, ...row });
    }

    for (const oldRow of previousSelections) {
      const match = findBestReplacement(oldRow, insertedRows);
      if (match) {
        await db.query(
          'INSERT INTO selected_exams (user_id, schedule_row_id) VALUES ($1, $2) ON CONFLICT (schedule_row_id) DO NOTHING',
          [userId, match.id]
        );
      }
    }
  });
}

function findBestReplacement(oldRow, newRows) {
  const sameCourse = newRows.filter((row) => normalizeKey(row.courseCode) === normalizeKey(oldRow.course_code));
  if (sameCourse.length === 1) return sameCourse[0];
  if (!sameCourse.length) return null;

  const scored = sameCourse
    .map((row) => ({ row, score: replacementScore(oldRow, row) }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.score > 0 ? scored[0].row : null;
}

function replacementScore(oldRow, newRow) {
  let score = 0;
  if (normalizeKey(newRow.classCode) === normalizeKey(oldRow.class_code)) score += 4;
  if (normalizeKey(newRow.group) === normalizeKey(oldRow.course_group)) score += 2;
  if (normalizeKey(newRow.examRoomCode) === normalizeKey(oldRow.exam_room_code)) score += 2;
  if (normalizeKey(newRow.courseName) === normalizeKey(oldRow.course_name)) score += 1;
  if (normalizeKey(newRow.examSession) === normalizeKey(oldRow.exam_session)) score += 1;
  return score;
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function uploadToDto(row) {
  return {
    id: row.id,
    originalName: row.original_name,
    worksheetName: row.worksheet_name,
    headerRowIndex: row.header_row_index,
    columnMapping: JSON.parse(row.column_mapping_json || '{}'),
    sessionMapping: JSON.parse(row.session_mapping_json || '{}'),
    rowCount: row.row_count,
    createdAt: row.created_at
  };
}

function buildImportResponse(parsed) {
  return {
    worksheetName: parsed.worksheetName,
    headerRowIndex: parsed.headerRowIndex,
    detectedHeaderRowIndex: parsed.detectedHeaderRowIndex,
    headerConfidence: parsed.headerConfidence,
    headers: parsed.headers,
    columnMapping: parsed.columnMapping,
    missingRequired: parsed.missingRequired,
    sessionMapping: parsed.sessionMapping,
    sessionMappingDetected: parsed.sessionMappingDetected,
    previewRows: parsed.previewRows,
    rowCount: parsed.rows.length
  };
}
