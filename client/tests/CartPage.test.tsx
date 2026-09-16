import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { api } from "../src/features/api/apiSlice";
import cartReducer, { addItem } from "../src/features/cart/cartSlice";
import type { CartItem } from "../src/features/cart/cartSlice";
import authReducer from "../src/features/auth/authSlice";
import CartPage from "../src/pages/CartPage";
import * as ordersApiSlice from "../src/features/orders/ordersApiSlice";

vi.mock("../src/features/orders/ordersApiSlice", async () => {
  const actual = await vi.importActual<typeof ordersApiSlice>("../src/features/orders/ordersApiSlice");
  return {
    ...actual,
    useCreateCheckoutSessionMutation: vi.fn(),
  };
});

function mockCheckout(trigger = vi.fn()) {
  vi.mocked(ordersApiSlice.useCreateCheckoutSessionMutation).mockReturnValue([
    trigger,
    { isLoading: false },
  ] as unknown as ReturnType<typeof ordersApiSlice.useCreateCheckoutSessionMutation>);
  return trigger;
}

function renderCartPage(items: CartItem[] = []) {
  const store = configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      cart: cartReducer,
      auth: authReducer,
    },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  });
  items.forEach((item) => store.dispatch(addItem(item)));

  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter>
          <CartPage />
        </MemoryRouter>
      </Provider>
    ),
  };
}

const sampleItem: CartItem = {
  productId: "p1",
  name: "Test Sneakers",
  price: 20,
  quantity: 1,
  imageUrl: "https://example.com/img.png",
};

describe("CartPage", () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom doesn't implement navigation; CartPage sets window.location.href on success.
    Object.defineProperty(window, "location", { value: { href: "" }, writable: true });
  });

  it("shows an empty state when the cart has no items", () => {
    mockCheckout();
    renderCartPage([]);
    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
  });

  it("renders cart items with the correct line total", () => {
    mockCheckout();
    renderCartPage([sampleItem]);
    expect(screen.getByText("Test Sneakers")).toBeInTheDocument();
    expect(screen.getAllByText("20.00 €").length).toBeGreaterThan(0);
  });

  it("increments and decrements the quantity", () => {
    mockCheckout();
    const { store } = renderCartPage([sampleItem]);

    fireEvent.click(screen.getByRole("button", { name: /increase quantity/i }));
    expect(store.getState().cart.items[0].quantity).toBe(2);

    fireEvent.click(screen.getByRole("button", { name: /decrease quantity/i }));
    expect(store.getState().cart.items[0].quantity).toBe(1);
  });

  it("does not decrement the quantity below 1", () => {
    mockCheckout();
    const { store } = renderCartPage([sampleItem]);

    fireEvent.click(screen.getByRole("button", { name: /decrease quantity/i }));
    expect(store.getState().cart.items[0].quantity).toBe(1);
  });

  it("removes an item from the cart", () => {
    mockCheckout();
    const { store } = renderCartPage([sampleItem]);

    fireEvent.click(screen.getByRole("button", { name: /remove item/i }));
    expect(store.getState().cart.items).toHaveLength(0);
  });

  it("submits the shipping address and starts checkout", async () => {
    const trigger = mockCheckout(
      vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ url: "https://checkout.stripe.com/test" }) })
    );
    renderCartPage([sampleItem]);

    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "Testikatu 1" } });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Helsinki" } });
    fireEvent.change(screen.getByLabelText("Postal code"), { target: { value: "00100" } });
    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "FI" } });
    fireEvent.click(screen.getByRole("button", { name: /proceed to checkout/i }));

    await waitFor(() => {
      expect(trigger).toHaveBeenCalledWith({
        items: [{ productId: "p1", quantity: 1 }],
        shippingAddress: { line1: "Testikatu 1", city: "Helsinki", postalCode: "00100", country: "FI" },
      });
    });
  });

  it("shows an inline error when checkout fails, e.g. due to insufficient stock", async () => {
    mockCheckout(vi.fn().mockReturnValue({ unwrap: () => Promise.reject(new Error("Not enough stock")) }));
    renderCartPage([sampleItem]);

    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "Testikatu 1" } });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Helsinki" } });
    fireEvent.change(screen.getByLabelText("Postal code"), { target: { value: "00100" } });
    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "FI" } });
    fireEvent.click(screen.getByRole("button", { name: /proceed to checkout/i }));

    await waitFor(() => {
      expect(screen.getByText(/could not start checkout/i)).toBeInTheDocument();
    });
  });
});
