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
router.post("/logout", logout);
router.get("/me", protect, getMe);

export default router;