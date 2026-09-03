import { Router } from "express";
import { getProducts, getProductById, createProduct } from "../controllers/productController";
import { protect, requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createProductSchema } from "../validation/schemas";

const router = Router();
router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", protect, requireAdmin, validate(createProductSchema), createProduct);

export default router;