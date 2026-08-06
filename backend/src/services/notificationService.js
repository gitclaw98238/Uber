const { getDb } = require('../database');
const { generateId, now, serializeJson } = require('../utils/helpers');
const { formatNotification } = require('./bookingService');
const { sendToUser } = require('../websocket');

function createNotification({ userId, type, title, body, data = {} }) {
  const db = getDb();
  const notification = {
    id: generateId(),
    user_id: userId,
    type,
    title,
    body,
    data: serializeJson(data),
    is_read: 0,
    created_at: now()
  };

  db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, body, data, is_read, created_at)
     VALUES (@id, @user_id, @type, @title, @body, @data, @is_read, @created_at)`
  ).run(notification);

  const formatted = formatNotification(notification);
  sendToUser(userId, 'notification', formatted);
  return formatted;
}

module.exports = {
  createNotification
};
