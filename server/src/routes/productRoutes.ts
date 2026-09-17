import { Router } from "express";
import { getProducts, getProductById, createProduct, deleteProduct } from "../controllers/productController";
import { protect, requireAdmin } from "../middleware/auth";
import { validate, validateQuery } from "../middleware/validate";
import { createProductSchema, paginationQuerySchema } from "../validation/schemas";

const router = Router();
router.get("/", validateQuery(paginationQuerySchema), getProducts);
router.get("/:id", getProductById);
router.post("/", protect, requireAdmin, validate(createProductSchema), createProduct);
router.delete("/:id", protect, requireAdmin, deleteProduct);

export default router;