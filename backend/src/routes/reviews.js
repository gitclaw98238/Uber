const express = require('express');
const { body, param } = require('express-validator');

const { getDb } = require('../database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createNotification } = require('../services/notificationService');
const { generateId, now } = require('../utils/helpers');
const { getBookingById } = require('../services/bookingService');

const router = express.Router();

function refreshProviderMetrics(providerId) {
  const db = getDb();
  const summary = db
    .prepare('SELECT COALESCE(AVG(rating), 0) AS rating_avg FROM reviews WHERE reviewee_id = ?')
    .get(providerId);
  const totalJobs = db
    .prepare(`SELECT COUNT(*) AS total_jobs FROM bookings WHERE provider_id = ? AND status IN ('job_completed', 'paid')`)
    .get(providerId);
  db.prepare('UPDATE provider_profiles SET rating_avg = ?, total_jobs = ?, updated_at = ? WHERE user_id = ?').run(
    Number(summary.rating_avg || 0).toFixed(2),
    totalJobs.total_jobs,
    now(),
    providerId
  );
}

router.post(
  '/',
  authenticate,
  validate([
    body('booking_id').notEmpty().withMessage('booking_id is required.'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('rating must be between 1 and 5.'),
    body('quality_rating').optional({ nullable: true }).isInt({ min: 1, max: 5 }),
    body('professionalism_rating').optional({ nullable: true }).isInt({ min: 1, max: 5 }),
    body('communication_rating').optional({ nullable: true }).isInt({ min: 1, max: 5 }),
    body('punctuality_rating').optional({ nullable: true }).isInt({ min: 1, max: 5 }),
    body('comment').optional().trim(),
    body('reviewee_id').optional().notEmpty()
  ]),
  (req, res) => {
    const db = getDb();
    const booking = getBookingById(req.body.booking_id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (!['job_completed', 'paid'].includes(booking.status)) {
      return res.status(400).json({ message: 'Reviews can only be created after the job is complete.' });
    }

    if (![booking.customer_id, booking.provider_id].includes(req.user.id)) {
      return res.status(403).json({ message: 'You cannot review this booking.' });
    }

    const revieweeId = req.body.reviewee_id || (req.user.id === booking.customer_id ? booking.provider_id : booking.customer_id);
    if (!revieweeId || ![booking.customer_id, booking.provider_id].includes(revieweeId) || revieweeId === req.user.id) {
      return res.status(422).json({ message: 'reviewee_id must reference the other booking participant.' });
    }

    const existing = db
      .prepare('SELECT id FROM reviews WHERE booking_id = ? AND reviewer_id = ? AND reviewee_id = ?')
      .get(req.body.booking_id, req.user.id, revieweeId);
    if (existing) {
      return res.status(409).json({ message: 'You already reviewed this participant for the booking.' });
    }

    const review = {
      id: generateId(),
      booking_id: req.body.booking_id,
      reviewer_id: req.user.id,
      reviewee_id: revieweeId,
      rating: req.body.rating,
      quality_rating: req.body.quality_rating || null,
      professionalism_rating: req.body.professionalism_rating || null,
      communication_rating: req.body.communication_rating || null,
      punctuality_rating: req.body.punctuality_rating || null,
      comment: req.body.comment || null,
      response: null,
      created_at: now()
    };

    db.prepare(
      `
        INSERT INTO reviews (id, booking_id, reviewer_id, reviewee_id, rating, quality_rating, professionalism_rating, communication_rating, punctuality_rating, comment, response, created_at)
        VALUES (@id, @booking_id, @reviewer_id, @reviewee_id, @rating, @quality_rating, @professionalism_rating, @communication_rating, @punctuality_rating, @comment, @response, @created_at)
      `
    ).run(review);

    if (revieweeId === booking.provider_id) {
      refreshProviderMetrics(revieweeId);
    }

    createNotification({
      userId: revieweeId,
      type: 'review',
      title: 'New review received',
      body: 'A new review has been posted for a recent booking.',
      data: { bookingId: review.booking_id, reviewId: review.id }
    });

    return res.status(201).json({ review });
  }
);

router.get(
  '/provider/:id',
  validate([param('id').notEmpty().withMessage('Provider id is required.')]),
  (req, res) => {
    const db = getDb();
    const reviews = db
      .prepare(
        `
          SELECT r.*, reviewer.first_name || ' ' || reviewer.last_name AS reviewer_name
          FROM reviews r
          JOIN users reviewer ON reviewer.id = r.reviewer_id
          WHERE r.reviewee_id = ?
          ORDER BY r.created_at DESC
        `
      )
      .all(req.params.id);
    return res.json({ reviews });
  }
);

router.put(
  '/:id/respond',
  authenticate,
  validate([
    param('id').notEmpty().withMessage('Review id is required.'),
    body('response').trim().notEmpty().withMessage('response is required.')
  ]),
  (req, res) => {
    if (req.user.role !== 'provider') {
      return res.status(403).json({ message: 'Only providers can respond to reviews.' });
    }

    const db = getDb();
    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    if (review.reviewee_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only respond to your own reviews.' });
    }

    db.prepare('UPDATE reviews SET response = ? WHERE id = ?').run(req.body.response, req.params.id);
    return res.json({ review: db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id) });
  }
);

module.exports = router;
