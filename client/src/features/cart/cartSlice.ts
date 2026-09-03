import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface CartItem { productId: string; name: string; price: number; quantity: number; imageUrl: string; }
interface CartState { items: CartItem[]; }

const loadCart = (): CartItem[] => {
  try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; }
};

const initialState: CartState = { items: loadCart() };

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find((i) => i.productId === action.payload.productId);
      if (existing) existing.quantity += action.payload.quantity;
      else state.items.push(action.payload);
      localStorage.setItem("cart", JSON.stringify(state.items));
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.productId !== action.payload);
      localStorage.setItem("cart", JSON.stringify(state.items));
    },
    updateQuantity(state, action: PayloadAction<{ productId: string; quantity: number; }>) {
      const item = state.items.find((i) => i.productId === action.payload.productId);
      if (item) item.quantity = action.payload.quantity;
      localStorage.setItem("cart", JSON.stringify(state.items));
    },
    clearCart(state) {
      state.items = [];
      localStorage.removeItem("cart");
    }
  }
});

export const { addItem, removeItem, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;