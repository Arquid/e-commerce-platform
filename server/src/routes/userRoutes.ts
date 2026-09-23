import { Router } from "express";
import { getUsers, updateUserRole } from "../controllers/userController";
import { protect, requireAdmin } from "../middleware/auth";
import { validate, validateQuery } from "../middleware/validate";
import { updateUserRoleSchema, paginationQuerySchema } from "../validation/schemas";

const router = Router();
router.use(protect, requireAdmin);
router.get("/", validateQuery(paginationQuerySchema), getUsers);
router.patch("/:id/role", validate(updateUserRoleSchema), updateUserRole);

export default router;
