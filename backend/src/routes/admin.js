const express = require('express');
const { body, param, query } = require('express-validator');

const { getDb } = require('../database');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { validate } = require('../middleware/validate');
const { createNotification } = require('../services/notificationService');
const { now } = require('../utils/helpers');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/dashboard', (_req, res) => {
  const db = getDb();
  const metrics = {
    users: db.prepare('SELECT COUNT(*) AS total FROM users').get().total,
    providers: db.prepare('SELECT COUNT(*) AS total FROM users WHERE role = ?').get('provider').total,
    bookings: db.prepare('SELECT COUNT(*) AS total FROM bookings').get().total,
    disputes: db.prepare('SELECT COUNT(*) AS total FROM disputes WHERE status IN (?, ?)').get('open', 'investigating').total,
    revenue: db.prepare("SELECT COALESCE(SUM(platform_fee), 0) AS total FROM payments WHERE status = 'captured'").get().total,
    authorized_payments: db.prepare("SELECT COUNT(*) AS total FROM payments WHERE status = 'authorized'").get().total
  };
  return res.json({ metrics });
});

router.get(
  '/users',
  validate([query('role').optional().isIn(['customer', 'provider', 'admin']).withMessage('role filter is invalid.')]),
  (req, res) => {
    const db = getDb();
    const users = db
      .prepare(`SELECT id, email, role, first_name, last_name, phone, avatar_url, is_active, is_verified, created_at, updated_at FROM users ${req.query.role ? 'WHERE role = ?' : ''} ORDER BY created_at DESC`)
      .all(...(req.query.role ? [req.query.role] : []));
    return res.json({ users });
  }
);

router.get('/providers', (_req, res) => {
  const db = getDb();
  const providers = db
    .prepare(
      `
        SELECT
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.is_active,
          u.is_verified AS user_verified,
          pp.business_name,
          pp.is_verified,
          pp.rating_avg,
          pp.total_jobs,
          COUNT(vd.id) AS verification_documents
        FROM users u
        JOIN provider_profiles pp ON pp.user_id = u.id
        LEFT JOIN verification_documents vd ON vd.provider_id = u.id
        WHERE u.role = 'provider'
        GROUP BY u.id
        ORDER BY pp.updated_at DESC
      `
    )
    .all();
    return res.json({ providers });
  }
);

router.put(
  '/providers/:id/verify',
  validate([
    param('id').notEmpty().withMessage('Provider id is required.'),
    body('is_verified').isBoolean().withMessage('is_verified must be true or false.'),
    body('notes').optional().trim()
  ]),
  (req, res) => {
    const db = getDb();
    const provider = db.prepare('SELECT id FROM users WHERE id = ? AND role = ?').get(req.params.id, 'provider');
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found.' });
    }

    db.transaction(() => {
      db.prepare('UPDATE users SET is_verified = ?, updated_at = ? WHERE id = ?').run(req.body.is_verified ? 1 : 0, now(), req.params.id);
      db.prepare('UPDATE provider_profiles SET is_verified = ?, updated_at = ? WHERE user_id = ?').run(req.body.is_verified ? 1 : 0, now(), req.params.id);
    })();

    createNotification({
      userId: req.params.id,
      type: 'provider_verification',
      title: req.body.is_verified ? 'Provider verified' : 'Provider verification updated',
      body: req.body.is_verified ? 'Your provider account has been verified.' : req.body.notes || 'Your provider verification status changed.',
      data: { providerId: req.params.id, is_verified: req.body.is_verified }
    });

    return res.json({ message: 'Provider verification updated.' });
  }
);

router.get(
  '/bookings',
  validate([query('status').optional().notEmpty()]),
  (req, res) => {
    const db = getDb();
    const bookings = db
      .prepare(
        `
          SELECT b.*, customer.first_name || ' ' || customer.last_name AS customer_name, provider.first_name || ' ' || provider.last_name AS provider_name
          FROM bookings b
          JOIN users customer ON customer.id = b.customer_id
          LEFT JOIN users provider ON provider.id = b.provider_id
          ${req.query.status ? 'WHERE b.status = ?' : ''}
          ORDER BY b.updated_at DESC
        `
      )
      .all(...(req.query.status ? [req.query.status] : []));
    return res.json({ bookings });
  }
);

router.get('/disputes', (_req, res) => {
  const db = getDb();
  const disputes = db
    .prepare(
      `
        SELECT d.*, reporter.first_name || ' ' || reporter.last_name AS reporter_name
        FROM disputes d
        JOIN users reporter ON reporter.id = d.reporter_id
        ORDER BY d.created_at DESC
      `
    )
    .all();
  return res.json({ disputes });
});

router.put(
  '/disputes/:id',
  validate([
    param('id').notEmpty().withMessage('Dispute id is required.'),
    body('status').isIn(['open', 'investigating', 'resolved', 'closed']).withMessage('status is invalid.'),
    body('resolution').optional().trim()
  ]),
  (req, res) => {
    const db = getDb();
    const dispute = db.prepare('SELECT * FROM disputes WHERE id = ?').get(req.params.id);
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found.' });
    }

    db.prepare(
      `
        UPDATE disputes
        SET status = ?, resolution = ?, admin_id = ?, resolved_at = ?
        WHERE id = ?
      `
    ).run(
      req.body.status,
      req.body.resolution || dispute.resolution,
      req.user.id,
      ['resolved', 'closed'].includes(req.body.status) ? now() : null,
      req.params.id
    );

    createNotification({
      userId: dispute.reporter_id,
      type: 'dispute_update',
      title: 'Dispute updated',
      body: `Your dispute is now ${req.body.status}.`,
      data: { disputeId: dispute.id, status: req.body.status }
    });

    return res.json({ dispute: db.prepare('SELECT * FROM disputes WHERE id = ?').get(req.params.id) });
  }
);

router.put('/settings', (req, res) => {
  const settings = req.body.settings && typeof req.body.settings === 'object' ? req.body.settings : req.body;
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return res.status(422).json({ message: 'Provide settings as an object.' });
  }

  const db = getDb();
  const timestamp = now();
  const upsert = db.prepare(
    `
      INSERT INTO platform_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `
  );

  db.transaction(() => {
    Object.entries(settings).forEach(([key, value]) => upsert.run(key, String(value), timestamp));
  })();

  return res.json({ message: 'Platform settings updated.', settings });
});

router.put(
  '/users/:id/suspend',
  validate([
    param('id').notEmpty().withMessage('User id is required.'),
    body('is_active').optional().isBoolean().withMessage('is_active must be true or false.')
  ]),
  (req, res) => {
    const db = getDb();
    const isActive = req.body.is_active !== undefined ? req.body.is_active : false;
    const result = db.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?').run(isActive ? 1 : 0, now(), req.params.id);
    if (!result.changes) {
      return res.status(404).json({ message: 'User not found.' });
    }

    createNotification({
      userId: req.params.id,
      type: 'account_status',
      title: isActive ? 'Account reactivated' : 'Account suspended',
      body: isActive ? 'Your account has been reactivated.' : 'Your account has been suspended by an administrator.',
      data: { userId: req.params.id, is_active: isActive }
    });

    return res.json({ message: 'User status updated.' });
  }
);

module.exports = router;
