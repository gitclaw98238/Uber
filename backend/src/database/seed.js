require('dotenv').config();

const bcrypt = require('bcryptjs');

const { initializeDatabase } = require('./index');
const { now, serializeJson } = require('../utils/helpers');

const db = initializeDatabase();
const timestamp = now();

const categories = [
  {
    id: 'cat-home-cleaning',
    name: 'Home Cleaning',
    slug: 'home-cleaning',
    description: 'Residential and apartment cleaning services.',
    icon: 'sparkles',
    sort_order: 1,
    questions: [
      { question_text: 'How many bedrooms need cleaning?', question_type: 'number', options: [], is_required: true },
      { question_text: 'Do you need deep cleaning?', question_type: 'select', options: ['No', 'Yes'], is_required: true }
    ]
  },
  {
    id: 'cat-plumbing',
    name: 'Plumbing',
    slug: 'plumbing',
    description: 'Repairs, installations, and inspections for plumbing issues.',
    icon: 'droplet',
    sort_order: 2,
    questions: [
      { question_text: 'What plumbing issue do you have?', question_type: 'text', options: [], is_required: true },
      { question_text: 'Is there an active leak?', question_type: 'select', options: ['No', 'Yes'], is_required: true }
    ]
  },
  {
    id: 'cat-electrical',
    name: 'Electrical',
    slug: 'electrical',
    description: 'Electrical troubleshooting, rewiring, and fixture installation.',
    icon: 'zap',
    sort_order: 3,
    questions: [
      { question_text: 'What needs electrical work?', question_type: 'text', options: [], is_required: true },
      { question_text: 'Is the power currently off?', question_type: 'select', options: ['No', 'Yes'], is_required: false }
    ]
  },
  {
    id: 'cat-handyman',
    name: 'Handyman',
    slug: 'handyman',
    description: 'General repairs and installations around the home.',
    icon: 'hammer',
    sort_order: 4,
    questions: [
      { question_text: 'What project do you need help with?', question_type: 'text', options: [], is_required: true },
      { question_text: 'Estimated task duration in hours?', question_type: 'number', options: [], is_required: false }
    ]
  },
  {
    id: 'cat-lawn-care',
    name: 'Lawn Care',
    slug: 'lawn-care',
    description: 'Mowing, trimming, and landscaping support.',
    icon: 'leaf',
    sort_order: 5,
    questions: [
      { question_text: 'What size is your yard?', question_type: 'select', options: ['Small', 'Medium', 'Large'], is_required: true },
      { question_text: 'Do you need weed treatment?', question_type: 'select', options: ['No', 'Yes'], is_required: false }
    ]
  },
  {
    id: 'cat-moving',
    name: 'Moving Help',
    slug: 'moving-help',
    description: 'Local movers and loading assistance.',
    icon: 'truck',
    sort_order: 6,
    questions: [
      { question_text: 'How many rooms are being moved?', question_type: 'number', options: [], is_required: true },
      { question_text: 'Do you need packing help?', question_type: 'select', options: ['No', 'Yes'], is_required: false }
    ]
  },
  {
    id: 'cat-pet-care',
    name: 'Pet Care',
    slug: 'pet-care',
    description: 'Walking, sitting, and drop-in visits.',
    icon: 'paw-print',
    sort_order: 7,
    questions: [
      { question_text: 'What type of pet do you have?', question_type: 'select', options: ['Dog', 'Cat', 'Bird', 'Other'], is_required: true },
      { question_text: 'How many pets need care?', question_type: 'number', options: [], is_required: true }
    ]
  },
  {
    id: 'cat-tutoring',
    name: 'Tutoring',
    slug: 'tutoring',
    description: 'Academic and skills tutoring sessions.',
    icon: 'book-open',
    sort_order: 8,
    questions: [
      { question_text: 'Which subject do you need help with?', question_type: 'text', options: [], is_required: true },
      { question_text: 'What grade or level?', question_type: 'text', options: [], is_required: true }
    ]
  },
  {
    id: 'cat-beauty',
    name: 'Beauty & Wellness',
    slug: 'beauty-wellness',
    description: 'Makeup, hair, and at-home wellness sessions.',
    icon: 'heart-handshake',
    sort_order: 9,
    questions: [
      { question_text: 'What service do you need?', question_type: 'text', options: [], is_required: true },
      { question_text: 'Preferred appointment date?', question_type: 'date', options: [], is_required: false }
    ]
  },
  {
    id: 'cat-car-wash',
    name: 'Mobile Car Wash',
    slug: 'mobile-car-wash',
    description: 'Exterior and interior mobile car detailing.',
    icon: 'car',
    sort_order: 10,
    questions: [
      { question_text: 'Vehicle type?', question_type: 'select', options: ['Sedan', 'SUV', 'Truck', 'Van'], is_required: true },
      { question_text: 'Need interior detailing?', question_type: 'select', options: ['No', 'Yes'], is_required: false }
    ]
  }
];

const users = [
  {
    id: 'user-admin',
    email: 'admin@servicemarket.com',
    password: 'admin123',
    role: 'admin',
    first_name: 'Service',
    last_name: 'Admin',
    phone: '+15550000001',
    avatar_url: null,
    is_verified: 1
  },
  {
    id: 'provider-jane',
    email: 'jane.cleaner@servicemarket.com',
    password: 'provider123',
    role: 'provider',
    first_name: 'Jane',
    last_name: 'Cleaner',
    phone: '+15550000011',
    avatar_url: null,
    is_verified: 1
  },
  {
    id: 'provider-mike',
    email: 'mike.plumber@servicemarket.com',
    password: 'provider123',
    role: 'provider',
    first_name: 'Mike',
    last_name: 'Plumber',
    phone: '+15550000012',
    avatar_url: null,
    is_verified: 1
  },
  {
    id: 'provider-lucia',
    email: 'lucia.spark@servicemarket.com',
    password: 'provider123',
    role: 'provider',
    first_name: 'Lucia',
    last_name: 'Spark',
    phone: '+15550000013',
    avatar_url: null,
    is_verified: 1
  },
  {
    id: 'customer-chris',
    email: 'chris.customer@servicemarket.com',
    password: 'customer123',
    role: 'customer',
    first_name: 'Chris',
    last_name: 'Taylor',
    phone: '+15550000021',
    avatar_url: null,
    is_verified: 1
  },
  {
    id: 'customer-sam',
    email: 'sam.customer@servicemarket.com',
    password: 'customer123',
    role: 'customer',
    first_name: 'Sam',
    last_name: 'Morgan',
    phone: '+15550000022',
    avatar_url: null,
    is_verified: 1
  }
];

const providerProfiles = [
  {
    id: 'profile-jane',
    user_id: 'provider-jane',
    business_name: 'Jane\'s Home Care',
    description: 'Top-rated residential cleaner specializing in deep cleans and move-outs.',
    hourly_rate: 45,
    is_online: 1,
    is_verified: 1,
    rating_avg: 4.8,
    total_jobs: 126,
    service_area_radius: 30,
    lat: 30.2676,
    lng: -97.7435
  },
  {
    id: 'profile-mike',
    user_id: 'provider-mike',
    business_name: 'Mike Plumbing Co.',
    description: 'Licensed plumber for leaks, fixtures, and emergency repairs.',
    hourly_rate: 80,
    is_online: 1,
    is_verified: 1,
    rating_avg: 4.9,
    total_jobs: 212,
    service_area_radius: 35,
    lat: 30.2711,
    lng: -97.7502
  },
  {
    id: 'profile-lucia',
    user_id: 'provider-lucia',
    business_name: 'Lucia Electric & Fix',
    description: 'Electrical installs, troubleshooting, and smart-home upgrades.',
    hourly_rate: 85,
    is_online: 1,
    is_verified: 1,
    rating_avg: 4.7,
    total_jobs: 174,
    service_area_radius: 28,
    lat: 30.2589,
    lng: -97.7353
  }
];

const providerServices = [
  { id: 'service-jane-cleaning', provider_id: 'provider-jane', category_id: 'cat-home-cleaning', price_type: 'hourly', fixed_price: null, hourly_rate: 45, description: 'Standard and deep cleaning packages.' },
  { id: 'service-jane-moving', provider_id: 'provider-jane', category_id: 'cat-moving', price_type: 'quote', fixed_price: null, hourly_rate: 50, description: 'Packing and move-out cleaning support.' },
  { id: 'service-mike-plumbing', provider_id: 'provider-mike', category_id: 'cat-plumbing', price_type: 'hourly', fixed_price: null, hourly_rate: 80, description: 'Leak repair, fixture swaps, and inspections.' },
  { id: 'service-mike-handyman', provider_id: 'provider-mike', category_id: 'cat-handyman', price_type: 'quote', fixed_price: null, hourly_rate: 70, description: 'General home repair support.' },
  { id: 'service-lucia-electrical', provider_id: 'provider-lucia', category_id: 'cat-electrical', price_type: 'hourly', fixed_price: null, hourly_rate: 85, description: 'Electrical diagnostics and installations.' },
  { id: 'service-lucia-handyman', provider_id: 'provider-lucia', category_id: 'cat-handyman', price_type: 'custom', fixed_price: null, hourly_rate: 75, description: 'Assembly, mounting, and smart-device installs.' }
];

const addresses = [
  {
    id: 'address-chris-home',
    user_id: 'customer-chris',
    label: 'Home',
    address_line1: '101 Congress Ave',
    address_line2: 'Apt 9B',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    country: 'USA',
    lat: 30.2638,
    lng: -97.7426,
    is_default: 1
  },
  {
    id: 'address-sam-home',
    user_id: 'customer-sam',
    label: 'Home',
    address_line1: '500 W 2nd St',
    address_line2: null,
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    country: 'USA',
    lat: 30.2658,
    lng: -97.7488,
    is_default: 1
  }
];

const availabilityRows = [];
['provider-jane', 'provider-mike', 'provider-lucia'].forEach((providerId) => {
  [1, 2, 3, 4, 5].forEach((day) => {
    availabilityRows.push({
      id: `${providerId}-day-${day}`,
      provider_id: providerId,
      day_of_week: day,
      start_time: '08:00',
      end_time: '18:00',
      is_available: 1
    });
  });
  availabilityRows.push({
    id: `${providerId}-day-6`,
    provider_id: providerId,
    day_of_week: 6,
    start_time: '09:00',
    end_time: '14:00',
    is_available: 1
  });
});

const insertUser = db.prepare(
  `
    INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, avatar_url, is_active, is_verified, created_at, updated_at)
    VALUES (@id, @email, @password_hash, @role, @first_name, @last_name, @phone, @avatar_url, 1, @is_verified, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      password_hash = excluded.password_hash,
      role = excluded.role,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      phone = excluded.phone,
      avatar_url = excluded.avatar_url,
      is_active = 1,
      is_verified = excluded.is_verified,
      updated_at = excluded.updated_at
  `
);

const seed = db.transaction(() => {
  const insertCategory = db.prepare(
    `
      INSERT INTO service_categories (id, name, slug, description, icon, is_active, parent_id, sort_order, created_at)
      VALUES (@id, @name, @slug, @description, @icon, 1, NULL, @sort_order, @created_at)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        slug = excluded.slug,
        description = excluded.description,
        icon = excluded.icon,
        is_active = 1,
        sort_order = excluded.sort_order
    `
  );
  const insertQuestion = db.prepare(
    `
      INSERT INTO category_questions (id, category_id, question_text, question_type, options, is_required, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        question_text = excluded.question_text,
        question_type = excluded.question_type,
        options = excluded.options,
        is_required = excluded.is_required,
        sort_order = excluded.sort_order
    `
  );
  const insertProfile = db.prepare(
    `
      INSERT INTO provider_profiles (id, user_id, business_name, description, hourly_rate, is_online, is_verified, rating_avg, total_jobs, service_area_radius, lat, lng, created_at, updated_at)
      VALUES (@id, @user_id, @business_name, @description, @hourly_rate, @is_online, @is_verified, @rating_avg, @total_jobs, @service_area_radius, @lat, @lng, @created_at, @updated_at)
      ON CONFLICT(user_id) DO UPDATE SET
        business_name = excluded.business_name,
        description = excluded.description,
        hourly_rate = excluded.hourly_rate,
        is_online = excluded.is_online,
        is_verified = excluded.is_verified,
        rating_avg = excluded.rating_avg,
        total_jobs = excluded.total_jobs,
        service_area_radius = excluded.service_area_radius,
        lat = excluded.lat,
        lng = excluded.lng,
        updated_at = excluded.updated_at
    `
  );
  const insertService = db.prepare(
    `
      INSERT INTO provider_services (id, provider_id, category_id, price_type, fixed_price, hourly_rate, description, is_active)
      VALUES (@id, @provider_id, @category_id, @price_type, @fixed_price, @hourly_rate, @description, 1)
      ON CONFLICT(id) DO UPDATE SET
        category_id = excluded.category_id,
        price_type = excluded.price_type,
        fixed_price = excluded.fixed_price,
        hourly_rate = excluded.hourly_rate,
        description = excluded.description,
        is_active = 1
    `
  );
  const insertAddress = db.prepare(
    `
      INSERT INTO addresses (id, user_id, label, address_line1, address_line2, city, state, zip, country, lat, lng, is_default, created_at)
      VALUES (@id, @user_id, @label, @address_line1, @address_line2, @city, @state, @zip, @country, @lat, @lng, @is_default, @created_at)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        address_line1 = excluded.address_line1,
        address_line2 = excluded.address_line2,
        city = excluded.city,
        state = excluded.state,
        zip = excluded.zip,
        country = excluded.country,
        lat = excluded.lat,
        lng = excluded.lng,
        is_default = excluded.is_default
    `
  );
  const insertAvailability = db.prepare(
    `
      INSERT INTO provider_availability (id, provider_id, day_of_week, start_time, end_time, is_available)
      VALUES (@id, @provider_id, @day_of_week, @start_time, @end_time, @is_available)
      ON CONFLICT(id) DO UPDATE SET
        provider_id = excluded.provider_id,
        day_of_week = excluded.day_of_week,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        is_available = excluded.is_available
    `
  );
  const upsertSetting = db.prepare(
    `
      INSERT INTO platform_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `
  );

  categories.forEach((category) => {
    insertCategory.run({ ...category, created_at: timestamp });
    category.questions.forEach((question, index) => {
      insertQuestion.run(
        `${category.id}-question-${index + 1}`,
        category.id,
        question.question_text,
        question.question_type,
        serializeJson(question.options),
        question.is_required ? 1 : 0,
        index + 1
      );
    });
  });

  users.forEach((user) => {
    insertUser.run({
      ...user,
      password_hash: bcrypt.hashSync(user.password, 10),
      created_at: timestamp,
      updated_at: timestamp
    });
  });

  providerProfiles.forEach((profile) => {
    insertProfile.run({ ...profile, created_at: timestamp, updated_at: timestamp });
  });
  providerServices.forEach((service) => insertService.run(service));
  addresses.forEach((address) => insertAddress.run({ ...address, created_at: timestamp }));
  availabilityRows.forEach((slot) => insertAvailability.run(slot));

  upsertSetting.run('support_email', 'support@servicemarket.com', timestamp);
  upsertSetting.run('default_city', 'Austin', timestamp);
});

seed();
console.log('Seed complete.');
console.log('Admin login: admin@servicemarket.com / admin123');
console.log('Sample providers: jane.cleaner@servicemarket.com / provider123, mike.plumber@servicemarket.com / provider123, lucia.spark@servicemarket.com / provider123');
console.log('Sample customers: chris.customer@servicemarket.com / customer123, sam.customer@servicemarket.com / customer123');
