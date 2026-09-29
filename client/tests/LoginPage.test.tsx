import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders } from "./test-utils";
import LoginPage from "../src/pages/LoginPage";
import * as authApiSlice from "../src/features/auth/authApiSlice";

vi.mock("../src/features/auth/authApiSlice", async () => {
  const actual = await vi.importActual<typeof authApiSlice>("../src/features/auth/authApiSlice");
  return { ...actual, useLoginMutation: vi.fn() };
});

const user = { id: "u1", name: "Ada", email: "ada@example.com", role: "customer" };

function mockLogin({ trigger = vi.fn(), isLoading = false, isError = false } = {}) {
  vi.mocked(authApiSlice.useLoginMutation).mockReturnValue([
    trigger,
    { isLoading, isError },
  ] as unknown as ReturnType<typeof authApiSlice.useLoginMutation>);
  return trigger;
}

function renderLogin() {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<div>Home page</div>} />
    </Routes>,
    { route: "/login" }
  );
}

function submit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Log in" }));
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs in with the entered credentials, stores the user and goes to the home page", async () => {
    const trigger = mockLogin({
      trigger: vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ user }) }),
    });
    const { store } = renderLogin();

    submit("ada@example.com", "secret123");

    expect(await screen.findByText("Home page")).toBeInTheDocument();
    expect(trigger).toHaveBeenCalledWith({ email: "ada@example.com", password: "secret123" });
    expect(store.getState().auth.user).toEqual(user);
  });

  it("stays on the page and doesn't store a user when login is rejected", async () => {
    const trigger = mockLogin({
      trigger: vi.fn().mockReturnValue({ unwrap: () => Promise.reject({ status: 401 }) }),
    });
    const { store } = renderLogin();

    submit("ada@example.com", "wrong-password");

    await waitFor(() => expect(trigger).toHaveBeenCalled());
    expect(screen.queryByText("Home page")).not.toBeInTheDocument();
    expect(store.getState().auth.user).toBeNull();
  });

  it("shows an error message when the login request has failed", () => {
    mockLogin({ isError: true });
    renderLogin();
    expect(screen.getByText("Invalid email or password.")).toBeInTheDocument();
  });

  it("disables the button while the request is in flight", () => {
    mockLogin({ isLoading: true });
    renderLogin();
    expect(screen.getByRole("button", { name: "Logging in..." })).toBeDisabled();
  });

  it("links to the sign-up page", () => {
    mockLogin();
    renderLogin();
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/register");
  });
});
