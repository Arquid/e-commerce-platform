import { Router } from "express";
import { createCheckoutSession, handleWebhook } from "../controllers/paymentController";
import { protect } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createCheckoutSessionSchema } from "../validation/schemas";

const router = Router();
router.post("/create-checkout-session", protect, validate(createCheckoutSessionSchema), createCheckoutSession);
router.post("/webhook", handleWebhook);

export default router;