import { Router } from "express";
import { getAuditLogs } from "../controllers/auditLogController";
import { protect, requireAdmin } from "../middleware/auth";

const router = Router();
router.get("/", protect, requireAdmin, getAuditLogs);

export default router;
