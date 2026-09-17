import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminOrdersPage from "../src/pages/AdminOrdersPage";
import * as ordersApiSlice from "../src/features/orders/ordersApiSlice";
import type { AdminOrder } from "../src/features/orders/ordersApiSlice";

vi.mock("../src/features/orders/ordersApiSlice", async () => {
  const actual = await vi.importActual<typeof ordersApiSlice>("../src/features/orders/ordersApiSlice");
  return {
    ...actual,
    useGetAllOrdersQuery: vi.fn(),
    useUpdateOrderStatusMutation: vi.fn(),
  };
});

const mockOrder: AdminOrder = {
  _id: "order123456",
  user: { _id: "u1", name: "Alice Example", email: "alice@example.com" },
  items: [],
  totalAmount: 42,
  status: "paid",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function mockGetAllOrders(orders: AdminOrder[] | undefined, isLoading = false) {
  vi.mocked(ordersApiSlice.useGetAllOrdersQuery).mockReturnValue({
    data: orders && { orders, total: orders.length, page: 1, pages: 1 },
    isLoading,
  } as unknown as ReturnType<typeof ordersApiSlice.useGetAllOrdersQuery>);
}

function mockUpdateOrderStatus(trigger: ReturnType<typeof vi.fn>) {
  vi.mocked(ordersApiSlice.useUpdateOrderStatusMutation).mockReturnValue([
    trigger,
    { isLoading: false },
  ] as unknown as ReturnType<typeof ordersApiSlice.useUpdateOrderStatusMutation>);
}

function mockGetAllOrdersPaginated(orders: AdminOrder[], page: number, pages: number) {
  vi.mocked(ordersApiSlice.useGetAllOrdersQuery).mockReturnValue({
    data: { orders, total: orders.length, page, pages },
    isLoading: false,
  } as unknown as ReturnType<typeof ordersApiSlice.useGetAllOrdersQuery>);
}

describe("AdminOrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading message while orders are loading", () => {
    mockGetAllOrders(undefined, true);
    mockUpdateOrderStatus(vi.fn());

    render(<AdminOrdersPage />);
    expect(screen.getByText("Loading orders...")).toBeInTheDocument();
  });

  it("shows an empty state when there are no orders", () => {
    mockGetAllOrders([], false);
    mockUpdateOrderStatus(vi.fn());

    render(<AdminOrdersPage />);
    expect(screen.getByText("No orders yet.")).toBeInTheDocument();
  });

  it("renders order details and the current status", () => {
    mockGetAllOrders([mockOrder], false);
    mockUpdateOrderStatus(vi.fn());

    render(<AdminOrdersPage />);
    expect(screen.getByText(/Order #123456/)).toBeInTheDocument();
    expect(screen.getByText("Alice Example · alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("42.00 €")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("paid");
  });

  it("calls the mutation when a new status is selected", async () => {
    const trigger = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve(mockOrder) });
    mockGetAllOrders([mockOrder], false);
    mockUpdateOrderStatus(trigger);

    render(<AdminOrdersPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "shipped" } });

    await waitFor(() => {
      expect(trigger).toHaveBeenCalledWith({ id: "order123456", status: "shipped" });
    });
    expect(screen.queryByText(/Update failed/)).not.toBeInTheDocument();
  });

  it("shows an inline error when the mutation fails", async () => {
    const trigger = vi.fn().mockReturnValue({ unwrap: () => Promise.reject(new Error("network error")) });
    mockGetAllOrders([mockOrder], false);
    mockUpdateOrderStatus(trigger);

    render(<AdminOrdersPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "shipped" } });

    await waitFor(() => {
      expect(screen.getByText("Update failed — try again")).toBeInTheDocument();
    });
  });

  it("renders page number buttons when there is more than one page", () => {
    mockGetAllOrdersPaginated([mockOrder], 1, 3);
    mockUpdateOrderStatus(vi.fn());

    render(<AdminOrdersPage />);
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
  });

  it("does not render pagination when there is only one page", () => {
    mockGetAllOrdersPaginated([mockOrder], 1, 1);
    mockUpdateOrderStatus(vi.fn());

    render(<AdminOrdersPage />);
    expect(screen.queryByRole("button", { name: "1" })).not.toBeInTheDocument();
  });
});
