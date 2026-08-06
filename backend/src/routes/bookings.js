const express = require('express');
const { body, param, query } = require('express-validator');

const { getDb } = require('../database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { clearOfferTimer, handleProviderResponse, startMatchingForBooking } = require('../services/matchingEngine');
const { createNotification } = require('../services/notificationService');
const { broadcastToBooking } = require('../websocket');
const { generateId, now, parseJson, serializeJson } = require('../utils/helpers');
const { addBookingHistory, canAccessBooking, getBookingById, setBookingStatus } = require('../services/bookingService');

const router = express.Router();

function formatBookingList(rows) {
  return rows.map((row) => ({ ...row, metadata: parseJson(row.metadata, {}) }));
}

router.post(
  '/',
  authenticate,
  validate([
    body('category_id').notEmpty().withMessage('category_id is required.'),
    body('description').trim().isLength({ min: 10 }).withMessage('description must be at least 10 characters long.'),
    body('address_id').optional().notEmpty(),
    body('address_text').optional().trim(),
    body('lat').optional({ nullable: true }).isFloat({ min: -90, max: 90 }),
    body('lng').optional({ nullable: true }).isFloat({ min: -180, max: 180 }),
    body('scheduled_at').optional({ nullable: true }).isISO8601().withMessage('scheduled_at must be a valid date.'),
    body('urgency').optional().isIn(['asap', 'scheduled']).withMessage('urgency is invalid.'),
    body('estimated_price').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('estimated_price must be non-negative.'),
    body('metadata').optional().isObject().withMessage('metadata must be an object.')
  ]),
  (req, res) => {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can create bookings.' });
    }

    const db = getDb();
    const category = db.prepare('SELECT id FROM service_categories WHERE id = ? AND is_active = 1').get(req.body.category_id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    let address = null;
    if (req.body.address_id) {
      address = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(req.body.address_id, req.user.id);
      if (!address) {
        return res.status(404).json({ message: 'Address not found.' });
      }
    }

    const timestamp = now();
    const bookingId = generateId();
    const booking = {
      id: bookingId,
      customer_id: req.user.id,
      provider_id: null,
      category_id: req.body.category_id,
      status: 'requested',
      description: req.body.description,
      address_id: address ? address.id : null,
      lat: req.body.lat ?? address?.lat ?? null,
      lng: req.body.lng ?? address?.lng ?? null,
      address_text: req.body.address_text || (address ? `${address.address_line1}, ${address.city}` : null),
      scheduled_at: req.body.scheduled_at || null,
      urgency: req.body.urgency || 'asap',
      price_type: req.body.price_type || null,
      estimated_price: req.body.estimated_price || null,
      final_price: null,
      platform_fee: null,
      provider_earnings: null,
      metadata: serializeJson(req.body.metadata || {}),
      created_at: timestamp,
      updated_at: timestamp
    };

    db.prepare(
      `
        INSERT INTO bookings (id, customer_id, provider_id, category_id, status, description, address_id, lat, lng, address_text, scheduled_at, urgency, price_type, estimated_price, final_price, platform_fee, provider_earnings, metadata, created_at, updated_at)
        VALUES (@id, @customer_id, @provider_id, @category_id, @status, @description, @address_id, @lat, @lng, @address_text, @scheduled_at, @urgency, @price_type, @estimated_price, @final_price, @platform_fee, @provider_earnings, @metadata, @created_at, @updated_at)
      `
    ).run(booking);

    addBookingHistory(bookingId, 'requested', req.user.id, 'Booking request created');
    const matching = startMatchingForBooking(bookingId);

    return res.status(201).json({ booking: getBookingById(bookingId), matching });
  }
);

router.get(
  '/',
  authenticate,
  validate([query('status').optional().notEmpty()]),
  (req, res) => {
    const db = getDb();
    let rows;
    if (req.user.role === 'customer') {
      rows = db
        .prepare(
          `
            SELECT b.*, sc.name AS category_name
            FROM bookings b
            JOIN service_categories sc ON sc.id = b.category_id
            WHERE b.customer_id = ?
              ${req.query.status ? 'AND b.status = ?' : ''}
            ORDER BY b.updated_at DESC
          `
        )
        .all(...(req.query.status ? [req.user.id, req.query.status] : [req.user.id]));
    } else if (req.user.role === 'provider') {
      rows = db
        .prepare(
          `
            SELECT DISTINCT b.*, sc.name AS category_name, br.status AS response_status
            FROM bookings b
            JOIN service_categories sc ON sc.id = b.category_id
            LEFT JOIN booking_responses br ON br.booking_id = b.id AND br.provider_id = ?
            WHERE (b.provider_id = ? OR br.provider_id = ?)
              ${req.query.status ? 'AND b.status = ?' : ''}
            ORDER BY b.updated_at DESC
          `
        )
        .all(...(req.query.status ? [req.user.id, req.user.id, req.user.id, req.query.status] : [req.user.id, req.user.id, req.user.id]));
    } else {
      return res.status(403).json({ message: 'Use admin routes to access all bookings.' });
    }

    return res.json({ bookings: formatBookingList(rows) });
  }
);

router.get(
  '/:id',
  authenticate,
  validate([param('id').notEmpty().withMessage('Booking id is required.')]),
  (req, res) => {
    if (!canAccessBooking(req.params.id, req.user)) {
      return res.status(403).json({ message: 'You cannot access this booking.' });
    }

    const db = getDb();
    const booking = getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const responses = db.prepare('SELECT * FROM booking_responses WHERE booking_id = ? ORDER BY offered_at ASC').all(req.params.id);
    const quotes = db.prepare('SELECT * FROM quotes WHERE booking_id = ? ORDER BY created_at DESC').all(req.params.id);

    return res.json({ booking, responses, quotes });
  }
);

router.put(
  '/:id/status',
  authenticate,
  validate([
    param('id').notEmpty().withMessage('Booking id is required.'),
    body('status')
      .isIn(['requested', 'searching', 'offered', 'accepted', 'provider_en_route', 'provider_arrived', 'job_started', 'job_completed', 'payment_pending', 'paid', 'cancelled', 'disputed'])
      .withMessage('status is invalid.'),
    body('notes').optional().trim(),
    body('final_price').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('final_price must be non-negative.')
  ]),
  (req, res) => {
    const booking = getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (req.user.role === 'provider' && booking.provider_id !== req.user.id) {
      return res.status(403).json({ message: 'Only the assigned provider can update this booking.' });
    }

    if (req.user.role === 'customer' && booking.customer_id !== req.user.id) {
      return res.status(403).json({ message: 'Only the booking customer can update this booking.' });
    }

    if (!['admin', 'provider', 'customer'].includes(req.user.role)) {
      return res.status(403).json({ message: 'You cannot update this booking.' });
    }

    const updatedBooking = setBookingStatus(req.params.id, req.body.status, req.user.id, req.body.notes || null, {
      final_price: req.body.final_price !== undefined ? req.body.final_price : booking.final_price
    });

    broadcastToBooking(req.params.id, 'booking_status_changed', updatedBooking);
    const recipientId = req.user.id === booking.customer_id ? booking.provider_id : booking.customer_id;
    if (recipientId) {
      createNotification({
        userId: recipientId,
        type: 'booking_status',
        title: 'Booking status updated',
        body: `Booking status changed to ${req.body.status}.`,
        data: { bookingId: req.params.id, status: req.body.status }
      });
    }

    return res.json({ booking: updatedBooking });
  }
);

router.post(
  '/:id/cancel',
  authenticate,
  validate([param('id').notEmpty().withMessage('Booking id is required.'), body('reason').optional().trim()]),
  (req, res) => {
    const booking = getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (![booking.customer_id, booking.provider_id].includes(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You cannot cancel this booking.' });
    }

    clearOfferTimer(req.params.id);
    const updatedBooking = setBookingStatus(req.params.id, 'cancelled', req.user.id, req.body.reason || 'Booking cancelled');
    broadcastToBooking(req.params.id, 'booking_cancelled', updatedBooking);

    const recipientId = req.user.id === booking.customer_id ? booking.provider_id : booking.customer_id;
    if (recipientId) {
      createNotification({
        userId: recipientId,
        type: 'booking_cancelled',
        title: 'Booking cancelled',
        body: 'A booking has been cancelled.',
        data: { bookingId: req.params.id }
      });
    }

    return res.json({ booking: updatedBooking });
  }
);

router.post(
  '/:id/accept',
  authenticate,
  validate([param('id').notEmpty().withMessage('Booking id is required.')]),
  (req, res) => {
    if (req.user.role !== 'provider') {
      return res.status(403).json({ message: 'Only providers can accept bookings.' });
    }

    try {
      const booking = handleProviderResponse(req.params.id, req.user.id, 'accepted');
      broadcastToBooking(req.params.id, 'booking_accepted', booking);
      return res.json({ booking });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

router.post(
  '/:id/decline',
  authenticate,
  validate([param('id').notEmpty().withMessage('Booking id is required.')]),
  (req, res) => {
    if (req.user.role !== 'provider') {
      return res.status(403).json({ message: 'Only providers can decline bookings.' });
    }

    try {
      const matching = handleProviderResponse(req.params.id, req.user.id, 'declined');
      return res.json({ message: 'Booking offer declined.', matching, booking: getBookingById(req.params.id) });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

router.get(
  '/:id/timeline',
  authenticate,
  validate([param('id').notEmpty().withMessage('Booking id is required.')]),
  (req, res) => {
    if (!canAccessBooking(req.params.id, req.user)) {
      return res.status(403).json({ message: 'You cannot access this booking.' });
    }

    const db = getDb();
    const history = db
      .prepare('SELECT * FROM booking_status_history WHERE booking_id = ? ORDER BY created_at ASC')
      .all(req.params.id);
    return res.json({ timeline: history });
  }
);

module.exports = router;
