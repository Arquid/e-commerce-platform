import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { api } from "../src/features/api/apiSlice";
import cartReducer from "../src/features/cart/cartSlice";
import authReducer, { type AuthState } from "../src/features/auth/authSlice";

function createTestStore(preloadedState?: { auth?: Partial<AuthState> }) {
  return configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      cart: cartReducer,
      auth: authReducer,
    },
    middleware: (getDefault) => getDefault().concat(api.middleware),
    preloadedState: preloadedState?.auth ? { auth: preloadedState.auth as AuthState } : undefined,
  });
}

export function renderWithProviders(
  ui: ReactElement,
  { route = "/", preloadedState }: { route?: string; preloadedState?: { auth?: Partial<AuthState> } } = {}
) {
  const store = createTestStore(preloadedState);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper }) };
}
