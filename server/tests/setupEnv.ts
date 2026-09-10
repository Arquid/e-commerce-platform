// Runs before any test file's imports, so app.ts (and anything it pulls in,
// like the Stripe client and JWT signing) never sees undefined env vars —
// even in CI, where no .env file exists.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_EXPIRES_IN = "1h";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy_key_for_tests";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy_for_tests";
process.env.CLIENT_URL = "http://localhost:5173";
