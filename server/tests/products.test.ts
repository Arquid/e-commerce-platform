import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "../src/app";
import User from "../src/models/User";
import Product from "../src/models/Product";
import { connectTestDb, disconnectTestDb, clearTestDb } from "./testDb";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function registerAndLogin(email: string, role: "customer" | "admin" = "customer") {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({
    name: "Product Tester",
    email,
    password: "password123",
  });
  if (role === "admin") {
    await User.updateOne({ email }, { role: "admin" });
  }
  await agent.post("/api/auth/login").send({ email, password: "password123" });
  return agent;
}

const validProduct = {
  name: "Test Sneakers",
  description: "A great pair of test sneakers.",
  price: 49.99,
  category: "shoes",
  imageUrl: "https://example.com/sneakers.png",
  stock: 10,
};

describe("GET /api/products", () => {
  it("returns an empty list when there are no products", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(res.body.products).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it("rejects a non-numeric page parameter instead of returning a broken response", async () => {
    const res = await request(app).get("/api/products?page=not-a-number");
    expect(res.status).toBe(400);
  });

  it("rejects a limit above the maximum allowed page size", async () => {
    const res = await request(app).get("/api/products?limit=1000");
    expect(res.status).toBe(400);
  });

  describe("with products in the catalog", () => {
    // Boots is the oldest. createdAt is set explicitly: products created back
    // to back can share a millisecond, which would make the order a coin flip.
    async function seed() {
      let created = Date.parse("2026-01-01T00:00:00Z");
      const make = (name: string, price: number, category: string, description = "A fine product.") =>
        Product.create({ ...validProduct, name, price, category, description, createdAt: new Date((created += 1000)) });
      await make("Boots", 80, "shoes", "Sturdy leather boots.");
      await make("Sandals", 20, "shoes", "Light summer footwear.");
      await make("Laptop", 900, "electronics", "Fast portable computer.");
      await make("Mouse", 25, "electronics");
    }

    const namesOf = (res: request.Response) => res.body.products.map((p: { name: string }) => p.name);

    it("lists the newest products first by default", async () => {
      await seed();
      const res = await request(app).get("/api/products");
      expect(namesOf(res)).toEqual(["Mouse", "Laptop", "Sandals", "Boots"]);
    });

    it("filters by category", async () => {
      await seed();
      const res = await request(app).get("/api/products?category=shoes");
      expect(namesOf(res).sort()).toEqual(["Boots", "Sandals"]);
      expect(res.body.total).toBe(2);
    });

    it("filters by a price range, inclusive at both ends", async () => {
      await seed();
      const res = await request(app).get("/api/products?minPrice=25&maxPrice=80&sort=price_asc");
      expect(namesOf(res)).toEqual(["Mouse", "Boots"]);
    });

    it("applies a minimum or a maximum price on its own", async () => {
      await seed();
      expect(namesOf(await request(app).get("/api/products?minPrice=80&sort=price_asc"))).toEqual(["Boots", "Laptop"]);
      expect(namesOf(await request(app).get("/api/products?maxPrice=25&sort=price_asc"))).toEqual(["Sandals", "Mouse"]);
    });

    it("treats a price of 0 as a real limit rather than as no limit", async () => {
      await seed();
      const res = await request(app).get("/api/products?maxPrice=0");
      expect(res.body.total).toBe(0);
    });

    it("searches names and descriptions", async () => {
      await seed();
      const byName = await request(app).get("/api/products?search=laptop");
      expect(namesOf(byName)).toEqual(["Laptop"]);
      const byDescription = await request(app).get("/api/products?search=leather");
      expect(namesOf(byDescription)).toEqual(["Boots"]);
    });

    it("combines search with other filters", async () => {
      await seed();
      const res = await request(app).get("/api/products?search=leather&category=electronics");
      expect(res.body.total).toBe(0);
    });

    it("sorts by price, ascending or descending", async () => {
      await seed();
      expect(namesOf(await request(app).get("/api/products?sort=price_asc"))).toEqual([
        "Sandals", "Mouse", "Boots", "Laptop",
      ]);
      expect(namesOf(await request(app).get("/api/products?sort=price_desc"))).toEqual([
        "Laptop", "Boots", "Mouse", "Sandals",
      ]);
    });

    it("falls back to newest-first for an unknown sort", async () => {
      await seed();
      const res = await request(app).get("/api/products?sort=bogus");
      expect(res.status).toBe(200);
      expect(namesOf(res)).toEqual(["Mouse", "Laptop", "Sandals", "Boots"]);
    });

    it("paginates, reporting the total across all pages", async () => {
      await seed();
      const second = await request(app).get("/api/products?sort=price_asc&page=2&limit=3");
      expect(namesOf(second)).toEqual(["Laptop"]);
      expect(second.body).toMatchObject({ total: 4, page: 2, pages: 2 });
    });

    it("returns an empty page past the last one", async () => {
      await seed();
      const res = await request(app).get("/api/products?page=9&limit=3");
      expect(res.status).toBe(200);
      expect(res.body.products).toEqual([]);
      expect(res.body.total).toBe(4);
    });

    it.each(["minPrice=abc", "maxPrice=abc", "minPrice=-5", "maxPrice=-1"])(
      "rejects the invalid price filter %s instead of failing with a server error",
      async (query) => {
        const res = await request(app).get(`/api/products?${query}`);
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Validation failed");
      }
    );

    it("ignores query operators smuggled into a filter", async () => {
      await seed();
      const res = await request(app).get("/api/products?category[$ne]=shoes&search[$ne]=x");
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(4);
    });
  });
});

describe("GET /api/products/:id", () => {
  it("returns the product", async () => {
    const product = await Product.create(validProduct);
    const res = await request(app).get(`/api/products/${product.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ _id: product.id, name: validProduct.name, price: validProduct.price });
  });

  it("returns 404 for a product that doesn't exist", async () => {
    const res = await request(app).get("/api/products/000000000000000000000000");
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Product not found");
  });

  it("returns 400, not a server error, for a malformed id", async () => {
    const res = await request(app).get("/api/products/not-an-id");
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid value for _id");
  });
});

describe("POST /api/products", () => {
  it("rejects the request when not authenticated", async () => {
    const res = await request(app).post("/api/products").send(validProduct);
    expect(res.status).toBe(401);
  });

  it("rejects the request for a non-admin user", async () => {
    const agent = await registerAndLogin("customer@example.com", "customer");
    const res = await agent.post("/api/products").send(validProduct);
    expect(res.status).toBe(403);
  });

  it("rejects invalid product data for an admin user", async () => {
    const agent = await registerAndLogin("admin@example.com", "admin");
    const res = await agent.post("/api/products").send({ name: "", price: -5, imageUrl: "not-a-url" });
    expect(res.status).toBe(400);
  });

  it.each([
    ["a price of 0", { price: 0 }],
    ["a fractional stock", { stock: 1.5 }],
    ["a negative stock", { stock: -1 }],
    ["a rating above 5", { rating: 6 }],
    ["a missing category", { category: undefined }],
  ])("rejects %s", async (_label, change) => {
    const agent = await registerAndLogin("admin-invalid@example.com", "admin");
    const res = await agent.post("/api/products").send({ ...validProduct, ...change });
    expect(res.status).toBe(400);
    expect(await Product.countDocuments()).toBe(0);
  });

  it("creates a product for an admin user with valid data", async () => {
    const agent = await registerAndLogin("admin2@example.com", "admin");
    const res = await agent.post("/api/products").send(validProduct);

    expect(res.status).toBe(201);
    expect(res.body.name).toBe(validProduct.name);

    const list = await request(app).get("/api/products");
    expect(list.body.total).toBe(1);
  });
});

describe("DELETE /api/products/:id", () => {
  it("rejects the request when not authenticated", async () => {
    const res = await request(app).delete("/api/products/000000000000000000000000");
    expect(res.status).toBe(401);
  });

  it("rejects the request for a non-admin user", async () => {
    const agent = await registerAndLogin("customer2@example.com", "customer");
    const res = await agent.delete("/api/products/000000000000000000000000");
    expect(res.status).toBe(403);
  });

  it("returns 404 for a non-existent product", async () => {
    const agent = await registerAndLogin("admin3@example.com", "admin");
    const res = await agent.delete("/api/products/000000000000000000000000");
    expect(res.status).toBe(404);
  });

  it("returns 400, not a server error, for a malformed id", async () => {
    const agent = await registerAndLogin("admin-badid@example.com", "admin");
    const res = await agent.delete("/api/products/not-an-id");
    expect(res.status).toBe(400);
  });

  it("deletes an existing product for an admin user", async () => {
    const agent = await registerAndLogin("admin4@example.com", "admin");
    const created = await agent.post("/api/products").send(validProduct);

    const res = await agent.delete(`/api/products/${created.body._id}`);
    expect(res.status).toBe(200);

    const list = await request(app).get("/api/products");
    expect(list.body.total).toBe(0);
  });
});
