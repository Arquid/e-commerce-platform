import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import NotFoundPage from "../src/pages/NotFoundPage";

describe("NotFoundPage", () => {
  it("renders a 404 message and a link back home", () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/");
  });
});
