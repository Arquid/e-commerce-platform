import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders } from "./test-utils";
import RegisterPage from "../src/pages/RegisterPage";
import * as authApiSlice from "../src/features/auth/authApiSlice";

vi.mock("../src/features/auth/authApiSlice", async () => {
  const actual = await vi.importActual<typeof authApiSlice>("../src/features/auth/authApiSlice");
  return { ...actual, useRegisterMutation: vi.fn() };
});

const user = { id: "u2", name: "Grace", email: "grace@example.com", role: "customer" };

function mockRegister({ trigger = vi.fn(), isLoading = false, isError = false } = {}) {
  vi.mocked(authApiSlice.useRegisterMutation).mockReturnValue([
    trigger,
    { isLoading, isError },
  ] as unknown as ReturnType<typeof authApiSlice.useRegisterMutation>);
  return trigger;
}

function renderRegister() {
  return renderWithProviders(
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<div>Home page</div>} />
    </Routes>,
    { route: "/register" }
  );
}

function submit(name: string, email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers with the entered details, stores the user and goes to the home page", async () => {
    const trigger = mockRegister({
      trigger: vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ user }) }),
    });
    const { store } = renderRegister();

    submit("Grace", "grace@example.com", "secret123");

    expect(await screen.findByText("Home page")).toBeInTheDocument();
    expect(trigger).toHaveBeenCalledWith({ name: "Grace", email: "grace@example.com", password: "secret123" });
    expect(store.getState().auth.user).toEqual(user);
  });

  it("stays on the page and doesn't store a user when registration is rejected", async () => {
    const trigger = mockRegister({
      trigger: vi.fn().mockReturnValue({ unwrap: () => Promise.reject({ status: 409 }) }),
    });
    const { store } = renderRegister();

    submit("Grace", "taken@example.com", "secret123");

    await waitFor(() => expect(trigger).toHaveBeenCalled());
    expect(screen.queryByText("Home page")).not.toBeInTheDocument();
    expect(store.getState().auth.user).toBeNull();
  });

  it("shows an error message when registration has failed", () => {
    mockRegister({ isError: true });
    renderRegister();
    expect(screen.getByText("Registration failed. Try a different email.")).toBeInTheDocument();
  });

  it("requires a password of at least 6 characters, matching the server's rule", () => {
    mockRegister();
    renderRegister();
    expect(screen.getByLabelText("Password")).toHaveAttribute("minLength", "6");
  });

  it("disables the button while the request is in flight", () => {
    mockRegister({ isLoading: true });
    renderRegister();
    expect(screen.getByRole("button", { name: "Signing up..." })).toBeDisabled();
  });

  it("links to the login page", () => {
    mockRegister();
    renderRegister();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });
});
