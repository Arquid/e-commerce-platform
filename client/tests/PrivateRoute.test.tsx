import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders } from "./test-utils";
import PrivateRoute from "../src/components/PrivateRoute";

const user = { id: "1", name: "Ada", email: "ada@example.com", role: "customer" };

function renderGuarded(preloadedState?: { auth?: { user: typeof user | null } }) {
  return renderWithProviders(
    <Routes>
      <Route element={<PrivateRoute />}>
        <Route path="/protected" element={<div>Protected content</div>} />
      </Route>
      <Route path="/login" element={<div>Login page</div>} />
    </Routes>,
    { route: "/protected", preloadedState }
  );
}

describe("PrivateRoute", () => {
  it("redirects to /login when there is no logged-in user", () => {
    renderGuarded({ auth: { user: null } });
    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders the protected route when a user is logged in", () => {
    renderGuarded({ auth: { user } });
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
