import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import HomePage from "../src/pages/HomePage";
import * as productApiSlice from "../src/features/products/productApiSlice";
import type { Product } from "../src/features/products/productApiSlice";

vi.mock("../src/features/products/productApiSlice", async () => {
  const actual = await vi.importActual<typeof productApiSlice>("../src/features/products/productApiSlice");
  return {
    ...actual,
    useGetProductsQuery: vi.fn(),
  };
});

const sampleProduct: Product = {
  _id: "p1",
  name: "Test Sneakers",
  description: "A great pair of test sneakers.",
  price: 49.99,
  category: "shoes",
  imageUrl: "https://example.com/img.png",
  stock: 10,
  rating: 4.5,
};

function mockProducts(overrides: {
  data?: { products: Product[]; total: number; page: number; pages: number };
  isLoading?: boolean;
  isError?: boolean;
}) {
  vi.mocked(productApiSlice.useGetProductsQuery).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  } as unknown as ReturnType<typeof productApiSlice.useGetProductsQuery>);
}

function lastQueryArgs() {
  return vi.mocked(productApiSlice.useGetProductsQuery).mock.calls.at(-1)?.[0];
}

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading skeleton while products are loading", () => {
    mockProducts({ isLoading: true });
    const { container } = renderWithProviders(<HomePage />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(8);
  });

  it("shows an error message when the request fails", () => {
    mockProducts({ isError: true });
    renderWithProviders(<HomePage />);
    expect(screen.getByText("Failed to load products. Please try again later.")).toBeInTheDocument();
  });

  it("shows an empty state when there are no products", () => {
    mockProducts({ data: { products: [], total: 0, page: 1, pages: 0 } });
    renderWithProviders(<HomePage />);
    expect(screen.getByText("No products found")).toBeInTheDocument();
  });

  it("renders the product grid", () => {
    mockProducts({ data: { products: [sampleProduct], total: 1, page: 1, pages: 1 } });
    renderWithProviders(<HomePage />);
    expect(screen.getByText("Test Sneakers")).toBeInTheDocument();
  });

  it("requests products filtered by the search term", () => {
    mockProducts({ data: { products: [], total: 0, page: 1, pages: 0 } });
    renderWithProviders(<HomePage />);

    fireEvent.change(screen.getByPlaceholderText("Search products..."), { target: { value: "sneakers" } });

    expect(lastQueryArgs()).toMatchObject({ search: "sneakers", page: 1 });
  });

  it("requests products filtered by category", () => {
    mockProducts({ data: { products: [], total: 0, page: 1, pages: 0 } });
    renderWithProviders(<HomePage />);

    fireEvent.change(screen.getByDisplayValue("All categories"), { target: { value: "shoes" } });

    expect(lastQueryArgs()).toMatchObject({ category: "shoes", page: 1 });
  });

  it("requests the next page when a pagination button is clicked", () => {
    mockProducts({ data: { products: [sampleProduct], total: 24, page: 1, pages: 2 } });
    renderWithProviders(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    expect(lastQueryArgs()).toMatchObject({ page: 2 });
  });
});
