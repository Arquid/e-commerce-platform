# E-Commerce Platform

![CI](https://github.com/Arquid/e-commerce-platform/actions/workflows/ci.yml/badge.svg)

A full-stack e-commerce web application built with React, Node.js/Express, MongoDB, and Stripe. Users can browse and filter products, manage a shopping cart, create an account, check out with Stripe, and view their order history.

## Tech stack

| Layer          | Technology                                   |
| -------------- | --------------------------------------------- |
| Frontend       | React 18 (Vite), TypeScript                  |
| State          | Redux Toolkit + RTK Query                    |
| Styling        | Tailwind CSS v4                              |
| Backend        | Node.js, Express, TypeScript                 |
| Database       | MongoDB (Mongoose)                           |
| Auth           | JWT (jsonwebtoken) + bcrypt                  |
| Validation     | Zod                                          |
| Security       | Helmet, express-rate-limit                   |
| Payments       | Stripe Checkout                              |
| Testing        | Vitest, Supertest, mongodb-memory-server     |

## Features

- Product listing with search, category filter, and pagination
- Product detail page with stock status
- Shopping cart (persisted in `localStorage`) with quantity controls
- Shipping address form collected at checkout
- User registration and login (JWT-based), with request validation on the API
- Automatic logout when a session token is invalid or expired
- Stripe Checkout integration with webhook-confirmed payments
- Abandoned checkouts are automatically cancelled when Stripe's session expires
- Order history for logged-in users
- Route protection for authenticated pages
- Rate limiting and security headers (Helmet) on the API

## Project structure

```
e-commerce-platform/
├── .github/workflows/  CI: type-checks, lints, tests, and builds on every push
├── server/     Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── config/       Database and Stripe setup
│   │   ├── models/       Mongoose schemas (User, Product, Order)
│   │   ├── controllers/  Route handlers
│   │   ├── routes/       Express routers
│   │   ├── middleware/   Auth guard, validation, and error handling
│   │   ├── validation/   Zod request schemas
│   │   ├── app.ts        Express app (used by both index.ts and the tests)
│   │   ├── index.ts      Connects to MongoDB and starts the server
│   │   └── seed.ts       Sample product seed script
│   └── tests/            Vitest + Supertest test suite
└── client/     React + Vite + TypeScript frontend
    └── src/
        ├── app/          Redux store
        ├── features/     Redux slices and RTK Query API slices
        ├── components/   Reusable UI components
        └── pages/        Route-level pages
```

## Prerequisites

- Node.js 20+
- A MongoDB database (e.g. a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster)
- A [Stripe](https://dashboard.stripe.com/register) account (test mode is sufficient)
- [Stripe CLI](https://docs.stripe.com/stripe-cli) for testing webhooks locally

## Setup

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
```

Fill in `server/.env` with your own values (MongoDB connection string, a random JWT secret, your Stripe test-mode secret key).

Seed the database with sample products:

```bash
npm run seed
```

Start the API:

```bash
npm run dev
```

### 2. Frontend

```bash
cd client
npm install
cp .env.example .env
```

Start the dev server:

```bash
npm run dev
```

### 3. Stripe webhooks (for checkout to update order status)

In a separate terminal:

```bash
stripe login
stripe listen --forward-to localhost:5000/api/payments/webhook
```

Copy the `whsec_...` value it prints into `server/.env` as `STRIPE_WEBHOOK_SECRET`.

## Running the app

With all three processes running (backend, frontend, Stripe CLI), open **http://localhost:5173**. Use Stripe's test card `4242 4242 4242 4242` with any future expiry date and any CVC to complete a checkout.

## Testing

The backend has an automated test suite covering the auth, product, and checkout/webhook flows:

```bash
cd server
npm run test
```

Tests run against an isolated in-memory MongoDB instance (via `mongodb-memory-server`) and a mocked Stripe client — they never touch the real database or make real Stripe API calls. See `server/tests/`.

## Continuous integration

Every push and pull request to `main` runs a [GitHub Actions workflow](.github/workflows/ci.yml) that type-checks, lints, tests, and builds both the server and the client.

## Known limitations

This project is a working MVP, not fully production-hardened. Notably:

- No frontend tests yet (backend has full coverage of auth/products/checkout; the client does not)
- JWT is stored in `localStorage`, which is simpler but more XSS-exposed than an httpOnly cookie
- No admin UI — promoting a user to `admin` or managing products/orders requires direct database access or the seed script
- No pagination upper bound on the products API (`?limit=` accepts any value)

## License

Personal / educational project.
