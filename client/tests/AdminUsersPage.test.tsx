import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import AdminUsersPage from "../src/pages/AdminUsersPage";
import * as usersApiSlice from "../src/features/admin/usersApiSlice";
import type { AdminUser } from "../src/features/admin/usersApiSlice";

vi.mock("../src/features/admin/usersApiSlice", async () => {
  const actual = await vi.importActual<typeof usersApiSlice>("../src/features/admin/usersApiSlice");
  return {
    ...actual,
    useGetUsersQuery: vi.fn(),
    useUpdateUserRoleMutation: vi.fn(),
  };
});

const currentAdmin = { id: "admin1", name: "Root Admin", email: "root@example.com", role: "admin" };

const mockUser: AdminUser = {
  _id: "user123456",
  name: "Alice Example",
  email: "alice@example.com",
  role: "customer",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function mockGetUsers(users: AdminUser[] | undefined, isLoading = false, page = 1, pages = 1) {
  vi.mocked(usersApiSlice.useGetUsersQuery).mockReturnValue({
    data: users && { users, total: users.length, page, pages },
    isLoading,
  } as unknown as ReturnType<typeof usersApiSlice.useGetUsersQuery>);
}

function mockUpdateUserRole(trigger = vi.fn()) {
  vi.mocked(usersApiSlice.useUpdateUserRoleMutation).mockReturnValue([
    trigger,
    { isLoading: false },
  ] as unknown as ReturnType<typeof usersApiSlice.useUpdateUserRoleMutation>);
  return trigger;
}

function renderPage(users: AdminUser[] | undefined, isLoading = false) {
  mockGetUsers(users, isLoading);
  return renderWithProviders(<AdminUsersPage />, { preloadedState: { auth: { user: currentAdmin } } });
}

describe("AdminUsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading message while users are loading", () => {
    mockUpdateUserRole();
    renderPage(undefined, true);
    expect(screen.getByText("Loading users...")).toBeInTheDocument();
  });

  it("shows an empty state when there are no users", () => {
    mockUpdateUserRole();
    renderPage([]);
    expect(screen.getByText("No users yet.")).toBeInTheDocument();
  });

  it("renders each user's name, email and current role", () => {
    mockUpdateUserRole();
    renderPage([mockUser]);
    expect(screen.getByText("Alice Example")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("customer");
  });

  it("calls the mutation when a new role is selected", async () => {
    const trigger = mockUpdateUserRole(vi.fn().mockReturnValue({ unwrap: () => Promise.resolve(mockUser) }));
    renderPage([mockUser]);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "admin" } });

    await waitFor(() => {
      expect(trigger).toHaveBeenCalledWith({ id: "user123456", role: "admin" });
    });
  });

  it("shows an inline error when the mutation fails", async () => {
    mockUpdateUserRole(vi.fn().mockReturnValue({ unwrap: () => Promise.reject(new Error("network error")) }));
    renderPage([mockUser]);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "admin" } });

    await waitFor(() => {
      expect(screen.getByText("Update failed — try again")).toBeInTheDocument();
    });
  });

  it("disables the role selector for the currently logged-in admin", () => {
    mockUpdateUserRole();
    const self: AdminUser = { ...mockUser, _id: "admin1", name: "Root Admin", email: "root@example.com", role: "admin" };
    renderPage([self]);

    expect(screen.getByText("(you)")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
