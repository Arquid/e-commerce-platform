import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import OrderSuccessPage from "../src/pages/OrderSuccessPage";
import type { CartItem } from "../src/features/cart/cartSlice";

const cartItem: CartItem = {
  productId: "p1",
  name: "Sneakers",
  price: 49,
  quantity: 2,
  imageUrl: "https://example.com/img.png",
};

describe("OrderSuccessPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the short order number from the URL", () => {
    renderWithProviders(<OrderSuccessPage />, { route: "/order-success?orderId=6aba8323fa77982a72194b24" });
    expect(screen.getByText("Thank you for your order!")).toBeInTheDocument();
    expect(screen.getByText("#194b24")).toBeInTheDocument();
  });

  it("omits the order number line when the URL doesn't include one", () => {
    renderWithProviders(<OrderSuccessPage />, { route: "/order-success" });
    expect(screen.getByText("Thank you for your order!")).toBeInTheDocument();
    expect(screen.queryByText(/Order number/)).not.toBeInTheDocument();
  });

  it("empties the cart — in the store and in localStorage — once the order is placed", () => {
    localStorage.setItem("cart", JSON.stringify([cartItem]));
    const { store } = renderWithProviders(<OrderSuccessPage />, {
      route: "/order-success?orderId=abc123",
      preloadedState: { cart: { items: [cartItem] } },
    });

    expect(store.getState().cart.items).toEqual([]);
    expect(localStorage.getItem("cart")).toBeNull();
  });

  it("links to the order history", () => {
    renderWithProviders(<OrderSuccessPage />, { route: "/order-success?orderId=abc123" });
    expect(screen.getByRole("link", { name: "View order history" })).toHaveAttribute("href", "/orders");
  });
});
