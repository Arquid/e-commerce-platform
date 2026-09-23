import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminAuditLogPage from "../src/pages/AdminAuditLogPage";
import * as auditLogApiSlice from "../src/features/admin/auditLogApiSlice";
import type { AuditLogEntry } from "../src/features/admin/auditLogApiSlice";

vi.mock("../src/features/admin/auditLogApiSlice", async () => {
  const actual = await vi.importActual<typeof auditLogApiSlice>("../src/features/admin/auditLogApiSlice");
  return {
    ...actual,
    useGetAuditLogsQuery: vi.fn(),
  };
});

function mockGetAuditLogs(data: AuditLogEntry[] | undefined, isLoading = false) {
  vi.mocked(auditLogApiSlice.useGetAuditLogsQuery).mockReturnValue({
    data,
    isLoading,
  } as unknown as ReturnType<typeof auditLogApiSlice.useGetAuditLogsQuery>);
}

const createEntry: AuditLogEntry = {
  _id: "log1",
  admin: { _id: "u1", name: "Admin Example", email: "admin@example.com" },
  action: "product.create",
  targetType: "Product",
  targetId: "p1",
  details: { name: "Smartwatch", price: 249 },
  createdAt: "2026-01-01T00:00:00.000Z",
};

const statusEntry: AuditLogEntry = {
  _id: "log2",
  admin: { _id: "u1", name: "Admin Example", email: "admin@example.com" },
  action: "order.status_update",
  targetType: "Order",
  targetId: "order123456",
  details: { from: "pending", to: "shipped" },
  createdAt: "2026-01-02T00:00:00.000Z",
};

describe("AdminAuditLogPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading message while the log is loading", () => {
    mockGetAuditLogs(undefined, true);
    render(<AdminAuditLogPage />);
    expect(screen.getByText("Loading audit log...")).toBeInTheDocument();
  });

  it("shows an empty state when there are no entries", () => {
    mockGetAuditLogs([], false);
    render(<AdminAuditLogPage />);
    expect(screen.getByText("No admin actions recorded yet.")).toBeInTheDocument();
  });

  it("describes a product creation entry", () => {
    mockGetAuditLogs([createEntry], false);
    render(<AdminAuditLogPage />);
    expect(screen.getByText('Created product "Smartwatch"')).toBeInTheDocument();
    expect(screen.getByText("Admin Example · admin@example.com")).toBeInTheDocument();
  });

  it("describes an order status update entry", () => {
    mockGetAuditLogs([statusEntry], false);
    render(<AdminAuditLogPage />);
    expect(screen.getByText("Changed order #123456 status from pending to shipped")).toBeInTheDocument();
  });

  it("describes a user role update entry", () => {
    const roleEntry: AuditLogEntry = {
      _id: "log3",
      admin: { _id: "u1", name: "Admin Example", email: "admin@example.com" },
      action: "user.role_update",
      targetType: "User",
      targetId: "user123456",
      details: { email: "alice@example.com", from: "customer", to: "admin" },
      createdAt: "2026-01-03T00:00:00.000Z",
    };
    mockGetAuditLogs([roleEntry], false);
    render(<AdminAuditLogPage />);
    expect(screen.getByText("Changed alice@example.com's role from customer to admin")).toBeInTheDocument();
  });
});
