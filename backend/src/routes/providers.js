const express = require('express');
const path = require('path');
const multer = require('multer');
const { body, param, query } = require('express-validator');

const { getDb } = require('../database');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { validate } = require('../middleware/validate');
const { createNotification } = require('../services/notificationService');
const { calculateDistanceKm, ensureDirectory, generateId, now, toBoolean } = require('../utils/helpers');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '../../uploads/portfolio');
ensureDirectory(uploadDirectory);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDirectory),
  filename: (_req, file, cb) => cb(null, `${generateId()}${path.extname(file.originalname) || '.bin'}`)
});
const upload = multer({ storage });

function getAvailabilityForTime(providerId, referenceDate = new Date()) {
  const db = getDb();
  const day = referenceDate.getUTCDay();
  const time = referenceDate.toISOString().slice(11, 16);
  const slots = db
    .prepare('SELECT * FROM provider_availability WHERE provider_id = ? AND day_of_week = ? AND is_available = 1')
    .all(providerId, day);
  if (!slots.length) {
    return true;
  }
  return slots.some((slot) => slot.start_time <= time && slot.end_time >= time);
}

function getProviderProfile(providerId) {
  const db = getDb();
  const profile = db
    .prepare(
      `
        SELECT
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.phone,
          u.avatar_url,
          u.is_active,
          u.is_verified AS user_verified,
          pp.business_name,
          pp.description,
          pp.hourly_rate,
          pp.is_online,
          pp.is_verified,
          pp.rating_avg,
          pp.total_jobs,
          pp.service_area_radius,
          pp.lat,
          pp.lng,
          pp.created_at,
          pp.updated_at
        FROM provider_profiles pp
        JOIN users u ON u.id = pp.user_id
        WHERE u.id = ? AND u.role = 'provider'
      `
    )
    .get(providerId);

  if (!profile) {
    return null;
  }

  const services = db
    .prepare(
      `
        SELECT ps.*, sc.name AS category_name, sc.slug AS category_slug
        FROM provider_services ps
        JOIN service_categories sc ON sc.id = ps.category_id
        WHERE ps.provider_id = ?
        ORDER BY sc.sort_order, sc.name
      `
    )
    .all(providerId)
    .map((service) => ({ ...service, is_active: toBoolean(service.is_active) }));

  const availability = db
    .prepare('SELECT * FROM provider_availability WHERE provider_id = ? ORDER BY day_of_week, start_time')
    .all(providerId)
    .map((slot) => ({ ...slot, is_available: toBoolean(slot.is_available) }));

  const portfolio = db
    .prepare('SELECT * FROM provider_portfolio WHERE provider_id = ? ORDER BY created_at DESC')
    .all(providerId);

  const reviewSummary = db
    .prepare('SELECT COUNT(*) AS total_reviews, AVG(rating) AS average_rating FROM reviews WHERE reviewee_id = ?')
    .get(providerId);

  return {
    ...profile,
    is_active: toBoolean(profile.is_active),
    is_online: toBoolean(profile.is_online),
    is_verified: toBoolean(profile.is_verified),
    user_verified: toBoolean(profile.user_verified),
    services,
    availability,
    portfolio,
    total_reviews: reviewSummary.total_reviews,
    average_rating: reviewSummary.average_rating ? Number(reviewSummary.average_rating.toFixed(2)) : 0
  };
}

router.get(
  '/',
  validate([
    query('category').optional().notEmpty(),
    query('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('lat must be valid.'),
    query('lng').optional().isFloat({ min: -180, max: 180 }).withMessage('lng must be valid.'),
    query('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('rating must be between 0 and 5.')
  ]),
  (req, res) => {
    const db = getDb();
    let sql =
      `
        SELECT DISTINCT u.id
        FROM users u
        JOIN provider_profiles pp ON pp.user_id = u.id
        LEFT JOIN provider_services ps ON ps.provider_id = u.id AND ps.is_active = 1
        WHERE u.role = 'provider' AND u.is_active = 1
      `;
    const params = [];

    if (req.query.category) {
      sql += ' AND ps.category_id = ?';
      params.push(req.query.category);
    }

    const providerIds = db.prepare(sql).all(...params).map((row) => row.id);
    const minimumRating = req.query.rating ? Number(req.query.rating) : null;
    const providers = providerIds
      .map((providerId) => getProviderProfile(providerId))
      .filter(Boolean)
      .filter((provider) => {
        if (minimumRating !== null && Number(provider.rating_avg || 0) < minimumRating) {
          return false;
        }
        if (req.query.available === 'true' && (!provider.is_online || !getAvailabilityForTime(provider.id))) {
          return false;
        }
        return true;
      })
      .map((provider) => {
        const distanceKm = calculateDistanceKm(req.query.lat, req.query.lng, provider.lat, provider.lng);
        return {
          ...provider,
          distance_km: distanceKm
        };
      })
      .sort((left, right) => {
        if (left.distance_km !== null && right.distance_km !== null) {
          return left.distance_km - right.distance_km;
        }
        return Number(right.rating_avg || 0) - Number(left.rating_avg || 0);
      });

    return res.json({ providers });
  }
);

router.get(
  '/:id',
  validate([param('id').notEmpty().withMessage('Provider id is required.')]),
  (req, res) => {
    const provider = getProviderProfile(req.params.id);
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found.' });
    }
    return res.json({ provider });
  }
);

router.post(
  '/profile',
  authenticate,
  requireRole('provider'),
  validate([
    body('business_name').optional().trim().notEmpty().withMessage('business_name cannot be empty.'),
    body('description').optional().trim(),
    body('hourly_rate').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('hourly_rate must be non-negative.'),
    body('service_area_radius').optional().isFloat({ min: 1 }).withMessage('service_area_radius must be at least 1 km.'),
    body('lat').optional({ nullable: true }).isFloat({ min: -90, max: 90 }),
    body('lng').optional({ nullable: true }).isFloat({ min: -180, max: 180 })
  ]),
  (req, res) => {
    const db = getDb();
    const current = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(req.user.id);
    const timestamp = now();

    if (!current) {
      db.prepare(
        `
          INSERT INTO provider_profiles (id, user_id, business_name, description, hourly_rate, is_online, is_verified, rating_avg, total_jobs, service_area_radius, lat, lng, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, ?, ?, ?)
        `
      ).run(
        generateId(),
        req.user.id,
        req.body.business_name || `${req.user.first_name} ${req.user.last_name}`,
        req.body.description || '',
        req.body.hourly_rate || null,
        req.body.service_area_radius || 25,
        req.body.lat || null,
        req.body.lng || null,
        timestamp,
        timestamp
      );
    } else {
      db.prepare(
        `
          UPDATE provider_profiles
          SET business_name = ?, description = ?, hourly_rate = ?, service_area_radius = ?, lat = ?, lng = ?, updated_at = ?
          WHERE user_id = ?
        `
      ).run(
        req.body.business_name !== undefined ? req.body.business_name : current.business_name,
        req.body.description !== undefined ? req.body.description : current.description,
        req.body.hourly_rate !== undefined ? req.body.hourly_rate : current.hourly_rate,
        req.body.service_area_radius !== undefined ? req.body.service_area_radius : current.service_area_radius,
        req.body.lat !== undefined ? req.body.lat : current.lat,
        req.body.lng !== undefined ? req.body.lng : current.lng,
        timestamp,
        req.user.id
      );
    }

    return res.json({ provider: getProviderProfile(req.user.id) });
  }
);

router.put(
  '/online',
  authenticate,
  requireRole('provider'),
  validate([body('is_online').isBoolean().withMessage('is_online must be true or false.')]),
  (req, res) => {
    const db = getDb();
    db.prepare('UPDATE provider_profiles SET is_online = ?, updated_at = ? WHERE user_id = ?').run(
      req.body.is_online ? 1 : 0,
      now(),
      req.user.id
    );
    return res.json({ provider: getProviderProfile(req.user.id) });
  }
);

router.post(
  '/services',
  authenticate,
  requireRole('provider'),
  validate([
    body('category_id').notEmpty().withMessage('category_id is required.'),
    body('price_type').isIn(['fixed', 'hourly', 'quote', 'custom']).withMessage('price_type is invalid.'),
    body('fixed_price').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('fixed_price must be non-negative.'),
    body('hourly_rate').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('hourly_rate must be non-negative.'),
    body('description').optional().trim()
  ]),
  (req, res) => {
    const db = getDb();
    const category = db.prepare('SELECT id FROM service_categories WHERE id = ? AND is_active = 1').get(req.body.category_id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    db.prepare(
      `
        INSERT INTO provider_services (id, provider_id, category_id, price_type, fixed_price, hourly_rate, description, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `
    ).run(
      generateId(),
      req.user.id,
      req.body.category_id,
      req.body.price_type,
      req.body.fixed_price || null,
      req.body.hourly_rate || null,
      req.body.description || null
    );

    return res.status(201).json({ provider: getProviderProfile(req.user.id) });
  }
);

router.put(
  '/availability',
  authenticate,
  requireRole('provider'),
  validate([
    body('schedule').isArray({ min: 1 }).withMessage('schedule must be a non-empty array.'),
    body('schedule.*.day_of_week').isInt({ min: 0, max: 6 }).withMessage('day_of_week must be between 0 and 6.'),
    body('schedule.*.start_time').matches(/^\d{2}:\d{2}$/).withMessage('start_time must use HH:MM.'),
    body('schedule.*.end_time').matches(/^\d{2}:\d{2}$/).withMessage('end_time must use HH:MM.'),
    body('schedule.*.is_available').optional().isBoolean().withMessage('is_available must be true or false.')
  ]),
  (req, res) => {
    const db = getDb();
    db.transaction(() => {
      db.prepare('DELETE FROM provider_availability WHERE provider_id = ?').run(req.user.id);
      const insertSlot = db.prepare(
        `
          INSERT INTO provider_availability (id, provider_id, day_of_week, start_time, end_time, is_available)
          VALUES (?, ?, ?, ?, ?, ?)
        `
      );
      req.body.schedule.forEach((slot) => {
        insertSlot.run(
          generateId(),
          req.user.id,
          slot.day_of_week,
          slot.start_time,
          slot.end_time,
          slot.is_available === false ? 0 : 1
        );
      });
    })();

    return res.json({ provider: getProviderProfile(req.user.id) });
  }
);

router.post(
  '/portfolio',
  authenticate,
  requireRole('provider'),
  upload.single('image'),
  validate([body('caption').optional().trim(), body('image_url').optional().isURL().withMessage('image_url must be a valid URL.')]),
  (req, res) => {
    const imageUrl = req.file ? `/uploads/portfolio/${req.file.filename}` : req.body.image_url;
    if (!imageUrl) {
      return res.status(422).json({ message: 'Provide image_url or upload an image file.' });
    }

    const db = getDb();
    const portfolioItem = {
      id: generateId(),
      provider_id: req.user.id,
      image_url: imageUrl,
      caption: req.body.caption || null,
      created_at: now()
    };

    db.prepare(
      `
        INSERT INTO provider_portfolio (id, provider_id, image_url, caption, created_at)
        VALUES (@id, @provider_id, @image_url, @caption, @created_at)
      `
    ).run(portfolioItem);

    return res.status(201).json({ portfolio_item: portfolioItem, provider: getProviderProfile(req.user.id) });
  }
);

router.get('/earnings', authenticate, requireRole('provider'), (req, res) => {
  const db = getDb();
  const summary = db
    .prepare(
      `
        SELECT
          COUNT(*) AS total_payments,
          COALESCE(SUM(provider_amount), 0) AS lifetime_earnings,
          COALESCE(SUM(CASE WHEN substr(created_at, 1, 7) = substr(?, 1, 7) THEN provider_amount ELSE 0 END), 0) AS month_earnings,
          COALESCE(SUM(CASE WHEN status = 'captured' THEN provider_amount ELSE 0 END), 0) AS captured_earnings
        FROM payments
        WHERE provider_id = ?
      `
    )
    .get(now(), req.user.id);
  const activeBookings = db
    .prepare(`SELECT COUNT(*) AS active_jobs FROM bookings WHERE provider_id = ? AND status IN ('accepted', 'provider_en_route', 'provider_arrived', 'job_started', 'payment_pending')`)
    .get(req.user.id);

  return res.json({
    earnings: {
      ...summary,
      active_jobs: activeBookings.active_jobs
    }
  });
});

router.get('/dashboard', authenticate, requireRole('provider'), (req, res) => {
  const db = getDb();
  const bookingStats = db
    .prepare(
      `
        SELECT status, COUNT(*) AS total
        FROM bookings
        WHERE provider_id = ?
        GROUP BY status
      `
    )
    .all(req.user.id);
  const pendingQuotes = db.prepare('SELECT COUNT(*) AS total FROM quotes WHERE provider_id = ? AND status = ?').get(req.user.id, 'pending');
  const unreadNotifications = db.prepare('SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id);
  const recentBookings = db
    .prepare(
      `
        SELECT b.id, b.status, b.description, b.scheduled_at, c.first_name || ' ' || c.last_name AS customer_name
        FROM bookings b
        JOIN users c ON c.id = b.customer_id
        WHERE b.provider_id = ?
        ORDER BY b.updated_at DESC
        LIMIT 5
      `
    )
    .all(req.user.id);

  return res.json({
    provider: getProviderProfile(req.user.id),
    stats: bookingStats,
    pending_quotes: pendingQuotes.total,
    unread_notifications: unreadNotifications.total,
    recent_bookings: recentBookings
  });
});

module.exports = router;
