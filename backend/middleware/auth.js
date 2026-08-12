const jwt = require('jsonwebtoken');
const { getDb } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super-weak-jwt-secret-change-me';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, academicId: user.academic_id },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * INTENTIONAL VULN AUTH-001: accepts alg=none JWTs
 */
function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      if (header.alg === 'none' || header.alg === 'None' || header.alg === 'NONE') {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        payload.__vuln_none_alg = true;
        return payload;
      }
    }
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
  if (!user && !payload.__vuln_none_alg) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = user || {
    id: payload.id || 0,
    email: payload.email,
    role: payload.role || 'admin',
    full_name: payload.name || 'Forged User',
    academic_id: payload.academicId || 'FORGED',
  };
  req.tokenPayload = payload;
  next();
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      const db = getDb();
      req.user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id) || payload;
      req.tokenPayload = payload;
    }
  }
  next();
}

module.exports = { authRequired, optionalAuth, signToken, verifyToken, JWT_SECRET };
