const express = require('express');
const { body, param } = require('express-validator');

const { getDb } = require('../database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createNotification } = require('../services/notificationService');
const { generateId, now } = require('../utils/helpers');
const { addBookingHistory, getBookingById } = require('../services/bookingService');

const router = express.Router();

function getQuote(quoteId) {
  const db = getDb();
  return db.prepare('SELECT * FROM quotes WHERE id = ?').get(quoteId);
}

router.post(
  '/',
  authenticate,
  validate([
    body('booking_id').notEmpty().withMessage('booking_id is required.'),
    body('labor_cost').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('labor_cost must be non-negative.'),
    body('materials_cost').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('materials_cost must be non-negative.'),
    body('additional_fees').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('additional_fees must be non-negative.'),
    body('total').isFloat({ min: 0 }).withMessage('total must be non-negative.'),
    body('notes').optional().trim()
  ]),
  (req, res) => {
    if (req.user.role !== 'provider') {
      return res.status(403).json({ message: 'Only providers can submit quotes.' });
    }

    const db = getDb();
    const booking = getBookingById(req.body.booking_id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const access = db
      .prepare(
        `
          SELECT 1
          FROM booking_responses br
          WHERE br.booking_id = ? AND br.provider_id = ?
          UNION
          SELECT 1 FROM bookings WHERE id = ? AND provider_id = ?
          LIMIT 1
        `
      )
      .get(req.body.booking_id, req.user.id, req.body.booking_id, req.user.id);

    if (!access) {
      return res.status(403).json({ message: 'You cannot submit a quote for this booking.' });
    }

    const quote = {
      id: generateId(),
      booking_id: req.body.booking_id,
      provider_id: req.user.id,
      labor_cost: req.body.labor_cost || 0,
      materials_cost: req.body.materials_cost || 0,
      additional_fees: req.body.additional_fees || 0,
      total: req.body.total,
      notes: req.body.notes || null,
      status: 'pending',
      created_at: now()
    };

    db.prepare(
      `
        INSERT INTO quotes (id, booking_id, provider_id, labor_cost, materials_cost, additional_fees, total, notes, status, created_at)
        VALUES (@id, @booking_id, @provider_id, @labor_cost, @materials_cost, @additional_fees, @total, @notes, @status, @created_at)
      `
    ).run(quote);

    createNotification({
      userId: booking.customer_id,
      type: 'quote_submitted',
      title: 'New quote received',
      body: 'A provider submitted a quote for your booking.',
      data: { bookingId: booking.id, quoteId: quote.id }
    });

    return res.status(201).json({ quote });
  }
);

router.put(
  '/:id/accept',
  authenticate,
  validate([param('id').notEmpty().withMessage('Quote id is required.')]),
  (req, res) => {
    const db = getDb();
    const quote = getQuote(req.params.id);
    if (!quote) {
      return res.status(404).json({ message: 'Quote not found.' });
    }

    const booking = getBookingById(quote.booking_id);
    if (!booking || booking.customer_id !== req.user.id) {
      return res.status(403).json({ message: 'Only the booking customer can accept this quote.' });
    }

    const timestamp = now();
    db.transaction(() => {
      db.prepare('UPDATE quotes SET status = ? WHERE booking_id = ?').run('declined', quote.booking_id);
      db.prepare('UPDATE quotes SET status = ? WHERE id = ?').run('accepted', req.params.id);
      db.prepare(
        `
          UPDATE bookings
          SET provider_id = ?, estimated_price = ?, price_type = COALESCE(price_type, 'quote'), status = ?, updated_at = ?
          WHERE id = ?
        `
      ).run(quote.provider_id, quote.total, 'accepted', timestamp, quote.booking_id);
    })();

    addBookingHistory(quote.booking_id, 'accepted', req.user.id, 'Customer accepted provider quote');
    createNotification({
      userId: quote.provider_id,
      type: 'quote_accepted',
      title: 'Quote accepted',
      body: 'Your quote was accepted by the customer.',
      data: { bookingId: quote.booking_id, quoteId: quote.id }
    });

    return res.json({ quote: getQuote(req.params.id), booking: getBookingById(quote.booking_id) });
  }
);

router.put(
  '/:id/decline',
  authenticate,
  validate([param('id').notEmpty().withMessage('Quote id is required.')]),
  (req, res) => {
    const db = getDb();
    const quote = getQuote(req.params.id);
    if (!quote) {
      return res.status(404).json({ message: 'Quote not found.' });
    }

    const booking = getBookingById(quote.booking_id);
    if (!booking || booking.customer_id !== req.user.id) {
      return res.status(403).json({ message: 'Only the booking customer can decline this quote.' });
    }

    db.prepare('UPDATE quotes SET status = ? WHERE id = ?').run('declined', req.params.id);
    createNotification({
      userId: quote.provider_id,
      type: 'quote_declined',
      title: 'Quote declined',
      body: 'The customer declined your quote.',
      data: { bookingId: quote.booking_id, quoteId: quote.id }
    });

    return res.json({ quote: getQuote(req.params.id) });
  }
);

module.exports = router;
