require('dotenv').config();

const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { initializeDatabase } = require('./database');
const { rateLimit } = require('./middleware/rateLimit');
const { initializeWebSocket } = require('./websocket');

initializeDatabase();

const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const providerRoutes = require('./routes/providers');
const bookingRoutes = require('./routes/bookings');
const quoteRoutes = require('./routes/quotes');
const messageRoutes = require('./routes/messages');
const reviewRoutes = require('./routes/reviews');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const port = Number(process.env.PORT || 3001);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (_req, res) => {
  res.json({
    name: 'Service Marketplace API',
    status: 'ok',
    websocket: '/ws',
    health: '/health'
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  if (res.headersSent) {
    return;
  }
  res.status(error.statusCode || 500).json({
    message: error.message || 'An unexpected error occurred.'
  });
});

initializeWebSocket(server);

server.listen(port, () => {
  console.log(`Service Marketplace API listening on port ${port}`);
});

app.server = server;
module.exports = app;
