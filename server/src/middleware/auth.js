import { getDb } from '../db/database.js';
import { verifyToken } from '../services/auth.js';
import { httpError } from '../utils/httpError.js';

export function requireAuth(req, _res, next) {
  authenticate(req).then(() => next()).catch(next);
}

async function authenticate(req) {
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = verifyToken(token);
  if (!payload) {
    throw httpError(401, 'Please sign in to continue.');
  }

  const result = await getDb().query('SELECT id, email, created_at FROM users WHERE id = $1', [payload.sub]);
  const user = result.rows[0];
  if (!user) {
    throw httpError(401, 'Please sign in to continue.');
  }

  req.user = {
    id: user.id,
    email: user.email,
    createdAt: user.created_at
  };
}
