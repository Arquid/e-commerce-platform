import AuditLog from "../models/AuditLog";

export function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: Record<string, unknown>
) {
  return AuditLog.create({ admin: adminId, action, targetType, targetId, details });
}
