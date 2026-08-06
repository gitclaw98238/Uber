const request = require('supertest');
const path = require('path');
const fs = require('fs');

const testDbPath = path.join(__dirname, '..', 'data', 'test-run.sqlite');
try { fs.unlinkSync(testDbPath); } catch(e) {}
try { fs.unlinkSync(testDbPath + '-wal'); } catch(e) {}
try { fs.unlinkSync(testDbPath + '-shm'); } catch(e) {}

process.env.DATABASE_PATH = testDbPath;
process.env.PORT = '3099';
process.env.JWT_SECRET = 'test-secret-key-for-testing';

const app = require('../src/index.js');
const { getDb } = require('../src/database/index.js');

let customerToken, providerToken, adminToken;
let categoryId, bookingId;

function auth(token) { return 'Bearer ' + token; }

afterAll(async () => {
  if (app.server) app.server.close();
  await new Promise(r => setTimeout(r, 200));
  try { fs.unlinkSync(testDbPath); } catch(e) {}
  try { fs.unlinkSync(testDbPath + '-wal'); } catch(e) {}
  try { fs.unlinkSync(testDbPath + '-shm'); } catch(e) {}
});

describe('Auth', () => {
  test('Register customer', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'cust@test.com', password: 'password123', first_name: 'Test', last_name: 'Customer', role: 'customer' });
    expect(res.status).toBe(201);
    customerToken = res.body.token;
  });

  test('Register provider', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'prov@test.com', password: 'password123', first_name: 'Test', last_name: 'Provider', role: 'provider' });
    expect(res.status).toBe(201);
    providerToken = res.body.token;
  });

  test('Setup admin', async () => {
    await request(app).post('/api/auth/register')
      .send({ email: 'adm@test.com', password: 'password123', first_name: 'Admin', last_name: 'User', role: 'customer' });
    getDb().prepare('UPDATE users SET role = ? WHERE email = ?').run('admin', 'adm@test.com');
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'adm@test.com', password: 'password123' });
    adminToken = res.body.token;
    expect(adminToken).toBeDefined();
  });

  test('Login', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'cust@test.com', password: 'password123' });
    expect(res.status).toBe(200);
  });

  test('Wrong password', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'cust@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('Get me', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', auth(customerToken));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('cust@test.com');
  });

  test('No token = 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('Duplicate = 409', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'cust@test.com', password: 'password123', first_name: 'X', last_name: 'Y', role: 'customer' });
    expect(res.status).toBe(409);
  });
});

describe('Categories', () => {
  test('Admin creates', async () => {
    const res = await request(app).post('/api/categories').set('Authorization', auth(adminToken))
      .send({ name: 'Plumbing', slug: 'plumbing', description: 'Plumbing services', icon: '🔧' });
    expect(res.status).toBe(201);
    categoryId = res.body.category.id;
  });

  test('List', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.categories.length).toBeGreaterThan(0);
  });

  test('Non-admin blocked', async () => {
    const res = await request(app).post('/api/categories').set('Authorization', auth(customerToken))
      .send({ name: 'X', slug: 'x', description: 'x', icon: 'x' });
    expect(res.status).toBe(403);
  });
});

describe('Provider', () => {
  test('Create profile', async () => {
    const res = await request(app).post('/api/providers/profile').set('Authorization', auth(providerToken))
      .send({ business_name: 'Pro Plumbing', description: 'Licensed plumber', hourly_rate: 65, service_area_radius: 15, lat: 40.7128, lng: -74.006 });
    expect([200, 201]).toContain(res.status);
  });

  test('Add service', async () => {
    const res = await request(app).post('/api/providers/services').set('Authorization', auth(providerToken))
      .send({ category_id: categoryId, price_type: 'hourly', hourly_rate: 65, description: 'All plumbing work' });
    expect(res.status).toBe(201);
  });

  test('Go online', async () => {
    const res = await request(app).put('/api/providers/online').set('Authorization', auth(providerToken))
      .send({ is_online: true });
    expect(res.status).toBe(200);
  });

  test('List providers', async () => {
    const res = await request(app).get('/api/providers');
    expect(res.status).toBe(200);
  });
});

describe('Booking Flow', () => {
  test('Create booking', async () => {
    const res = await request(app).post('/api/bookings').set('Authorization', auth(customerToken))
      .send({ category_id: categoryId, description: 'Leaking kitchen faucet needs immediate repair', lat: 40.7128, lng: -74.006, address_text: '123 Main St, NY', urgency: 'asap', price_type: 'hourly' });
    expect(res.status).toBe(201);
    bookingId = res.body.booking.id;
  });

  test('Provider accepts', async () => {
    const res = await request(app).post('/api/bookings/' + bookingId + '/accept').set('Authorization', auth(providerToken));
    expect(res.status).toBe(200);
  });

  test('En route', async () => {
    const res = await request(app).put('/api/bookings/' + bookingId + '/status').set('Authorization', auth(providerToken))
      .send({ status: 'provider_en_route' });
    expect(res.status).toBe(200);
  });

  test('Arrived', async () => {
    const res = await request(app).put('/api/bookings/' + bookingId + '/status').set('Authorization', auth(providerToken))
      .send({ status: 'provider_arrived' });
    expect(res.status).toBe(200);
  });

  test('Job started', async () => {
    const res = await request(app).put('/api/bookings/' + bookingId + '/status').set('Authorization', auth(providerToken))
      .send({ status: 'job_started' });
    expect(res.status).toBe(200);
  });

  test('Job completed', async () => {
    const res = await request(app).put('/api/bookings/' + bookingId + '/status').set('Authorization', auth(providerToken))
      .send({ status: 'job_completed' });
    expect(res.status).toBe(200);
  });

  test('Get details', async () => {
    const res = await request(app).get('/api/bookings/' + bookingId).set('Authorization', auth(customerToken));
    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('job_completed');
  });

  test('Timeline', async () => {
    const res = await request(app).get('/api/bookings/' + bookingId + '/timeline').set('Authorization', auth(customerToken));
    expect(res.status).toBe(200);
  });
});

describe('Messages', () => {
  test('Send', async () => {
    // Get provider user id from booking
    const bRes = await request(app).get('/api/bookings/' + bookingId).set('Authorization', auth(customerToken));
    const providerId = bRes.body.booking.provider_id;
    const res = await request(app).post('/api/messages').set('Authorization', auth(customerToken))
      .send({ booking_id: bookingId, receiver_id: providerId, content: 'Hello there!' });
    expect(res.status).toBe(201);
  });

  test('Get', async () => {
    const res = await request(app).get('/api/messages/booking/' + bookingId).set('Authorization', auth(customerToken));
    expect(res.status).toBe(200);
  });
});

describe('Payments', () => {
  test('Authorize', async () => {
    const res = await request(app).post('/api/payments/authorize').set('Authorization', auth(customerToken))
      .send({ booking_id: bookingId, amount: 77, payment_method: 'card_test' });
    expect(res.status).toBe(201);
  });

  test('Capture', async () => {
    const res = await request(app).post('/api/payments/capture').set('Authorization', auth(customerToken))
      .send({ booking_id: bookingId });
    expect(res.status).toBe(200);
  });
});

describe('Reviews', () => {
  test('Submit review', async () => {
    const res = await request(app).post('/api/reviews').set('Authorization', auth(customerToken))
      .send({ booking_id: bookingId, rating: 5, quality_rating: 5, professionalism_rating: 5, communication_rating: 5, punctuality_rating: 5, comment: 'Excellent work done!' });
    expect(res.status).toBe(201);
  });
});

describe('Admin', () => {
  test('Dashboard', async () => {
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.metrics).toBeDefined();
  });

  test('Users list', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);
  });

  test('Non-admin blocked', async () => {
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', auth(customerToken));
    expect(res.status).toBe(403);
  });
});

describe('Cancellation', () => {
  test('Cancel booking', async () => {
    const res1 = await request(app).post('/api/bookings').set('Authorization', auth(customerToken))
      .send({ category_id: categoryId, description: 'Another plumbing job that needs attention', lat: 40.7, lng: -74.0, address_text: '456 St', urgency: 'asap', price_type: 'hourly' });
    expect(res1.status).toBe(201);
    const id = res1.body.booking.id;
    const res2 = await request(app).post('/api/bookings/' + id + '/cancel').set('Authorization', auth(customerToken))
      .send({ reason: 'Changed my mind' });
    expect(res2.status).toBe(200);
  });
});

describe('Notifications', () => {
  test('Get', async () => {
    const res = await request(app).get('/api/notifications').set('Authorization', auth(customerToken));
    expect(res.status).toBe(200);
  });
});
