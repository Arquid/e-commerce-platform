# E-Commerce Platform

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
| Payments       | Stripe Checkout                              |

## Features

- Product listing with search, category filter, and pagination
- Product detail page with stock status
- Shopping cart (persisted in `localStorage`) with quantity controls
- User registration and login (JWT-based)
- Stripe Checkout integration with webhook-confirmed payments
- Order history for logged-in users
- Route protection for authenticated pages

## Project structure

```
e-commerce-platform/
├── server/     Node.js + Express + TypeScript API
│   └── src/
│       ├── config/       Database and Stripe setup
│       ├── models/       Mongoose schemas (User, Product, Order)
│       ├── controllers/  Route handlers
│       ├── routes/       Express routers
│       ├── middleware/   Auth guard and error handling
│       └── seed.ts       Sample product seed script
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
```

Create `server/.env`:

```
PORT=5000
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=a-long-random-string
JWT_EXPIRES_IN=7d
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLIENT_URL=http://localhost:5173
```

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
```

Create `client/.env`:

```
VITE_API_URL=http://localhost:5000/api
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

## Known limitations

This project is a working MVP, not production-hardened. Notably:

- No automated tests
- No request validation on the API (e.g. `register`/`createProduct` trust the request body)
- Shipping address on checkout is currently hardcoded rather than collected from the user
- JWT is stored in `localStorage`, which is simpler but more XSS-exposed than an httpOnly cookie
- No admin UI — promoting a user to `admin` or managing products/orders requires direct database access
- No rate limiting or security headers (e.g. `helmet`) on the API

## License

Personal / educational project.
