import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { api } from "../src/features/api/apiSlice";
import cartReducer, { type CartItem } from "../src/features/cart/cartSlice";
import authReducer, { type AuthState } from "../src/features/auth/authSlice";

interface PreloadedState {
  auth?: Partial<AuthState>;
  cart?: { items: CartItem[] };
}

const rootReducer = combineReducers({
  [api.reducerPath]: api.reducer,
  cart: cartReducer,
  auth: authReducer,
});

function createTestStore(preloadedState?: PreloadedState) {
  // The cart slice reads localStorage once, at import, so seeding it per
  // test has to happen here rather than through localStorage.
  const initial: Partial<ReturnType<typeof rootReducer>> = {};
  if (preloadedState?.auth) initial.auth = preloadedState.auth as AuthState;
  if (preloadedState?.cart) initial.cart = preloadedState.cart;

  return configureStore({
    reducer: rootReducer,
    middleware: (getDefault) => getDefault().concat(api.middleware),
    preloadedState: initial,
  });
}

export function renderWithProviders(
  ui: ReactElement,
  { route = "/", preloadedState }: { route?: string; preloadedState?: PreloadedState } = {}
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
