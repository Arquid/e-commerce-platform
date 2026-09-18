import { Router } from "express";
import { register, login, logout, getMe } from "../controllers/authController";
import { protect } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { authLimiter } from "../middleware/rateLimiters";
import { registerSchema, loginSchema } from "../validation/schemas";

const router = Router();
// Brute-force protection applies only to credential-guessing endpoints —
// GET /me is called on every page load to rehydrate the session and must
// not share that limit (see rateLimiters.ts).
router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
// protect here isn't about authorizing the action (clearing a cookie needs no
// permission check) — it's what stops a cross-site request forged without
// the real session cookie from reaching clearAuthCookie at all. SameSite=Lax
// already keeps that cookie out of the forged request, but without this
// guard the server would process the logout anyway and its Set-Cookie
// response still gets applied by the browser, forcibly logging out whoever
// clicks the attacker's page even though they were never authenticated here.
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);

export default router;