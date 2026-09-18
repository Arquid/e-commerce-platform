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
| Testing        | Vitest — Supertest + mongodb-memory-server (backend), React Testing Library (frontend) |

## Features

- Product listing with search, category filter, and pagination
- Product detail page with stock status
- Shopping cart (persisted in `localStorage`) with quantity controls
- Shipping address form collected at checkout
- User registration and login (JWT-based) with request validation on the API — the token itself lives only in an httpOnly cookie, never in localStorage or anywhere client-side JavaScript can read it, so an XSS payload can't steal it
- Automatic logout when a session token is invalid or expired
- Stripe Checkout integration with webhook-confirmed payments
- Abandoned checkouts are automatically cancelled when Stripe's session expires
- Paginated order history for logged-in users, and a paginated admin order list
- Route protection for authenticated pages
- Rate limiting and security headers (Helmet) on the API
- A 404 page for unmatched routes and an error boundary so a single broken page can't blank out the whole app
- Admin-only product management UI (list, add, delete) at `/admin/products`
- Admin-only order management UI (list every order, update its status) at `/admin/orders`
- Server-authoritative pricing: checkout only sends `productId` + `quantity`; the API looks up each product's real price and name from the database, so a tampered client request can never change what's charged
- Audit log of admin actions (product created/deleted, order status changes) with who did what and when, at `/admin/audit-log`
- Stock enforcement: checkout is rejected if the requested quantity exceeds a product's available stock, and stock is decremented atomically once payment is confirmed — a duplicate webhook delivery never double-decrements it

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
    ├── src/
    │   ├── app/          Redux store
    │   ├── features/     Redux slices and RTK Query API slices
    │   ├── components/   Reusable UI components (Navbar, ProductCard, ErrorBoundary, ...)
    │   └── pages/        Route-level pages
    └── tests/            Vitest + React Testing Library test suite
```

## Prerequisites

- Node.js 20+ to run the app. Running the **frontend test suite** needs Node 22.22+ or 24.15+ (a `jsdom` requirement) — CI runs on Node 24.
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

### Running all three at once

Once `server`, `client`, and `stripe login` are set up as above, you can start the backend, frontend, and Stripe webhook listener together from the repository root instead of using three separate terminals:

```bash
npm install
npm run dev
```

## Running the app

With all three processes running (backend, frontend, Stripe CLI), open **http://localhost:5173**. Use Stripe's test card `4242 4242 4242 4242` with any future expiry date and any CVC to complete a checkout.

## Testing

Both the backend and frontend have automated test suites.

**Backend** — covers the auth, product, order (including admin order management), checkout/webhook, and health-check flows:

```bash
cd server
npm run test
```

Tests run against an isolated in-memory MongoDB instance (via `mongodb-memory-server`) and a mocked Stripe client — they never touch the real database or make real Stripe API calls. Environment variables used by the app (JWT secret, Stripe key, etc.) are set to fixed test values in `server/tests/setupEnv.ts`, so the suite doesn't depend on a local `.env` file existing. That same setup file sets `NODE_ENV=test`, which the API rate limiters check to skip themselves — otherwise the auth rate limit (10 requests / 15 min) would trip mid-suite, since tests register/log in far more often than a real user would. See `server/tests/`.

**Frontend** — covers the Redux slices (`cartSlice`, `authSlice`) and every major page/component (`ProductCard`, `NotFoundPage`, `ErrorBoundary`, `HomePage`, `CartPage`, `AdminProductsPage`, `AdminOrdersPage`):

```bash
cd client
npm run test
```

Simpler component tests render with React Testing Library against a real (but isolated, per-test) Redux store — no backend or network calls involved. Pages that call the API (`HomePage`, `CartPage`, `AdminProductsPage`, `AdminOrdersPage`) instead mock their RTK Query hooks directly (e.g. `useGetProductsQuery`, `useCreateProductMutation`) rather than the network layer — this keeps each test focused on the component's own logic (form submission, pagination, quantity controls, inline error messages) without needing to fake HTTP responses. See `client/tests/`.

## Continuous integration

Every push and pull request to `main` runs a [GitHub Actions workflow](.github/workflows/ci.yml) that type-checks, lints, tests, and builds both the server and the client.

## Deploying to production

- The server fails fast with a clear error at startup if a required environment variable (`MONGO_URI`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLIENT_URL`) is missing, instead of booting and only failing on the first request that needs it.
- If you deploy behind a reverse proxy (Render, Railway, Heroku, nginx, etc. — true for most hosting platforms), set `TRUST_PROXY=1` in `server/.env`. Without it, `express-rate-limit` can't reliably tell users apart by IP once requests arrive via a proxy's `X-Forwarded-For` header. Leave it unset for local development — blindly trusting that header when there's no proxy in front would let a client spoof its own IP and dodge rate limiting.
- The auth cookie is set with `SameSite=Lax`, which works for the common case of the frontend and API sharing a registrable domain (e.g. `app.example.com` and `api.example.com`, or same-site different ports as in local dev). If you deploy them on genuinely separate domains, the cookie won't be sent cross-site — that setup isn't supported out of the box.

## Known limitations

This project is a working MVP, not fully production-hardened. Notably:

- Promoting a user to `admin` still requires direct database access — there's no self-service or invite-based way to grant the role
- No test coverage reporting (e.g. `@vitest/coverage-v8`) configured yet

## License

Personal / educational project.
