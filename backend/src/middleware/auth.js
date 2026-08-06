const jwt = require('jsonwebtoken');

const { getDb } = require('../database');
const { sanitizeUser } = require('../utils/helpers');

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret';

function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const payload = verifyToken(token);
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(payload.sub);

    if (!user) {
      return res.status(401).json({ message: 'Invalid authentication token.' });
    }

    req.user = sanitizeUser(user);
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired authentication token.' });
  }
}

function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) {
    return next();
  }

  try {
    const payload = verifyToken(token);
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(payload.sub);
    req.user = sanitizeUser(user);
  } catch {
    req.user = null;
  }

  return next();
}

module.exports = {
  authenticate,
  optionalAuth,
  signToken,
  verifyToken
};
