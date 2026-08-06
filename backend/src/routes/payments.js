const express = require('express');
const { body } = require('express-validator');

const { getDb } = require('../database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createNotification } = require('../services/notificationService');
const { generateId, now } = require('../utils/helpers');
const { getBookingById, setBookingStatus } = require('../services/bookingService');

const router = express.Router();

function getPlatformFeePercent() {
  const db = getDb();
  const setting = db.prepare('SELECT value FROM platform_settings WHERE key = ?').get('platform_fee_percent');
  return Number(setting?.value || 0.15);
}

router.post(
  '/authorize',
  authenticate,
  validate([
    body('booking_id').notEmpty().withMessage('booking_id is required.'),
    body('amount').optional({ nullable: true }).isFloat({ min: 0.01 }).withMessage('amount must be greater than zero.'),
    body('payment_method').optional().trim()
  ]),
  (req, res) => {
    const booking = getBookingById(req.body.booking_id);
    if (!booking || booking.customer_id !== req.user.id) {
      return res.status(403).json({ message: 'Only the booking customer can authorize payment.' });
    }

    const amount = Number(req.body.amount || booking.final_price || booking.estimated_price || 0);
    if (!amount) {
      return res.status(422).json({ message: 'A positive payment amount is required.' });
    }

    const feePercent = getPlatformFeePercent();
    const platformFee = Number((amount * feePercent).toFixed(2));
    const providerAmount = Number((amount - platformFee).toFixed(2));
    const payment = {
      id: generateId(),
      booking_id: booking.id,
      customer_id: req.user.id,
      provider_id: booking.provider_id,
      amount,
      platform_fee: platformFee,
      provider_amount: providerAmount,
      status: 'authorized',
      payment_method: req.body.payment_method || 'card_on_file',
      transaction_id: `auth_${generateId()}`,
      created_at: now()
    };

    const db = getDb();
    db.prepare(
      `
        INSERT INTO payments (id, booking_id, customer_id, provider_id, amount, platform_fee, provider_amount, status, payment_method, transaction_id, created_at)
        VALUES (@id, @booking_id, @customer_id, @provider_id, @amount, @platform_fee, @provider_amount, @status, @payment_method, @transaction_id, @created_at)
      `
    ).run(payment);

    if (booking.status === 'job_completed') {
      setBookingStatus(booking.id, 'payment_pending', req.user.id, 'Payment authorized and pending capture');
    }

    return res.status(201).json({ payment });
  }
);

router.post(
  '/capture',
  authenticate,
  validate([body('booking_id').notEmpty().withMessage('booking_id is required.')]),
  (req, res) => {
    const db = getDb();
    const booking = getBookingById(req.body.booking_id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (![booking.customer_id, booking.provider_id].includes(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You cannot capture payment for this booking.' });
    }

    const payment = db
      .prepare(
        `
          SELECT * FROM payments
          WHERE booking_id = ? AND status = 'authorized'
          ORDER BY created_at DESC
          LIMIT 1
        `
      )
      .get(req.body.booking_id);

    if (!payment) {
      return res.status(404).json({ message: 'No authorized payment found.' });
    }

    db.prepare('UPDATE payments SET status = ? WHERE id = ?').run('captured', payment.id);
    const updatedBooking = setBookingStatus(req.body.booking_id, 'paid', req.user.id, 'Payment captured', {
      final_price: booking.final_price || payment.amount,
      platform_fee: payment.platform_fee,
      provider_earnings: payment.provider_amount
    });

    createNotification({
      userId: booking.customer_id,
      type: 'payment_captured',
      title: 'Payment captured',
      body: 'Your payment was successfully captured.',
      data: { bookingId: booking.id, paymentId: payment.id }
    });
    if (booking.provider_id) {
      createNotification({
        userId: booking.provider_id,
        type: 'payment_captured',
        title: 'Payout recorded',
        body: 'Payment for your booking has been captured.',
        data: { bookingId: booking.id, paymentId: payment.id }
      });
    }

    return res.json({ payment: db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id), booking: updatedBooking });
  }
);

router.post(
  '/refund',
  authenticate,
  validate([body('booking_id').notEmpty().withMessage('booking_id is required.')]),
  (req, res) => {
    const db = getDb();
    const booking = getBookingById(req.body.booking_id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (req.user.role !== 'admin' && booking.customer_id !== req.user.id) {
      return res.status(403).json({ message: 'Only the customer or an admin can refund this booking.' });
    }

    const payment = db
      .prepare(
        `
          SELECT * FROM payments
          WHERE booking_id = ? AND status IN ('authorized', 'captured')
          ORDER BY created_at DESC
          LIMIT 1
        `
      )
      .get(req.body.booking_id);

    if (!payment) {
      return res.status(404).json({ message: 'No refundable payment found.' });
    }

    db.prepare('UPDATE payments SET status = ? WHERE id = ?').run('refunded', payment.id);
    if (booking.provider_id) {
      createNotification({
        userId: booking.provider_id,
        type: 'payment_refunded',
        title: 'Payment refunded',
        body: 'A payment for one of your bookings was refunded.',
        data: { bookingId: booking.id, paymentId: payment.id }
      });
    }

    return res.json({ payment: db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id) });
  }
);

router.get('/methods', authenticate, (_req, res) => {
  return res.json({
    methods: [
      {
        id: 'pm_demo_visa',
        brand: 'visa',
        last4: '4242',
        expiry_month: 12,
        expiry_year: 2030,
        is_default: true
      }
    ]
  });
});

module.exports = router;
