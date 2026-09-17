import { Router } from "express";
import { getMyOrders, getOrderById, getAllOrders, updateOrderStatus } from "../controllers/orderController";
import { protect, requireAdmin } from "../middleware/auth";
import { validate, validateQuery } from "../middleware/validate";
import { updateOrderStatusSchema, paginationQuerySchema } from "../validation/schemas";

const router = Router();
router.use(protect);
router.get("/", validateQuery(paginationQuerySchema), getMyOrders);
router.get("/all", requireAdmin, validateQuery(paginationQuerySchema), getAllOrders);
router.get("/:id", getOrderById);
router.patch("/:id/status", requireAdmin, validate(updateOrderStatusSchema), updateOrderStatus);

export default router;
