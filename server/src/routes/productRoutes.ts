import { Router } from "express";
import { getProducts, getProductById, createProduct } from "../controllers/productController";
import { protect, requireAdmin } from "../middleware/auth";

const router = Router();
router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", protect, requireAdmin, createProduct);

export default router;