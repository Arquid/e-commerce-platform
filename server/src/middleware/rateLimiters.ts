import rateLimit from "express-rate-limit";

// Tests make far more requests per minute than any real user, so they'd trip
// these for the wrong reason — this is a production safeguard, not something
// the automated test suite should have to work around.
const isTestEnv = process.env.NODE_ENV === "test";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
});

// Brute-force protection for credential guessing — deliberately applied only
// to register/login, not the whole /api/auth router. GET /me is called once
// on every page load (to rehydrate the session from the httpOnly cookie), so
// a real user just browsing normally would otherwise exhaust this limit
// within minutes and get silently logged out of the UI despite still having
// a perfectly valid session.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later." },
  skip: () => isTestEnv,
});
