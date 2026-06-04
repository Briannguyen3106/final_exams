import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { getDb } from '../db/database.js';
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

schedulesRouter.get('/current', (_req, res) => {
  const db = getDb();
  const uploadRow = db.prepare('SELECT * FROM schedule_uploads WHERE active = 1 ORDER BY id DESC LIMIT 1').get();
  if (!uploadRow) {
    res.json({ upload: null, rows: [] });
    return;
  }

  const rows = db.prepare('SELECT * FROM schedule_rows WHERE upload_id = ? ORDER BY course_code, course_name LIMIT 50').all(uploadRow.id);
  res.json({ upload: uploadToDto(uploadRow), rows: rows.map(rowToDto) });
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

schedulesRouter.get('/rows', (req, res) => {
  const query = String(req.query.query || '').trim();
  const db = getDb();
  const active = db.prepare('SELECT id FROM schedule_uploads WHERE active = 1 ORDER BY id DESC LIMIT 1').get();
  if (!active) {
    res.json([]);
    return;
  }

  if (!query) {
    const rows = db.prepare('SELECT * FROM schedule_rows WHERE upload_id = ? ORDER BY course_code, course_name LIMIT 100').all(active.id);
    res.json(rows.map(rowToDto));
    return;
  }

  const pattern = `%${query}%`;
  const rows = db.prepare(`
    SELECT *
    FROM schedule_rows
    WHERE upload_id = ?
      AND (course_code LIKE ? OR course_name LIKE ? OR class_code LIKE ?)
    ORDER BY course_code, course_name, exam_datetime
    LIMIT 100
  `).all(active.id, pattern, pattern, pattern);

  res.json(rows.map(rowToDto));
});

schedulesRouter.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw httpError(400, 'No Excel file was uploaded.');

    const parsed = await parseWorkbook(req.file.path);
    replaceActiveSchedule({
      originalName: req.file.originalname,
      storedName: req.file.filename,
      parsed
    });

    res.json(buildImportResponse(parsed));
  } catch (error) {
    if (req.file?.path) fs.rmSync(req.file.path, { force: true });
    next(error);
  }
});

schedulesRouter.post('/reparse', async (req, res, next) => {
  try {
    const db = getDb();
    const active = db.prepare('SELECT * FROM schedule_uploads WHERE active = 1 ORDER BY id DESC LIMIT 1').get();
    if (!active) throw httpError(404, 'No uploaded schedule is available to reparse.');

    const filePath = path.join(uploadDir, active.stored_name);
    if (!fs.existsSync(filePath)) throw httpError(404, 'The uploaded Excel file is missing from local storage.');

    const headerRowIndex = Number(req.body.headerRowIndex);
    const columnMapping = req.body.columnMapping || {};
    const parsed = await parseWorkbook(filePath, {
      headerRowIndex: Number.isInteger(headerRowIndex) ? headerRowIndex : undefined,
      columnMapping
    });

    replaceActiveSchedule({
      originalName: active.original_name,
      storedName: active.stored_name,
      parsed
    });

    res.json(buildImportResponse(parsed));
  } catch (error) {
    next(error);
  }
});

schedulesRouter.delete('/current', (_req, res) => {
  const db = getDb();
  const activeUploads = db.prepare('SELECT stored_name FROM schedule_uploads WHERE active = 1').all();
  db.transaction(() => {
    db.prepare('DELETE FROM selected_exams').run();
    db.prepare('DELETE FROM schedule_rows').run();
    db.prepare('DELETE FROM schedule_uploads').run();
  })();

  activeUploads.forEach((row) => fs.rmSync(path.join(uploadDir, row.stored_name), { force: true }));
  res.status(204).end();
});

function replaceActiveSchedule({ originalName, storedName, parsed }) {
  const db = getDb();
  const insertUpload = db.prepare(`
    INSERT INTO schedule_uploads (
      original_name, stored_name, worksheet_name, header_row_index,
      column_mapping_json, session_mapping_json, row_count, active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertRow = db.prepare(`
    INSERT INTO schedule_rows (
      upload_id, source_row_number, school_faculty, class_code, course_code,
      course_name, notes, course_group, exam_period, week, day_of_week,
      exam_date_raw, exam_session, student_count, exam_room, exam_room_code,
      exam_time, exam_datetime, parse_warnings_json, raw_json
    )
    VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  db.transaction(() => {
    const previousSelections = db.prepare(`
      SELECT sr.*
      FROM selected_exams se
      JOIN schedule_rows sr ON sr.id = se.schedule_row_id
    `).all();

    db.prepare('DELETE FROM selected_exams').run();
    db.prepare('DELETE FROM schedule_rows').run();
    db.prepare('UPDATE schedule_uploads SET active = 0').run();

    const result = insertUpload.run(
      originalName,
      storedName,
      parsed.worksheetName,
      parsed.headerRowIndex,
      JSON.stringify(parsed.columnMapping),
      JSON.stringify(parsed.sessionMapping),
      parsed.rows.length
    );

    const insertedRows = parsed.rows.map((row) => {
      const inserted = insertRow.run(
        result.lastInsertRowid,
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
      );
      return { id: inserted.lastInsertRowid, ...row };
    });

    const insertSelection = db.prepare('INSERT OR IGNORE INTO selected_exams (schedule_row_id) VALUES (?)');
    previousSelections.forEach((oldRow) => {
      const match = findBestReplacement(oldRow, insertedRows);
      if (match) insertSelection.run(match.id);
    });
  })();
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
