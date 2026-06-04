import express from 'express';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { httpError } from '../utils/httpError.js';
import { selectionToDto } from '../utils/rows.js';

export const selectionsRouter = express.Router();
selectionsRouter.use(requireAuth);

selectionsRouter.get('/', async (req, res, next) => {
  try {
    const rows = await getSelectionRows(req.user.id);
    res.json(rows.map(selectionToDto));
  } catch (error) {
    next(error);
  }
});

selectionsRouter.post('/', async (req, res, next) => {
  try {
    const scheduleRowId = Number(req.body.scheduleRowId);
    if (!Number.isInteger(scheduleRowId)) throw httpError(400, 'scheduleRowId is required.');

    const db = getDb();
    const scheduleRowResult = await db.query('SELECT id FROM schedule_rows WHERE id = $1 AND user_id = $2', [scheduleRowId, req.user.id]);
    const scheduleRow = scheduleRowResult.rows[0];
    if (!scheduleRow) throw httpError(404, 'Schedule row was not found.');

    await db.query(
      'INSERT INTO selected_exams (user_id, schedule_row_id) VALUES ($1, $2) ON CONFLICT (schedule_row_id) DO NOTHING',
      [req.user.id, scheduleRowId]
    );
    const selectedResult = await db.query(selectionQuery('WHERE se.user_id = $1 AND se.schedule_row_id = $2'), [req.user.id, scheduleRowId]);
    const selected = selectedResult.rows[0];
    res.status(201).json(selectionToDto(selected));
  } catch (error) {
    next(error);
  }
});

selectionsRouter.delete('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  try {
    await getDb().query('DELETE FROM selected_exams WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

selectionsRouter.delete('/', async (req, res, next) => {
  try {
    await getDb().query('DELETE FROM selected_exams WHERE user_id = $1', [req.user.id]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

async function getSelectionRows(userId) {
  const result = await getDb().query(selectionQuery('WHERE se.user_id = $1'), [userId]);
  return result.rows;
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
