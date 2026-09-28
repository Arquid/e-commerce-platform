import { api } from "../api/apiSlice";

export interface AuditLogEntry {
  _id: string;
  // Absent for system events, e.g. ones recorded by the Stripe webhook.
  admin?: { _id: string; name: string; email: string } | string | null;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export const auditLogApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query<AuditLogEntry[], void>({
      query: () => "/admin/audit-logs",
    }),
  }),
});

export const { useGetAuditLogsQuery } = auditLogApi;
