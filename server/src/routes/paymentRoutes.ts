import { Router } from "express";
import { createCheckoutSession, handleWebhook } from "../controllers/paymentController";
import { protect } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { checkoutLimiter } from "../middleware/rateLimiters";
import { createCheckoutSessionSchema } from "../validation/schemas";

const router = Router();
// After protect, so the limit is counted per customer (see checkoutLimiter).
router.post(
  "/create-checkout-session",
  protect,
  checkoutLimiter,
  validate(createCheckoutSessionSchema),
  createCheckoutSession
);
router.post("/webhook", handleWebhook);

export default router;