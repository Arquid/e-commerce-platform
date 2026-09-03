import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "../src/app";
import User from "../src/models/User";
import { connectTestDb, disconnectTestDb, clearTestDb } from "./testDb";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function registerAndLogin(email: string, role: "customer" | "admin" = "customer") {
  await request(app).post("/api/auth/register").send({
    name: "Product Tester",
    email,
    password: "password123",
  });
  if (role === "admin") {
    await User.updateOne({ email }, { role: "admin" });
  }
  const loginRes = await request(app).post("/api/auth/login").send({ email, password: "password123" });
  return loginRes.body.token as string;
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
});

describe("POST /api/products", () => {
  it("rejects the request when not authenticated", async () => {
    const res = await request(app).post("/api/products").send(validProduct);
    expect(res.status).toBe(401);
  });

  it("rejects the request for a non-admin user", async () => {
    const token = await registerAndLogin("customer@example.com", "customer");
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send(validProduct);
    expect(res.status).toBe(403);
  });

  it("rejects invalid product data for an admin user", async () => {
    const token = await registerAndLogin("admin@example.com", "admin");
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "", price: -5, imageUrl: "not-a-url" });
    expect(res.status).toBe(400);
  });

  it("creates a product for an admin user with valid data", async () => {
    const token = await registerAndLogin("admin2@example.com", "admin");
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send(validProduct);

    expect(res.status).toBe(201);
    expect(res.body.name).toBe(validProduct.name);

    const list = await request(app).get("/api/products");
    expect(list.body.total).toBe(1);
  });
});
