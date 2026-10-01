import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";
import type { AuthRequest } from "./auth";

// Tests make far more requests per minute than any real user, so they'd trip
// these for the wrong reason — this is a production safeguard, not something
// the automated test suite should have to work around. Checked on every
// request rather than once at load, so a test can switch it off for itself.
const skipInTests = () => process.env.NODE_ENV === "test";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
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
  skip: skipInTests,
});

// Each checkout reserves stock and creates a Stripe session, so it's far more
// expensive than an ordinary request and shouldn't share the general limit.
// Counted per signed-in customer rather than per IP: people behind one shared
// connection (an office, a household) shouldn't use up each other's attempts.
export const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many checkout attempts. Please wait a few minutes and try again." },
  keyGenerator: (req: Request) => (req as AuthRequest).userId ?? ipKeyGenerator(req.ip ?? ""),
  skip: skipInTests,
});
