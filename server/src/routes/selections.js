import express from 'express';
import { getDb } from '../db/database.js';
import { httpError } from '../utils/httpError.js';
import { selectionToDto } from '../utils/rows.js';

export const selectionsRouter = express.Router();

selectionsRouter.get('/', (_req, res) => {
  const rows = getSelectionRows();
  res.json(rows.map(selectionToDto));
});

selectionsRouter.post('/', (req, res, next) => {
  try {
    const scheduleRowId = Number(req.body.scheduleRowId);
    if (!Number.isInteger(scheduleRowId)) throw httpError(400, 'scheduleRowId is required.');

    const db = getDb();
    const scheduleRow = db.prepare('SELECT id FROM schedule_rows WHERE id = ?').get(scheduleRowId);
    if (!scheduleRow) throw httpError(404, 'Schedule row was not found.');

    db.prepare('INSERT OR IGNORE INTO selected_exams (schedule_row_id) VALUES (?)').run(scheduleRowId);
    const selected = db.prepare(selectionQuery('WHERE se.schedule_row_id = ?')).get(scheduleRowId);
    res.status(201).json(selectionToDto(selected));
  } catch (error) {
    next(error);
  }
});

selectionsRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  getDb().prepare('DELETE FROM selected_exams WHERE id = ?').run(id);
  res.status(204).end();
});

selectionsRouter.delete('/', (_req, res) => {
  getDb().prepare('DELETE FROM selected_exams').run();
  res.status(204).end();
});

function getSelectionRows() {
  return getDb().prepare(selectionQuery('')).all();
}

function selectionQuery(whereClause) {
  return `
    SELECT
      se.id AS selection_id,
      se.created_at AS selected_at,
      sr.*
    FROM selected_exams se
    JOIN schedule_rows sr ON sr.id = se.schedule_row_id
    ${whereClause}
    ORDER BY
      CASE WHEN sr.exam_datetime IS NULL THEN 1 ELSE 0 END,
      sr.exam_datetime ASC,
      sr.course_code ASC
  `;
}
