import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import OrderHistoryPage from "../src/pages/OrderHistoryPage";
import * as ordersApiSlice from "../src/features/orders/ordersApiSlice";
import type { Order } from "../src/features/orders/ordersApiSlice";

vi.mock("../src/features/orders/ordersApiSlice", async () => {
  const actual = await vi.importActual<typeof ordersApiSlice>("../src/features/orders/ordersApiSlice");
  return { ...actual, useGetMyOrdersQuery: vi.fn() };
});

const paidOrder: Order = {
  _id: "order000abc123",
  items: [{ product: "p1", name: "Sneakers", quantity: 2, price: 24.5 }],
  totalAmount: 49,
  status: "paid",
  createdAt: "2026-03-15T10:00:00.000Z",
};

function mockOrders(orders: Order[] | undefined, { isLoading = false, page = 1, pages = 1 } = {}) {
  vi.mocked(ordersApiSlice.useGetMyOrdersQuery).mockReturnValue({
    data: orders && { orders, total: orders.length, page, pages },
    isLoading,
  } as unknown as ReturnType<typeof ordersApiSlice.useGetMyOrdersQuery>);
}

describe("OrderHistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests the first page of the user's orders, 10 at a time", () => {
    mockOrders([]);
    renderWithProviders(<OrderHistoryPage />);
    expect(ordersApiSlice.useGetMyOrdersQuery).toHaveBeenLastCalledWith({ page: 1, limit: 10 });
  });

  it("shows neither orders nor the empty state while loading", () => {
    mockOrders(undefined, { isLoading: true });
    renderWithProviders(<OrderHistoryPage />);
    expect(screen.getByRole("heading", { name: "Order history" })).toBeInTheDocument();
    expect(screen.queryByText("No orders yet")).not.toBeInTheDocument();
    expect(screen.queryByText(/Order #/)).not.toBeInTheDocument();
  });

  it("shows an empty state that links back to the shop", () => {
    mockOrders([]);
    renderWithProviders(<OrderHistoryPage />);
    expect(screen.getByText("No orders yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse products" })).toHaveAttribute("href", "/");
  });

  it("lists each order with its short number, status and total", () => {
    mockOrders([paidOrder, { ...paidOrder, _id: "order000def456", status: "cancelled", totalAmount: 12.5 }]);
    renderWithProviders(<OrderHistoryPage />);

    expect(screen.getByText("Order #abc123")).toBeInTheDocument();
    expect(screen.getByText("paid")).toBeInTheDocument();
    expect(screen.getByText("49.00 €")).toBeInTheDocument();

    expect(screen.getByText("Order #def456")).toBeInTheDocument();
    expect(screen.getByText("cancelled")).toBeInTheDocument();
    expect(screen.getByText("12.50 €")).toBeInTheDocument();
  });

  it("requests the chosen page when a page button is clicked", () => {
    mockOrders([paidOrder], { page: 1, pages: 3 });
    renderWithProviders(<OrderHistoryPage />);

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    expect(ordersApiSlice.useGetMyOrdersQuery).toHaveBeenLastCalledWith({ page: 2, limit: 10 });
  });

  it("hides pagination when everything fits on one page", () => {
    mockOrders([paidOrder], { page: 1, pages: 1 });
    renderWithProviders(<OrderHistoryPage />);
    expect(screen.queryByRole("button", { name: "1" })).not.toBeInTheDocument();
  });
});
