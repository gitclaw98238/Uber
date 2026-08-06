const express = require('express');
const { body, param } = require('express-validator');

const { getDb } = require('../database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { canAccessBooking, getBookingParticipants } = require('../services/bookingService');
const { createNotification } = require('../services/notificationService');
const { sendToUser } = require('../websocket');
const { generateId, now, toBoolean } = require('../utils/helpers');

const router = express.Router();

router.get(
  '/booking/:bookingId',
  authenticate,
  validate([param('bookingId').notEmpty().withMessage('bookingId is required.')]),
  (req, res) => {
    if (!canAccessBooking(req.params.bookingId, req.user)) {
      return res.status(403).json({ message: 'You cannot access messages for this booking.' });
    }

    const db = getDb();
    db.prepare('UPDATE messages SET is_read = 1 WHERE booking_id = ? AND receiver_id = ?').run(req.params.bookingId, req.user.id);
    const messages = db
      .prepare(
        `
          SELECT m.*, sender.first_name || ' ' || sender.last_name AS sender_name, receiver.first_name || ' ' || receiver.last_name AS receiver_name
          FROM messages m
          JOIN users sender ON sender.id = m.sender_id
          JOIN users receiver ON receiver.id = m.receiver_id
          WHERE m.booking_id = ?
          ORDER BY m.created_at ASC
        `
      )
      .all(req.params.bookingId)
      .map((message) => ({ ...message, is_read: toBoolean(message.is_read) }));

    return res.json({ messages });
  }
);

router.post(
  '/',
  authenticate,
  validate([
    body('booking_id').notEmpty().withMessage('booking_id is required.'),
    body('receiver_id').notEmpty().withMessage('receiver_id is required.'),
    body('content').trim().notEmpty().withMessage('content is required.'),
    body('message_type').optional().isIn(['text', 'image', 'system']).withMessage('message_type is invalid.')
  ]),
  (req, res) => {
    if (!canAccessBooking(req.body.booking_id, req.user)) {
      return res.status(403).json({ message: 'You cannot message for this booking.' });
    }

    const participants = new Set(getBookingParticipants(req.body.booking_id));
    if (!participants.has(req.body.receiver_id)) {
      return res.status(403).json({ message: 'Receiver is not part of this booking.' });
    }

    const db = getDb();
    const message = {
      id: generateId(),
      booking_id: req.body.booking_id,
      sender_id: req.user.id,
      receiver_id: req.body.receiver_id,
      content: req.body.content,
      message_type: req.body.message_type || 'text',
      is_read: 0,
      created_at: now()
    };

    db.prepare(
      `
        INSERT INTO messages (id, booking_id, sender_id, receiver_id, content, message_type, is_read, created_at)
        VALUES (@id, @booking_id, @sender_id, @receiver_id, @content, @message_type, @is_read, @created_at)
      `
    ).run(message);

    sendToUser(req.body.receiver_id, 'chat_message', message);
    createNotification({
      userId: req.body.receiver_id,
      type: 'message',
      title: 'New message',
      body: 'You received a new message about a booking.',
      data: { bookingId: req.body.booking_id, messageId: message.id }
    });

    return res.status(201).json({ message });
  }
);

module.exports = router;
