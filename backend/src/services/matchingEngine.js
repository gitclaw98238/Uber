const { DEFAULT_SETTINGS, getDb } = require('../database');
const { sendToUser } = require('../websocket');
const { calculateDistanceKm, generateId, now } = require('../utils/helpers');
const {
  ACTIVE_BOOKING_STATUSES,
  TERMINAL_BOOKING_STATUSES,
  addBookingHistory,
  getBookingById
} = require('./bookingService');
const { createNotification } = require('./notificationService');

const offerTimers = new Map();

function getMatchingConfig() {
  const db = getDb();
  const keys = Object.keys(DEFAULT_SETTINGS);
  const placeholders = keys.map(() => '?').join(', ');
  const rows = db
    .prepare(`SELECT key, value FROM platform_settings WHERE key IN (${placeholders})`)
    .all(...keys);

  const config = { ...DEFAULT_SETTINGS };
  rows.forEach((row) => {
    config[row.key] = row.value;
  });

  return {
    platformFeePercent: Number(config.platform_fee_percent),
    timeoutSeconds: Number(config.matching_offer_timeout_seconds),
    weights: {
      service: Number(config.matching_weight_service),
      availability: Number(config.matching_weight_availability),
      proximity: Number(config.matching_weight_proximity),
      rating: Number(config.matching_weight_rating),
      reliability: Number(config.matching_weight_reliability),
      workload: Number(config.matching_weight_workload)
    }
  };
}

function isProviderAvailable(providerId, scheduledAt) {
  const db = getDb();
  const targetDate = scheduledAt ? new Date(scheduledAt) : new Date();
  const day = targetDate.getUTCDay();
  const time = targetDate.toISOString().slice(11, 16);
  const slots = db
    .prepare(
      `SELECT * FROM provider_availability
       WHERE provider_id = ? AND day_of_week = ? AND is_available = 1`
    )
    .all(providerId, day);

  if (!slots.length) {
    return true;
  }

  return slots.some((slot) => slot.start_time <= time && slot.end_time >= time);
}

function getProviderStats(providerId) {
  const db = getDb();
  const reliability = db
    .prepare(
      `
        SELECT
          SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted_count,
          COUNT(*) AS total_count
        FROM booking_responses
        WHERE provider_id = ?
      `
    )
    .get(providerId);

  const workloadPlaceholders = ACTIVE_BOOKING_STATUSES.map(() => '?').join(', ');
  const workload = db
    .prepare(
      `SELECT COUNT(*) AS active_jobs FROM bookings WHERE provider_id = ? AND status IN (${workloadPlaceholders})`
    )
    .get(providerId, ...ACTIVE_BOOKING_STATUSES);

  return {
    acceptanceRate: reliability.total_count ? reliability.accepted_count / reliability.total_count : 0.6,
    activeJobs: workload.active_jobs || 0
  };
}

function rankProvidersForBooking(bookingId) {
  const db = getDb();
  const booking = getBookingById(bookingId);
  if (!booking) {
    return [];
  }

  const config = getMatchingConfig();
  const seenProviders = new Set(
    db
      .prepare('SELECT provider_id FROM booking_responses WHERE booking_id = ?')
      .all(bookingId)
      .map((row) => row.provider_id)
  );

  const providers = db
    .prepare(
      `
        SELECT DISTINCT
          u.id AS provider_id,
          u.first_name,
          u.last_name,
          pp.business_name,
          pp.description,
          pp.hourly_rate,
          pp.is_online,
          pp.is_verified,
          pp.rating_avg,
          pp.total_jobs,
          pp.service_area_radius,
          pp.lat,
          pp.lng
        FROM provider_profiles pp
        JOIN users u ON u.id = pp.user_id
        JOIN provider_services ps ON ps.provider_id = u.id AND ps.category_id = ? AND ps.is_active = 1
        WHERE u.role = 'provider' AND u.is_active = 1 AND pp.is_online = 1
      `
    )
    .all(booking.category_id);

  return providers
    .filter((provider) => !seenProviders.has(provider.provider_id))
    .map((provider) => {
      const available = isProviderAvailable(provider.provider_id, booking.scheduled_at);
      if (!available) {
        return null;
      }

      const distanceKm = calculateDistanceKm(booking.lat, booking.lng, provider.lat, provider.lng);
      const maxRadius = Number(provider.service_area_radius || 25);
      if (distanceKm !== null && maxRadius > 0 && distanceKm > maxRadius) {
        return null;
      }

      const stats = getProviderStats(provider.provider_id);
      const proximityScore = distanceKm === null ? 0.5 : Math.max(0, 1 - distanceKm / Math.max(maxRadius, 1));
      const ratingScore = Math.min(1, Number(provider.rating_avg || 0) / 5);
      const workloadScore = 1 / (1 + stats.activeJobs);
      const availabilityScore = provider.is_online && available ? 1 : 0;
      const serviceScore = 1;
      const reliabilityScore = stats.acceptanceRate;

      const totalWeight = Object.values(config.weights).reduce((sum, value) => sum + value, 0);
      const weightedScore =
        serviceScore * config.weights.service +
        availabilityScore * config.weights.availability +
        proximityScore * config.weights.proximity +
        ratingScore * config.weights.rating +
        reliabilityScore * config.weights.reliability +
        workloadScore * config.weights.workload;

      return {
        provider_id: provider.provider_id,
        provider_name: provider.business_name || `${provider.first_name} ${provider.last_name}`,
        distance_km: distanceKm,
        rating: Number(provider.rating_avg || 0),
        workload: stats.activeJobs,
        score: Number((weightedScore / totalWeight).toFixed(4))
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

function clearOfferTimer(bookingId) {
  const existing = offerTimers.get(bookingId);
  if (existing) {
    clearTimeout(existing.timeoutId);
    offerTimers.delete(bookingId);
  }
}

function offerBookingToProvider(bookingId, candidate) {
  const db = getDb();
  const timestamp = now();
  db.transaction(() => {
    db.prepare(
      `
        INSERT INTO booking_responses (id, booking_id, provider_id, status, offered_at, responded_at)
        VALUES (?, ?, ?, 'pending', ?, NULL)
        ON CONFLICT(booking_id, provider_id) DO UPDATE SET status = 'pending', offered_at = excluded.offered_at, responded_at = NULL
      `
    ).run(generateId(), bookingId, candidate.provider_id, timestamp);

    db.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?').run('offered', timestamp, bookingId);
  })();

  addBookingHistory(bookingId, 'offered', null, `Offer sent to ${candidate.provider_name}`);
  const booking = getBookingById(bookingId);

  sendToUser(candidate.provider_id, 'new_booking_request', {
    booking,
    score: candidate.score,
    distance_km: candidate.distance_km
  });

  createNotification({
    userId: candidate.provider_id,
    type: 'booking_offer',
    title: 'New booking request',
    body: `A new ${booking.category_name} request is ready for review.`,
    data: { bookingId, score: candidate.score }
  });

  clearOfferTimer(bookingId);
  const timeoutMs = getMatchingConfig().timeoutSeconds * 1000;
  const timeoutId = setTimeout(() => {
    expireCurrentOffer(bookingId, candidate.provider_id);
  }, timeoutMs);
  offerTimers.set(bookingId, { providerId: candidate.provider_id, timeoutId });

  return {
    offered_to: candidate.provider_id,
    score: candidate.score,
    distance_km: candidate.distance_km
  };
}

function startMatchingForBooking(bookingId) {
  const db = getDb();
  const booking = getBookingById(bookingId);
  if (!booking || TERMINAL_BOOKING_STATUSES.includes(booking.status) || booking.provider_id) {
    return { matched: false };
  }

  if (booking.status === 'requested') {
    db.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?').run('searching', now(), bookingId);
    addBookingHistory(bookingId, 'searching', null, 'Searching for matching providers');
  }

  const rankedProviders = rankProvidersForBooking(bookingId);
  if (!rankedProviders.length) {
    createNotification({
      userId: booking.customer_id,
      type: 'matching_update',
      title: 'No providers available yet',
      body: 'We are still searching for available providers in your area.',
      data: { bookingId }
    });
    return { matched: false, providers_considered: 0 };
  }

  return {
    matched: true,
    providers_considered: rankedProviders.length,
    ...offerBookingToProvider(bookingId, rankedProviders[0])
  };
}

function offerNextProvider(bookingId) {
  clearOfferTimer(bookingId);
  const booking = getBookingById(bookingId);
  if (!booking || booking.provider_id || TERMINAL_BOOKING_STATUSES.includes(booking.status)) {
    return { matched: false };
  }

  const rankedProviders = rankProvidersForBooking(bookingId);
  if (!rankedProviders.length) {
    const db = getDb();
    db.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?').run('searching', now(), bookingId);
    addBookingHistory(bookingId, 'searching', null, 'No providers accepted the request yet');
    createNotification({
      userId: booking.customer_id,
      type: 'matching_update',
      title: 'Still searching',
      body: 'We are continuing to search for another provider for your booking.',
      data: { bookingId }
    });
    return { matched: false };
  }

  return {
    matched: true,
    providers_considered: rankedProviders.length,
    ...offerBookingToProvider(bookingId, rankedProviders[0])
  };
}

function expireCurrentOffer(bookingId, providerId) {
  const db = getDb();
  const response = db
    .prepare('SELECT * FROM booking_responses WHERE booking_id = ? AND provider_id = ? AND status = ?')
    .get(bookingId, providerId, 'pending');

  if (!response) {
    return;
  }

  db.prepare('UPDATE booking_responses SET status = ?, responded_at = ? WHERE id = ?').run('expired', now(), response.id);
  addBookingHistory(bookingId, 'searching', null, `Offer expired for provider ${providerId}`);
  createNotification({
    userId: providerId,
    type: 'booking_offer_expired',
    title: 'Booking offer expired',
    body: 'The booking offer expired before a response was received.',
    data: { bookingId }
  });

  offerNextProvider(bookingId);
}

function handleProviderResponse(bookingId, providerId, decision) {
  const db = getDb();
  const response = db
    .prepare('SELECT * FROM booking_responses WHERE booking_id = ? AND provider_id = ?')
    .get(bookingId, providerId);

  if (!response || response.status !== 'pending') {
    throw new Error('No active booking offer found for this provider.');
  }

  clearOfferTimer(bookingId);
  const timestamp = now();
  const booking = getBookingById(bookingId);

  if (decision === 'accepted') {
    db.transaction(() => {
      db.prepare('UPDATE booking_responses SET status = ?, responded_at = ? WHERE id = ?').run('accepted', timestamp, response.id);
      db.prepare(
        `UPDATE booking_responses
         SET status = 'expired', responded_at = ?
         WHERE booking_id = ? AND provider_id != ? AND status = 'pending'`
      ).run(timestamp, bookingId, providerId);
      db.prepare('UPDATE bookings SET provider_id = ?, status = ?, updated_at = ? WHERE id = ?').run(
        providerId,
        'accepted',
        timestamp,
        bookingId
      );
    })();

    addBookingHistory(bookingId, 'accepted', providerId, 'Provider accepted the booking');
    createNotification({
      userId: booking.customer_id,
      type: 'booking_accepted',
      title: 'Provider confirmed',
      body: 'A provider accepted your booking request.',
      data: { bookingId, providerId }
    });
    createNotification({
      userId: providerId,
      type: 'booking_assigned',
      title: 'Booking assigned',
      body: 'You have been assigned to this booking.',
      data: { bookingId }
    });

    return getBookingById(bookingId);
  }

  db.prepare('UPDATE booking_responses SET status = ?, responded_at = ? WHERE id = ?').run('declined', timestamp, response.id);
  addBookingHistory(bookingId, 'searching', providerId, 'Provider declined the booking');
  return offerNextProvider(bookingId);
}

module.exports = {
  clearOfferTimer,
  getMatchingConfig,
  handleProviderResponse,
  rankProvidersForBooking,
  startMatchingForBooking
};
