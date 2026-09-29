import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders } from "./test-utils";
import ProductDetailPage from "../src/pages/ProductDetailPage";
import * as productApiSlice from "../src/features/products/productApiSlice";
import type { Product } from "../src/features/products/productApiSlice";

vi.mock("../src/features/products/productApiSlice", async () => {
  const actual = await vi.importActual<typeof productApiSlice>("../src/features/products/productApiSlice");
  return { ...actual, useGetProductByIdQuery: vi.fn() };
});

const product: Product = {
  _id: "p1",
  name: "Trail Runner Sneakers",
  description: "Lightweight running shoes.",
  price: 89.9,
  category: "shoes",
  imageUrl: "https://example.com/img.png",
  stock: 25,
  rating: 4.5,
};

function mockProduct(overrides: { data?: Product; isLoading?: boolean; isError?: boolean }) {
  vi.mocked(productApiSlice.useGetProductByIdQuery).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  } as unknown as ReturnType<typeof productApiSlice.useGetProductByIdQuery>);
}

function renderDetail(id = "p1") {
  return renderWithProviders(
    <Routes>
      <Route path="/products/:id" element={<ProductDetailPage />} />
    </Routes>,
    { route: `/products/${id}` }
  );
}

describe("ProductDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches the product whose id is in the URL", () => {
    mockProduct({ data: product });
    renderDetail("p1");
    expect(productApiSlice.useGetProductByIdQuery).toHaveBeenCalledWith("p1");
  });

  it("shows neither the product nor an error while loading", () => {
    mockProduct({ isLoading: true });
    renderDetail();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByText("Product not found")).not.toBeInTheDocument();
  });

  it("shows 'Product not found' with a way back when the request fails", () => {
    mockProduct({ isError: true });
    renderDetail("does-not-exist");
    expect(screen.getByText("Product not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to all products" })).toHaveAttribute("href", "/");
  });

  it("shows the product's details and how many are left", () => {
    mockProduct({ data: product });
    renderDetail();

    expect(screen.getByRole("heading", { name: "Trail Runner Sneakers" })).toBeInTheDocument();
    expect(screen.getByText("shoes")).toBeInTheDocument();
    expect(screen.getByText("89.90 €")).toBeInTheDocument();
    expect(screen.getByText("Lightweight running shoes.")).toBeInTheDocument();
    expect(screen.getByText("In stock (25 left)")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Trail Runner Sneakers" })).toHaveAttribute("src", product.imageUrl);
  });

  it("marks a sold-out product and won't let it be added to the cart", () => {
    mockProduct({ data: { ...product, stock: 0 } });
    renderDetail();

    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeDisabled();
  });

  it("adds one unit to the cart and briefly confirms it", () => {
    vi.useFakeTimers();
    mockProduct({ data: product });
    const { store } = renderDetail();

    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));

    expect(store.getState().cart.items).toEqual([
      { productId: "p1", name: "Trail Runner Sneakers", price: 89.9, quantity: 1, imageUrl: product.imageUrl },
    ]);
    expect(screen.getByRole("button", { name: "Added ✓" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeInTheDocument();
  });
});
