import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { api } from "../src/features/api/apiSlice";
import authReducer from "../src/features/auth/authSlice";
import AuthBootstrap from "../src/components/AuthBootstrap";
import * as authApiSlice from "../src/features/auth/authApiSlice";
import type { AuthUser } from "../src/features/auth/authApiSlice";

vi.mock("../src/features/auth/authApiSlice", async () => {
  const actual = await vi.importActual<typeof authApiSlice>("../src/features/auth/authApiSlice");
  return { ...actual, useGetMeQuery: vi.fn() };
});

function mockGetMe(data: AuthUser | undefined, isLoading = false) {
  vi.mocked(authApiSlice.useGetMeQuery).mockReturnValue({
    data,
    isLoading,
  } as unknown as ReturnType<typeof authApiSlice.useGetMeQuery>);
}

function renderBootstrap() {
  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  });
  return {
    store,
    ...render(
      <Provider store={store}>
        <AuthBootstrap>
          <div>App content</div>
        </AuthBootstrap>
      </Provider>
    ),
  };
}

describe("AuthBootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state while checking the session, instead of the app", () => {
    mockGetMe(undefined, true);
    renderBootstrap();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("App content")).not.toBeInTheDocument();
  });

  it("renders the app once the session check settles with no logged-in user", async () => {
    mockGetMe(undefined, false);
    renderBootstrap();
    expect(await screen.findByText("App content")).toBeInTheDocument();
  });

  it("has already populated auth.user by the time the app renders — not one render later", async () => {
    // Regression test: the store update happens inside a useEffect, one
    // render after the query itself resolves. A guard like PrivateRoute
    // reads auth.user during render, so if this component ever rendered
    // `children` before that effect ran, a route guard would see no user
    // on its very first render and redirect to /login before finding out
    // it was wrong — even though the session was valid all along.
    const user: AuthUser = { id: "1", name: "Ada", email: "ada@example.com", role: "customer" };
    mockGetMe(user, false);
    const { store } = renderBootstrap();

    await screen.findByText("App content");
    expect(store.getState().auth.user).toEqual(user);
  });
});
