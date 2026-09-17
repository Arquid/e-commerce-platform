import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Pagination from "../src/components/Pagination";

describe("Pagination", () => {
  it("renders nothing when there is only one page", () => {
    const { container } = render(<Pagination page={1} pages={1} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a button per page and highlights the current one", () => {
    render(<Pagination page={2} pages={3} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
  });

  it("calls onPageChange with the clicked page number", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} pages={3} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
