import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminProductsPage from "../src/pages/AdminProductsPage";
import * as productApiSlice from "../src/features/products/productApiSlice";
import type { Product } from "../src/features/products/productApiSlice";

vi.mock("../src/features/products/productApiSlice", async () => {
  const actual = await vi.importActual<typeof productApiSlice>("../src/features/products/productApiSlice");
  return {
    ...actual,
    useGetProductsQuery: vi.fn(),
    useCreateProductMutation: vi.fn(),
    useDeleteProductMutation: vi.fn(),
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

function mockGetProducts(
  data: { products: Product[]; total: number; page: number; pages: number } | undefined,
  isLoading = false
) {
  vi.mocked(productApiSlice.useGetProductsQuery).mockReturnValue({
    data,
    isLoading,
  } as unknown as ReturnType<typeof productApiSlice.useGetProductsQuery>);
}

function mockCreateProduct(trigger = vi.fn(), isError = false) {
  vi.mocked(productApiSlice.useCreateProductMutation).mockReturnValue([
    trigger,
    { isLoading: false, isError },
  ] as unknown as ReturnType<typeof productApiSlice.useCreateProductMutation>);
  return trigger;
}

function mockDeleteProduct(trigger = vi.fn()) {
  vi.mocked(productApiSlice.useDeleteProductMutation).mockReturnValue([
    trigger,
    { isLoading: false },
  ] as unknown as ReturnType<typeof productApiSlice.useDeleteProductMutation>);
  return trigger;
}

describe("AdminProductsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading message while products are loading", () => {
    mockGetProducts(undefined, true);
    mockCreateProduct();
    mockDeleteProduct();

    render(<AdminProductsPage />);
    expect(screen.getByText("Loading products...")).toBeInTheDocument();
  });

  it("shows an empty state when there are no products", () => {
    mockGetProducts({ products: [], total: 0, page: 1, pages: 0 });
    mockCreateProduct();
    mockDeleteProduct();

    render(<AdminProductsPage />);
    expect(screen.getByText("No products yet — add one on the right.")).toBeInTheDocument();
  });

  it("renders a product in the list", () => {
    mockGetProducts({ products: [sampleProduct], total: 1, page: 1, pages: 1 });
    mockCreateProduct();
    mockDeleteProduct();

    render(<AdminProductsPage />);
    expect(screen.getByText("Test Sneakers")).toBeInTheDocument();
    expect(screen.getByText("shoes · 49.99 € · stock 10")).toBeInTheDocument();
  });

  it("submits the form and resets it on success", async () => {
    mockGetProducts({ products: [], total: 0, page: 1, pages: 0 });
    const createTrigger = mockCreateProduct(
      vi.fn().mockReturnValue({ unwrap: () => Promise.resolve(sampleProduct) })
    );
    mockDeleteProduct();

    render(<AdminProductsPage />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Test Sneakers" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "A description" } });
    fireEvent.change(screen.getByLabelText("Price"), { target: { value: "49.99" } });
    fireEvent.change(screen.getByLabelText("Stock"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "shoes" } });
    fireEvent.change(screen.getByLabelText("Image URL"), { target: { value: "https://example.com/img.png" } });
    fireEvent.click(screen.getByRole("button", { name: /add product/i }));

    await waitFor(() => {
      expect(createTrigger).toHaveBeenCalledWith({
        name: "Test Sneakers",
        description: "A description",
        price: 49.99,
        category: "shoes",
        imageUrl: "https://example.com/img.png",
        stock: 10,
      });
    });
    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveValue("");
    });
  });

  it("shows an error message when creating a product fails", () => {
    mockGetProducts({ products: [], total: 0, page: 1, pages: 0 });
    mockCreateProduct(vi.fn(), true);
    mockDeleteProduct();

    render(<AdminProductsPage />);
    expect(
      screen.getByText("Could not create product. Check the fields and try again.")
    ).toBeInTheDocument();
  });

  it("deletes a product after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockGetProducts({ products: [sampleProduct], total: 1, page: 1, pages: 1 });
    mockCreateProduct();
    const deleteTrigger = mockDeleteProduct(vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() }));

    render(<AdminProductsPage />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(deleteTrigger).toHaveBeenCalledWith("p1");
    });
  });

  it("does not delete when the confirmation dialog is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    mockGetProducts({ products: [sampleProduct], total: 1, page: 1, pages: 1 });
    mockCreateProduct();
    const deleteTrigger = mockDeleteProduct();

    render(<AdminProductsPage />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(deleteTrigger).not.toHaveBeenCalled();
  });

  it("shows an inline error when deleting a product fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockGetProducts({ products: [sampleProduct], total: 1, page: 1, pages: 1 });
    mockCreateProduct();
    mockDeleteProduct(vi.fn().mockReturnValue({ unwrap: () => Promise.reject(new Error("network error")) }));

    render(<AdminProductsPage />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(screen.getByText("Delete failed — try again")).toBeInTheDocument();
    });
  });
});
