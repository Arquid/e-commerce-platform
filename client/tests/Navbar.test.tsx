import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import Navbar from "../src/components/Navbar";
import * as authApiSlice from "../src/features/auth/authApiSlice";

vi.mock("../src/features/auth/authApiSlice", async () => {
  const actual = await vi.importActual<typeof authApiSlice>("../src/features/auth/authApiSlice");
  return { ...actual, useLogoutMutation: vi.fn() };
});

function mockLogout(trigger = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ message: "ok" }) })) {
  vi.mocked(authApiSlice.useLogoutMutation).mockReturnValue([
    trigger,
    { isLoading: false },
  ] as unknown as ReturnType<typeof authApiSlice.useLogoutMutation>);
  return trigger;
}

const user = { id: "1", name: "Ada", email: "ada@example.com", role: "customer" };

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows login/signup links when logged out", () => {
    mockLogout();
    renderWithProviders(<Navbar />, { preloadedState: { auth: { user: null } } });
    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Log out" })).not.toBeInTheDocument();
  });

  it("calls the logout endpoint and clears the user when 'Log out' is clicked", async () => {
    const trigger = mockLogout();
    const { store } = renderWithProviders(<Navbar />, { preloadedState: { auth: { user } } });

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() => {
      expect(trigger).toHaveBeenCalled();
      expect(store.getState().auth.user).toBeNull();
    });
  });

  it("clears the local user even if the logout request fails", async () => {
    const trigger = mockLogout(vi.fn().mockReturnValue({ unwrap: () => Promise.reject(new Error("network")) }));
    const { store } = renderWithProviders(<Navbar />, { preloadedState: { auth: { user } } });

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() => {
      expect(trigger).toHaveBeenCalled();
      expect(store.getState().auth.user).toBeNull();
    });
  });

  it("shows the Admin link only for admin users", () => {
    mockLogout();
    renderWithProviders(<Navbar />, { preloadedState: { auth: { user: { ...user, role: "admin" } } } });
    expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
  });
});
