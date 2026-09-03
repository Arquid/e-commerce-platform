import { describe, it, expect } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import ProductCard from "../src/components/ProductCard";
import type { Product } from "../src/features/products/productApiSlice";

const product: Product = {
  _id: "1",
  name: "Test Sneakers",
  description: "A great pair of test sneakers.",
  price: 49.99,
  category: "shoes",
  imageUrl: "https://example.com/img.png",
  stock: 10,
  rating: 4.5,
};

describe("ProductCard", () => {
  it("renders the product name, category and price", () => {
    renderWithProviders(<ProductCard product={product} />);
    expect(screen.getByText("Test Sneakers")).toBeInTheDocument();
    expect(screen.getByText("shoes")).toBeInTheDocument();
    expect(screen.getByText("49.99 €")).toBeInTheDocument();
  });

  it("links both the image and the title to the product detail page", () => {
    renderWithProviders(<ProductCard product={product} />);
    const links = screen.getAllByRole("link", { name: /test sneakers/i });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link).toHaveAttribute("href", "/products/1"));
  });

  it("adds the product to the cart when 'Add to cart' is clicked", () => {
    const { store } = renderWithProviders(<ProductCard product={product} />);
    fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));

    const state = store.getState();
    expect(state.cart.items).toHaveLength(1);
    expect(state.cart.items[0]).toMatchObject({
      productId: "1",
      name: "Test Sneakers",
      price: 49.99,
      quantity: 1,
    });
  });
});
