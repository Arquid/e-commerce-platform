import { Router } from "express";
import { getMyOrders, getOrderById } from "../controllers/orderController";
import { protect } from "../middleware/auth";

const router = Router();
router.use(protect);
router.get("/", getMyOrders);
router.get("/:id", getOrderById);

export default router;