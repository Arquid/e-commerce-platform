import { useGetAuditLogsQuery } from "../features/admin/auditLogApiSlice";
import type { AuditLogEntry } from "../features/admin/auditLogApiSlice";

function describeEntry(entry: AuditLogEntry): string {
  const details = entry.details ?? {};
  switch (entry.action) {
    case "product.create":
      return `Created product "${details.name ?? entry.targetId}"`;
    case "product.delete":
      return `Deleted product "${details.name ?? entry.targetId}"`;
    case "order.status_update":
      return `Changed order #${entry.targetId?.slice(-6)} status from ${details.from} to ${details.to}`;
    default:
      return `${entry.action} on ${entry.targetType} ${entry.targetId ?? ""}`;
  }
}

export default function AdminAuditLogPage() {
  const { data: logs, isLoading } = useGetAuditLogsQuery();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Audit log</h1>

      {isLoading && <p className="text-sm text-slate-500">Loading audit log...</p>}

      {!isLoading && logs?.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-500">
          No admin actions recorded yet.
        </p>
      )}

      {!isLoading && logs && logs.length > 0 && (
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {logs.map((entry) => (
            <div key={entry._id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-[16rem] flex-1">
                <p className="text-sm text-slate-900">{describeEntry(entry)}</p>
                <p className="text-xs text-slate-400">
                  {entry.admin && typeof entry.admin === "object"
                    ? `${entry.admin.name} · ${entry.admin.email}`
                    : entry.admin}
                </p>
              </div>
              <span className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
