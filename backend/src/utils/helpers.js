const fs = require('fs');
const { randomUUID } = require('crypto');

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function generateId() {
  return randomUUID();
}

function now() {
  return new Date().toISOString();
}

function parseJson(value, fallback = null) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function serializeJson(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return JSON.stringify(value);
}

function toBoolean(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }
  const { password_hash, ...safeUser } = user;
  safeUser.is_active = toBoolean(safeUser.is_active);
  safeUser.is_verified = toBoolean(safeUser.is_verified);
  return safeUser;
}

function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  const coords = [lat1, lng1, lat2, lng2];
  if (coords.some((value) => value === null || value === undefined || Number.isNaN(Number(value)))) {
    return null;
  }

  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((earthRadiusKm * c).toFixed(2));
}

function pick(source, allowedKeys) {
  return allowedKeys.reduce((result, key) => {
    if (source[key] !== undefined) {
      result[key] = source[key];
    }
    return result;
  }, {});
}

module.exports = {
  calculateDistanceKm,
  ensureDirectory,
  generateId,
  now,
  parseJson,
  pick,
  sanitizeUser,
  serializeJson,
  toBoolean
};
