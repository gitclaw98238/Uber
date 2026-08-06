const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');

const { getDb } = require('../database');
const { authenticate, signToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { generateId, now, sanitizeUser } = require('../utils/helpers');

const router = express.Router();

router.post(
  '/register',
  validate([
    body('email').isEmail().withMessage('A valid email address is required.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
    body('role').isIn(['customer', 'provider']).withMessage('Role must be customer or provider.'),
    body('first_name').trim().notEmpty().withMessage('First name is required.'),
    body('last_name').trim().notEmpty().withMessage('Last name is required.'),
    body('phone').optional().trim().isLength({ min: 7 }).withMessage('Phone number looks invalid.'),
    body('avatar_url').optional().isURL().withMessage('avatar_url must be a valid URL.')
  ]),
  (req, res) => {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(req.body.email);
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const timestamp = now();
    const userId = generateId();
    const passwordHash = bcrypt.hashSync(req.body.password, 10);

    db.prepare(
      `
        INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, avatar_url, is_active, is_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
      `
    ).run(
      userId,
      req.body.email,
      passwordHash,
      req.body.role,
      req.body.first_name,
      req.body.last_name,
      req.body.phone || null,
      req.body.avatar_url || null,
      timestamp,
      timestamp
    );

    if (req.body.role === 'provider') {
      db.prepare(
        `
          INSERT INTO provider_profiles (id, user_id, business_name, description, hourly_rate, is_online, is_verified, rating_avg, total_jobs, service_area_radius, lat, lng, created_at, updated_at)
          VALUES (?, ?, ?, ?, NULL, 0, 0, 0, 0, 25, NULL, NULL, ?, ?)
        `
      ).run(generateId(), userId, `${req.body.first_name} ${req.body.last_name}`, '', timestamp, timestamp);
    }

    const user = sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(userId));
    return res.status(201).json({ token: signToken(user), user });
  }
);

router.post(
  '/login',
  validate([
    body('email').isEmail().withMessage('A valid email address is required.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.')
  ]),
  (req, res) => {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(req.body.email);

    if (!user || !bcrypt.compareSync(req.body.password, user.password_hash)) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'This account has been suspended.' });
    }

    const safeUser = sanitizeUser(user);
    return res.json({ token: signToken(safeUser), user: safeUser });
  }
);

router.get('/me', authenticate, (req, res) => {
  const db = getDb();
  const user = sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id));
  return res.json({ user });
});

router.put(
  '/me',
  authenticate,
  validate([
    body('email').optional().isEmail().withMessage('A valid email address is required.').normalizeEmail(),
    body('first_name').optional().trim().notEmpty().withMessage('First name cannot be empty.'),
    body('last_name').optional().trim().notEmpty().withMessage('Last name cannot be empty.'),
    body('phone').optional().trim().isLength({ min: 7 }).withMessage('Phone number looks invalid.'),
    body('avatar_url').optional({ nullable: true }).isURL().withMessage('avatar_url must be a valid URL.')
  ]),
  (req, res) => {
    const db = getDb();
    if (req.body.email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(req.body.email, req.user.id);
      if (existing) {
        return res.status(409).json({ message: 'Email address is already in use.' });
      }
    }

    const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const updated = {
      email: req.body.email || current.email,
      first_name: req.body.first_name || current.first_name,
      last_name: req.body.last_name || current.last_name,
      phone: req.body.phone !== undefined ? req.body.phone : current.phone,
      avatar_url: req.body.avatar_url !== undefined ? req.body.avatar_url : current.avatar_url,
      updated_at: now(),
      id: req.user.id
    };

    db.prepare(
      `
        UPDATE users
        SET email = @email, first_name = @first_name, last_name = @last_name, phone = @phone, avatar_url = @avatar_url, updated_at = @updated_at
        WHERE id = @id
      `
    ).run(updated);

    return res.json({ user: sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
  }
);

module.exports = router;
