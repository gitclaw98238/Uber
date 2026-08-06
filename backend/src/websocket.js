const path = require('path');
const fs = require('fs');
const { URL } = require('url');
const WebSocket = require('ws');

const { getDb } = require('./database');
const { verifyToken } = require('./middleware/auth');
const { canAccessBooking, getBookingParticipants, addBookingHistory, getBookingById } = require('./services/bookingService');
const { generateId, now } = require('./utils/helpers');

let websocketServer;
const clients = new Map();

function sendPayload(socket, event, payload) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ event, payload, timestamp: now() }));
  }
}

function registerClient(userId, socket) {
  const current = clients.get(userId) || new Set();
  current.add(socket);
  clients.set(userId, current);
}

function unregisterClient(userId, socket) {
  const current = clients.get(userId);
  if (!current) {
    return;
  }
  current.delete(socket);
  if (!current.size) {
    clients.delete(userId);
  }
}

function sendToUser(userId, event, payload) {
  const sockets = clients.get(userId);
  if (!sockets) {
    return;
  }
  sockets.forEach((socket) => sendPayload(socket, event, payload));
}

function broadcastToBooking(bookingId, event, payload) {
  getBookingParticipants(bookingId).forEach((userId) => sendToUser(userId, event, payload));
}

function handleProviderLocationUpdate(socket, payload) {
  if (socket.user.role !== 'provider') {
    sendPayload(socket, 'error', { message: 'Only providers can update live location.' });
    return;
  }

  const { lat, lng } = payload || {};
  const db = getDb();
  db.prepare('UPDATE provider_profiles SET lat = ?, lng = ?, is_online = 1, updated_at = ? WHERE user_id = ?').run(
    lat,
    lng,
    now(),
    socket.user.id
  );
  sendPayload(socket, 'provider_location_updated', { lat, lng });
}

function handleChatMessage(socket, payload) {
  const { bookingId, receiverId, content, messageType = 'text' } = payload || {};
  if (!bookingId || !receiverId || !content) {
    sendPayload(socket, 'error', { message: 'bookingId, receiverId, and content are required.' });
    return;
  }

  if (!canAccessBooking(bookingId, socket.user)) {
    sendPayload(socket, 'error', { message: 'You cannot send messages for this booking.' });
    return;
  }

  const participants = new Set(getBookingParticipants(bookingId));
  if (!participants.has(receiverId)) {
    sendPayload(socket, 'error', { message: 'Receiver is not part of this booking.' });
    return;
  }

  const db = getDb();
  const message = {
    id: generateId(),
    booking_id: bookingId,
    sender_id: socket.user.id,
    receiver_id: receiverId,
    content,
    message_type: messageType,
    is_read: 0,
    created_at: now()
  };

  db.prepare(
    `INSERT INTO messages (id, booking_id, sender_id, receiver_id, content, message_type, is_read, created_at)
     VALUES (@id, @booking_id, @sender_id, @receiver_id, @content, @message_type, @is_read, @created_at)`
  ).run(message);

  sendToUser(receiverId, 'chat_message', message);
  sendToUser(socket.user.id, 'chat_message', message);
}

function handleBookingStatusChange(socket, payload) {
  const { bookingId, status, notes } = payload || {};
  if (!bookingId || !status || !canAccessBooking(bookingId, socket.user)) {
    sendPayload(socket, 'error', { message: 'Invalid booking status update.' });
    return;
  }

  const db = getDb();
  db.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), bookingId);
  addBookingHistory(bookingId, status, socket.user.id, notes || 'Updated via websocket');
  broadcastToBooking(bookingId, 'booking_status_changed', getBookingById(bookingId));
}

function handleNotificationRead(socket, payload) {
  const { notificationId } = payload || {};
  if (!notificationId) {
    sendPayload(socket, 'error', { message: 'notificationId is required.' });
    return;
  }

  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(notificationId, socket.user.id);
  sendPayload(socket, 'notification_read', { notificationId });
}

function initializeWebSocket(server) {
  if (websocketServer) {
    return websocketServer;
  }

  websocketServer = new WebSocket.Server({ server, path: '/ws' });

  websocketServer.on('connection', (socket, request) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const token = url.searchParams.get('token');
      if (!token) {
        socket.close(4001, 'Authentication token missing');
        return;
      }

      const payload = verifyToken(token);
      const db = getDb();
      const user = db.prepare('SELECT id, email, role FROM users WHERE id = ? AND is_active = 1').get(payload.sub);
      if (!user) {
        socket.close(4001, 'Invalid user');
        return;
      }

      socket.user = user;
      registerClient(user.id, socket);
      sendPayload(socket, 'connected', { userId: user.id, role: user.role });

      socket.on('message', (raw) => {
        let message;
        try {
          message = JSON.parse(raw.toString());
        } catch {
          sendPayload(socket, 'error', { message: 'Invalid websocket payload.' });
          return;
        }

        switch (message.type) {
          case 'provider_location_update':
            handleProviderLocationUpdate(socket, message.payload);
            break;
          case 'chat_message':
            handleChatMessage(socket, message.payload);
            break;
          case 'booking_status_change':
            handleBookingStatusChange(socket, message.payload);
            break;
          case 'mark_notification_read':
            handleNotificationRead(socket, message.payload);
            break;
          default:
            sendPayload(socket, 'error', { message: `Unsupported websocket message type: ${message.type}` });
        }
      });

      socket.on('close', () => unregisterClient(user.id, socket));
    } catch {
      socket.close(4001, 'Authentication failed');
    }
  });

  return websocketServer;
}

module.exports = {
  broadcastToBooking,
  initializeWebSocket,
  sendToUser
};
