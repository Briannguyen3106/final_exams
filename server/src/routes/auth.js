import express from 'express';
import { getDb, withTransaction } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createToken,
  hashPassword,
  isValidEmail,
  normalizeEmail,
  verifyPassword
} from '../services/auth.js';
import { httpError } from '../utils/httpError.js';

export const authRouter = express.Router();

authRouter.post('/signup', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    validateCredentials(email, password);

    const db = getDb();
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows[0]) throw httpError(409, 'An account already exists for this email.');

    const user = await withTransaction(async (client) => {
      const inserted = await client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
        [email, hashPassword(password)]
      );
      const createdUser = inserted.rows[0];

      const countResult = await client.query('SELECT COUNT(*)::int AS count FROM users');
      if (countResult.rows[0].count === 1) await claimOwnerlessData(client, createdUser.id);

      return createdUser;
    });

    res.status(201).json(authResponse(user));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const db = getDb();
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      throw httpError(401, 'Email or password is incorrect.');
    }

    res.json(authResponse(user));
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

function validateCredentials(email, password) {
  if (!isValidEmail(email)) throw httpError(400, 'Enter a valid email address.');
  if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters.');
}

function authResponse(user) {
  return {
    token: createToken(user),
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.created_at
    }
  };
}

async function claimOwnerlessData(db, userId) {
  await db.query('UPDATE schedule_uploads SET user_id = $1 WHERE user_id IS NULL', [userId]);
  await db.query('UPDATE schedule_rows SET user_id = $1 WHERE user_id IS NULL', [userId]);
  await db.query('UPDATE selected_exams SET user_id = $1 WHERE user_id IS NULL', [userId]);
}
