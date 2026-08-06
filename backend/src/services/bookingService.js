const { getDb } = require('../database');
const { generateId, now, parseJson, toBoolean } = require('../utils/helpers');

const ACTIVE_BOOKING_STATUSES = ['accepted', 'provider_en_route', 'provider_arrived', 'job_started', 'payment_pending'];
const TERMINAL_BOOKING_STATUSES = ['paid', 'cancelled'];

function formatBooking(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    metadata: parseJson(row.metadata, {}),
    customer_name: row.customer_name || null,
    provider_name: row.provider_name || null
  };
}

function getBookingById(bookingId) {
  const db = getDb();
  const row = db
    .prepare(
      `
        SELECT
          b.*,
          c.first_name || ' ' || c.last_name AS customer_name,
          p.first_name || ' ' || p.last_name AS provider_name,
          sc.name AS category_name
        FROM bookings b
        JOIN users c ON c.id = b.customer_id
        LEFT JOIN users p ON p.id = b.provider_id
        JOIN service_categories sc ON sc.id = b.category_id
        WHERE b.id = ?
      `
    )
    .get(bookingId);

  return formatBooking(row);
}

function addBookingHistory(bookingId, status, changedBy = null, notes = null) {
  const db = getDb();
  db.prepare(
    `INSERT INTO booking_status_history (id, booking_id, status, changed_by, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(generateId(), bookingId, status, changedBy, notes, now());
}

function setBookingStatus(bookingId, status, changedBy = null, notes = null, extraFields = {}) {
  const db = getDb();
  const timestamp = now();
  const setClauses = ['status = @status', 'updated_at = @updated_at'];
  const params = {
    id: bookingId,
    status,
    updated_at: timestamp
  };

  Object.entries(extraFields).forEach(([key, value]) => {
    setClauses.push(`${key} = @${key}`);
    params[key] = value;
  });

  db.prepare(`UPDATE bookings SET ${setClauses.join(', ')} WHERE id = @id`).run(params);
  addBookingHistory(bookingId, status, changedBy, notes);
  return getBookingById(bookingId);
}

function canAccessBooking(bookingId, user) {
  if (!user) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  const db = getDb();
  const result = db
    .prepare(
      `
        SELECT 1
        FROM bookings b
        LEFT JOIN booking_responses br ON br.booking_id = b.id
        WHERE b.id = ?
          AND (
            b.customer_id = ?
            OR b.provider_id = ?
            OR br.provider_id = ?
          )
        LIMIT 1
      `
    )
    .get(bookingId, user.id, user.id, user.id);

  return Boolean(result);
}

function getBookingParticipants(bookingId) {
  const db = getDb();
  const booking = db.prepare('SELECT customer_id, provider_id FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) {
    return [];
  }

  const providers = db
    .prepare('SELECT provider_id FROM booking_responses WHERE booking_id = ?')
    .all(bookingId)
    .map((row) => row.provider_id);

  return Array.from(new Set([booking.customer_id, booking.provider_id, ...providers].filter(Boolean)));
}

function formatNotification(row) {
  if (!row) {
    return null;
  }
  return {
    ...row,
    data: parseJson(row.data, {}),
    is_read: toBoolean(row.is_read)
  };
}

module.exports = {
  ACTIVE_BOOKING_STATUSES,
  TERMINAL_BOOKING_STATUSES,
  addBookingHistory,
  canAccessBooking,
  formatBooking,
  formatNotification,
  getBookingById,
  getBookingParticipants,
  setBookingStatus
};
