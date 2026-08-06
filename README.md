# ServiceMarket — Uber for Services

A full-service on-demand marketplace platform connecting customers with local service providers. Think Uber meets Thumbtack — customers request services, nearby providers accept jobs, complete work, and get paid.

## Architecture

```
├── backend/          # Node.js/Express REST API + WebSocket server
│   ├── src/
│   │   ├── database/     # SQLite schema, setup, seed data
│   │   ├── middleware/   # Auth, validation, rate limiting
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Business logic (matching engine, etc.)
│   │   └── websocket.js  # Real-time WebSocket server
│   └── package.json
├── frontend/         # React TypeScript SPA
│   ├── src/
│   │   ├── api/          # API client layer
│   │   ├── components/   # Reusable UI components
│   │   ├── context/      # React contexts (WebSocket, Auth)
│   │   ├── hooks/        # Custom hooks
│   │   ├── pages/        # Page components
│   │   ├── store/        # Zustand state management
│   │   ├── types/        # TypeScript type definitions
│   │   └── utils/        # Utility functions
│   └── package.json
└── docker-compose.yml
```

## Features

### User Roles
- **Customer** — Browse services, request/book providers, track jobs, pay, review
- **Provider** — Set services/rates, go online, accept jobs, complete work, earn money
- **Admin** — Manage platform, verify providers, handle disputes, view analytics

### Core Functionality
- Real-time job matching with scoring algorithm
- Live booking status tracking (state machine)
- Real-time messaging between customer & provider
- Interactive maps with provider location tracking
- Multiple pricing models (fixed, hourly, quote-based)
- Dynamic service request forms per category
- Provider verification system
- Ratings & reviews (bidirectional)
- Dispute resolution system
- Complete admin dashboard with analytics
- Push/in-app notifications via WebSocket

### Service Categories
Plumbing, Electrical, Cleaning, Lawn Care, Window Cleaning, Private Chef, Handyman, Car Detailing, Moving, Tech Help, Photography, Pet Care, Beauty Services, Tutoring, and more.

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Backend Setup
```bash
cd backend
npm install
npm run setup    # Initialize database
npm run seed     # Load sample data
npm start        # Start server on port 3001
```

### Frontend Setup
```bash
cd frontend
npm install
npm start        # Start React app on port 3000
```

### Docker (Alternative)
```bash
docker-compose up --build
```

## Default Accounts (after seeding)

| Role     | Email                      | Password |
|----------|----------------------------|----------|
| Admin    | admin@servicemarket.com    | admin123 |
| Customer | john@example.com           | password123 |
| Customer | sarah@example.com          | password123 |
| Provider | alex@example.com           | password123 |
| Provider | maria@example.com          | password123 |
| Provider | james@example.com          | password123 |

## API Overview

All API endpoints are under `/api`:

- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login, receive JWT
- `GET /api/categories` — List service categories
- `GET /api/providers` — Search providers
- `POST /api/bookings` — Create service request
- `POST /api/bookings/:id/accept` — Provider accepts job
- `PUT /api/bookings/:id/status` — Update job status
- `POST /api/messages` — Send message
- `POST /api/reviews` — Submit review
- `GET /api/admin/dashboard` — Admin metrics

WebSocket connects at `ws://localhost:3001?token=JWT_TOKEN`

## Matching Algorithm

The matching engine scores providers based on:
- Service compatibility (required match)
- Current availability (online status)
- Proximity to customer
- Provider rating
- Response reliability (acceptance rate)
- Current workload

Weights are configurable by admins in platform settings.

## Environment Variables

```env
PORT=3001
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
MAPS_API_KEY=your-maps-key
PLATFORM_FEE_PERCENT=15
```

## Tech Stack

- **Backend**: Node.js, Express, better-sqlite3, JSON Web Tokens, WebSocket (ws)
- **Frontend**: React 18, TypeScript, Zustand, React Router v6, Leaflet, Axios
- **Database**: SQLite (production-ready for single-server deployment)
- **Real-time**: WebSocket for live updates
- **Maps**: Leaflet/OpenStreetMap (no API key required)

## License

MIT