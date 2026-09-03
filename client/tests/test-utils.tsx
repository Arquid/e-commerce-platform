import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { api } from "../src/features/api/apiSlice";
import cartReducer from "../src/features/cart/cartSlice";
import authReducer from "../src/features/auth/authSlice";

function createTestStore() {
  return configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      cart: cartReducer,
      auth: authReducer,
    },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  });
}

export function renderWithProviders(ui: ReactElement, { route = "/" }: { route?: string } = {}) {
  const store = createTestStore();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper }) };
}
