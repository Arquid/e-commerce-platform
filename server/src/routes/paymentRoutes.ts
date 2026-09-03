import { Router } from "express";
import { createCheckoutSession, handleWebhook } from "../controllers/paymentController";
import { protect } from "../middleware/auth";

const router = Router();
router.post("/create-checkout-session", protect, createCheckoutSession);
router.post("/webhook", handleWebhook);

export default router;