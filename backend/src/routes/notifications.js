const express = require('express');
const { param } = require('express-validator');

const { getDb } = require('../database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { formatNotification } = require('../services/bookingService');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const notifications = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id)
    .map((notification) => formatNotification(notification));
  return res.json({ notifications });
});

router.put(
  '/:id/read',
  authenticate,
  validate([param('id').notEmpty().withMessage('Notification id is required.')]),
  (req, res) => {
    const db = getDb();
    const result = db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (!result.changes) {
      return res.status(404).json({ message: 'Notification not found.' });
    }
    return res.json({ message: 'Notification marked as read.' });
  }
);

router.put('/read-all', authenticate, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  return res.json({ message: 'All notifications marked as read.' });
});

module.exports = router;
