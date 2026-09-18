import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders } from "./test-utils";
import AdminRoute from "../src/components/AdminRoute";

function renderGuarded(user: { id: string; name: string; email: string; role: string } | null) {
  return renderWithProviders(
    <Routes>
      <Route element={<AdminRoute />}>
        <Route path="/admin/products" element={<div>Admin content</div>} />
      </Route>
      <Route path="/login" element={<div>Login page</div>} />
      <Route path="/" element={<div>Home page</div>} />
    </Routes>,
    { route: "/admin/products", preloadedState: { auth: { user } } }
  );
}

describe("AdminRoute", () => {
  it("redirects to /login when there is no logged-in user", () => {
    renderGuarded(null);
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects to / when the logged-in user is not an admin", () => {
    renderGuarded({ id: "1", name: "Ada", email: "ada@example.com", role: "customer" });
    expect(screen.getByText("Home page")).toBeInTheDocument();
    expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
  });

  it("renders the admin route for an admin user", () => {
    renderGuarded({ id: "2", name: "Root", email: "root@example.com", role: "admin" });
    expect(screen.getByText("Admin content")).toBeInTheDocument();
  });
});
