import { Response } from "express";
import AuditLog from "../models/AuditLog";
import { AuthRequest } from "../middleware/auth";

export const getAuditLogs = async (_req: AuthRequest, res: Response) => {
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200).populate("admin", "name email");
  res.json(logs);
};
