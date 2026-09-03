import { describe, it, expect, beforeEach, vi } from "vitest";

describe("cartSlice", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("starts empty when localStorage has no cart", async () => {
    const { default: reducer } = await import("../src/features/cart/cartSlice");
    expect(reducer(undefined, { type: "@@INIT" })).toEqual({ items: [] });
  });

  it("restores persisted items from localStorage on load", async () => {
    localStorage.setItem(
      "cart",
      JSON.stringify([{ productId: "1", name: "X", price: 10, quantity: 2, imageUrl: "x.png" }])
    );
    const { default: reducer } = await import("../src/features/cart/cartSlice");
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.items).toHaveLength(1);
    expect(state.items[0].productId).toBe("1");
  });

  it("adds a new item and persists it", async () => {
    const { default: reducer, addItem } = await import("../src/features/cart/cartSlice");
    const state = reducer(
      undefined,
      addItem({ productId: "1", name: "X", price: 10, quantity: 1, imageUrl: "x.png" })
    );
    expect(state.items).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem("cart")!)).toHaveLength(1);
  });

  it("increments quantity when the same product is added again", async () => {
    const { default: reducer, addItem } = await import("../src/features/cart/cartSlice");
    let state = reducer(
      undefined,
      addItem({ productId: "1", name: "X", price: 10, quantity: 1, imageUrl: "x.png" })
    );
    state = reducer(state, addItem({ productId: "1", name: "X", price: 10, quantity: 2, imageUrl: "x.png" }));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(3);
  });

  it("removes an item", async () => {
    const { default: reducer, addItem, removeItem } = await import("../src/features/cart/cartSlice");
    let state = reducer(
      undefined,
      addItem({ productId: "1", name: "X", price: 10, quantity: 1, imageUrl: "x.png" })
    );
    state = reducer(state, removeItem("1"));
    expect(state.items).toHaveLength(0);
  });

  it("updates the quantity of an existing item", async () => {
    const { default: reducer, addItem, updateQuantity } = await import("../src/features/cart/cartSlice");
    let state = reducer(
      undefined,
      addItem({ productId: "1", name: "X", price: 10, quantity: 1, imageUrl: "x.png" })
    );
    state = reducer(state, updateQuantity({ productId: "1", quantity: 5 }));
    expect(state.items[0].quantity).toBe(5);
  });

  it("clears the cart and removes it from localStorage", async () => {
    const { default: reducer, addItem, clearCart } = await import("../src/features/cart/cartSlice");
    let state = reducer(
      undefined,
      addItem({ productId: "1", name: "X", price: 10, quantity: 1, imageUrl: "x.png" })
    );
    state = reducer(state, clearCart());
    expect(state.items).toHaveLength(0);
    expect(localStorage.getItem("cart")).toBeNull();
  });
});
