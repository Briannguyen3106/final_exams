import crypto from 'node:crypto';

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const TOKEN_VERSION = 'v1';

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const hash = crypto.pbkdf2Sync(password, salt, 210000, 32, 'sha256').toString('base64url');
  return `pbkdf2_sha256$${salt}$${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [algorithm, salt, hash] = String(storedHash || '').split('$');
  if (algorithm !== 'pbkdf2_sha256' || !salt || !hash) return false;

  const candidate = crypto.pbkdf2Sync(password, salt, 210000, 32, 'sha256').toString('base64url');
  return timingSafeEqual(candidate, hash);
}

export function createToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    email: user.email,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(encodedPayload);
  return `${TOKEN_VERSION}.${encodedPayload}.${signature}`;
}

export function verifyToken(token) {
  const [version, encodedPayload, signature] = String(token || '').split('.');
  if (version !== TOKEN_VERSION || !encodedPayload || !signature) return null;
  if (!timingSafeEqual(sign(encodedPayload), signature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (!payload.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function sign(value) {
  return crypto.createHmac('sha256', getTokenSecret()).update(value).digest('base64url');
}

function getTokenSecret() {
  return process.env.JWT_SECRET || 'local-development-token-secret-change-before-deploying';
}

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
