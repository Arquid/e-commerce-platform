import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "../src/app";
import User from "../src/models/User";
import Order from "../src/models/Order";
import Product from "../src/models/Product";
import { connectTestDb, disconnectTestDb, clearTestDb } from "./testDb";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function registerAndLogin(email: string, role: "customer" | "admin" = "customer") {
  await request(app).post("/api/auth/register").send({
    name: "Order Tester",
    email,
    password: "password123",
  });
  if (role === "admin") {
    await User.updateOne({ email }, { role: "admin" });
  }
  const res = await request(app).post("/api/auth/login").send({ email, password: "password123" });
  return res.body as { token: string; user: { id: string } };
}

type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

async function createOrderFor(userId: string, status: OrderStatus = "pending") {
  const product = await Product.create({
    name: "Order Test Product",
    description: "For order testing",
    price: 20,
    category: "electronics",
    imageUrl: "https://example.com/product.png",
    stock: 5,
  });

  return Order.create({
    user: userId,
    items: [{ product: product._id, name: product.name, quantity: 1, price: product.price }],
    totalAmount: product.price,
    shippingAddress: { line1: "Test street 1", city: "Helsinki", postalCode: "00100", country: "FI" },
    status,
  });
}

describe("GET /api/orders", () => {
  it("rejects the request when not authenticated", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(401);
  });

  it("returns only the logged-in user's own orders", async () => {
    const alice = await registerAndLogin("alice@example.com");
    const bob = await registerAndLogin("bob@example.com");
    await createOrderFor(alice.user.id);
    await createOrderFor(bob.user.id);

    const res = await request(app).get("/api/orders").set("Authorization", `Bearer ${alice.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe("GET /api/orders/:id", () => {
  it("returns 404 for another user's order", async () => {
    const alice = await registerAndLogin("alice2@example.com");
    const bob = await registerAndLogin("bob2@example.com");
    const order = await createOrderFor(bob.user.id);

    const res = await request(app)
      .get(`/api/orders/${order.id}`)
      .set("Authorization", `Bearer ${alice.token}`);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/orders/all", () => {
  it("rejects a non-admin user", async () => {
    const alice = await registerAndLogin("alice3@example.com");
    const res = await request(app).get("/api/orders/all").set("Authorization", `Bearer ${alice.token}`);
    expect(res.status).toBe(403);
  });

  it("returns every order for an admin user", async () => {
    const alice = await registerAndLogin("alice4@example.com");
    const admin = await registerAndLogin("admin5@example.com", "admin");
    await createOrderFor(alice.user.id);
    await createOrderFor(admin.user.id);

    const res = await request(app).get("/api/orders/all").set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe("PATCH /api/orders/:id/status", () => {
  it("rejects a non-admin user", async () => {
    const alice = await registerAndLogin("alice5@example.com");
    const order = await createOrderFor(alice.user.id);

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ status: "shipped" });
    expect(res.status).toBe(403);
  });

  it("rejects an invalid status value", async () => {
    const alice = await registerAndLogin("alice6@example.com");
    const admin = await registerAndLogin("admin6@example.com", "admin");
    const order = await createOrderFor(alice.user.id);

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "not-a-real-status" });
    expect(res.status).toBe(400);
  });

  it("updates the order status for an admin user", async () => {
    const alice = await registerAndLogin("alice7@example.com");
    const admin = await registerAndLogin("admin7@example.com", "admin");
    const order = await createOrderFor(alice.user.id);

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "shipped" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("shipped");
  });
});
