const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const { ensureDirectory, now } = require('../utils/helpers');

const DATA_DIR = path.join(__dirname, '../../data');
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'service-marketplace.sqlite');

let db;

const DEFAULT_SETTINGS = {
  platform_fee_percent: '0.15',
  matching_weight_service: '0.30',
  matching_weight_availability: '0.20',
  matching_weight_proximity: '0.20',
  matching_weight_rating: '0.15',
  matching_weight_reliability: '0.10',
  matching_weight_workload: '0.05',
  matching_offer_timeout_seconds: '30'
};

function applyDefaultSettings(database) {
  const statement = database.prepare(
    'INSERT INTO platform_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO NOTHING'
  );
  const timestamp = now();
  const insertMany = database.transaction(() => {
    Object.entries(DEFAULT_SETTINGS).forEach(([key, value]) => statement.run(key, value, timestamp));
  });
  insertMany();
}

function getDb() {
  if (!db) {
    ensureDirectory(DATA_DIR);
    db = new Database(DATABASE_PATH);
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
  }
  return db;
}

function initializeDatabase() {
  const database = getDb();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  database.exec(schema);
  applyDefaultSettings(database);
  return database;
}

module.exports = {
  DATABASE_PATH,
  DEFAULT_SETTINGS,
  getDb,
  initializeDatabase
};
