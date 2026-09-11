import { Router } from "express";
import { getMyOrders, getOrderById, getAllOrders, updateOrderStatus } from "../controllers/orderController";
import { protect, requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { updateOrderStatusSchema } from "../validation/schemas";

const router = Router();
router.use(protect);
router.get("/", getMyOrders);
router.get("/all", requireAdmin, getAllOrders);
router.get("/:id", getOrderById);
router.patch("/:id/status", requireAdmin, validate(updateOrderStatusSchema), updateOrderStatus);

export default router;
