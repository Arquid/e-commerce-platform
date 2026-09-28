import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import request from "supertest";
import app from "../src/app";
import { stripe } from "../src/config/stripe";
import User from "../src/models/User";
import Order from "../src/models/Order";
import Product from "../src/models/Product";
import { connectTestDb, disconnectTestDb, clearTestDb } from "./testDb";

// Hoisted above the imports by Vitest, so the controller gets this mock
// instead of a real Stripe client.
vi.mock("../src/config/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        expire: vi.fn(),
        retrieve: vi.fn(),
      },
    },
  },
}));

beforeAll(connectTestDb);
afterEach(async () => {
  await clearTestDb();
  vi.clearAllMocks();
});
afterAll(disconnectTestDb);

async function registerAndLogin(email: string, role: "customer" | "admin" = "customer") {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({
    name: "Order Tester",
    email,
    password: "password123",
  });
  if (role === "admin") {
    await User.updateOne({ email }, { role: "admin" });
  }
  const res = await agent.post("/api/auth/login").send({ email, password: "password123" });
  return { agent, user: res.body.user as { id: string } };
}

type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

async function createOrderFor(userId: string, status: OrderStatus = "pending", stripeSessionId?: string) {
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
    stripeSessionId,
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

    const res = await alice.agent.get("/api/orders");
    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it("paginates results and rejects an invalid page parameter", async () => {
    const alice = await registerAndLogin("alice-paginated@example.com");
    await createOrderFor(alice.user.id);
    await createOrderFor(alice.user.id);
    await createOrderFor(alice.user.id);

    const res = await alice.agent.get("/api/orders?page=1&limit=2");
    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(2);
    expect(res.body.total).toBe(3);
    expect(res.body.pages).toBe(2);

    const invalid = await alice.agent.get("/api/orders?page=not-a-number");
    expect(invalid.status).toBe(400);
  });
});

describe("GET /api/orders/:id", () => {
  it("returns 404 for another user's order", async () => {
    const alice = await registerAndLogin("alice2@example.com");
    const bob = await registerAndLogin("bob2@example.com");
    const order = await createOrderFor(bob.user.id);

    const res = await alice.agent.get(`/api/orders/${order.id}`);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/orders/all", () => {
  it("rejects a non-admin user", async () => {
    const alice = await registerAndLogin("alice3@example.com");
    const res = await alice.agent.get("/api/orders/all");
    expect(res.status).toBe(403);
  });

  it("returns every order for an admin user", async () => {
    const alice = await registerAndLogin("alice4@example.com");
    const admin = await registerAndLogin("admin5@example.com", "admin");
    await createOrderFor(alice.user.id);
    await createOrderFor(admin.user.id);

    const res = await admin.agent.get("/api/orders/all");
    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(2);
    expect(res.body.total).toBe(2);
  });
});

describe("PATCH /api/orders/:id/status", () => {
  it("rejects a non-admin user", async () => {
    const alice = await registerAndLogin("alice5@example.com");
    const order = await createOrderFor(alice.user.id);

    const res = await alice.agent.patch(`/api/orders/${order.id}/status`).send({ status: "shipped" });
    expect(res.status).toBe(403);
  });

  it("rejects an invalid status value", async () => {
    const alice = await registerAndLogin("alice6@example.com");
    const admin = await registerAndLogin("admin6@example.com", "admin");
    const order = await createOrderFor(alice.user.id);

    const res = await admin.agent
      .patch(`/api/orders/${order.id}/status`)
      .send({ status: "not-a-real-status" });
    expect(res.status).toBe(400);
  });

  it("ships a paid order", async () => {
    const alice = await registerAndLogin("alice7@example.com");
    const admin = await registerAndLogin("admin7@example.com", "admin");
    const order = await createOrderFor(alice.user.id, "paid");

    const res = await admin.agent.patch(`/api/orders/${order.id}/status`).send({ status: "shipped" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("shipped");
  });

  it("does not let an admin mark an order as paid by hand", async () => {
    // Only the Stripe webhook may set "paid" — it's also where stock is
    // decremented, and a manual "paid" would make it ignore the real payment.
    const alice = await registerAndLogin("alice8@example.com");
    const admin = await registerAndLogin("admin8@example.com", "admin");
    const order = await createOrderFor(alice.user.id, "pending");

    const res = await admin.agent.patch(`/api/orders/${order.id}/status`).send({ status: "paid" });

    expect(res.status).toBe(400);
    expect((await Order.findById(order.id))?.status).toBe("pending");
  });

  it("does not let an order skip payment and go straight to shipped", async () => {
    const alice = await registerAndLogin("alice9@example.com");
    const admin = await registerAndLogin("admin9@example.com", "admin");
    const order = await createOrderFor(alice.user.id, "pending");

    const res = await admin.agent.patch(`/api/orders/${order.id}/status`).send({ status: "shipped" });
    expect(res.status).toBe(400);
  });

  it("does not let a finished order be changed", async () => {
    const alice = await registerAndLogin("alice10@example.com");
    const admin = await registerAndLogin("admin10@example.com", "admin");
    const delivered = await createOrderFor(alice.user.id, "delivered");
    const cancelled = await createOrderFor(alice.user.id, "cancelled");

    expect((await admin.agent.patch(`/api/orders/${delivered.id}/status`).send({ status: "shipped" })).status).toBe(400);
    expect((await admin.agent.patch(`/api/orders/${cancelled.id}/status`).send({ status: "paid" })).status).toBe(400);
  });

  it("closes the Stripe checkout session before cancelling a pending order", async () => {
    const alice = await registerAndLogin("alice11@example.com");
    const admin = await registerAndLogin("admin11@example.com", "admin");
    const order = await createOrderFor(alice.user.id, "pending", "cs_test_open");
    vi.mocked(stripe.checkout.sessions.expire).mockResolvedValueOnce({} as any);

    const res = await admin.agent.patch(`/api/orders/${order.id}/status`).send({ status: "cancelled" });

    expect(res.status).toBe(200);
    expect(stripe.checkout.sessions.expire).toHaveBeenCalledWith("cs_test_open");
    expect((await Order.findById(order.id))?.status).toBe("cancelled");
  });

  it("refuses to cancel a pending order the customer has already paid for", async () => {
    // Regression test: cancelling used to succeed here while the customer's
    // Stripe payment went through anyway — charged for an order marked
    // cancelled, with the webhook then ignoring the payment entirely.
    const alice = await registerAndLogin("alice12@example.com");
    const admin = await registerAndLogin("admin12@example.com", "admin");
    const order = await createOrderFor(alice.user.id, "pending", "cs_test_paid");
    vi.mocked(stripe.checkout.sessions.expire).mockRejectedValueOnce(new Error("session is complete"));
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValueOnce({ status: "complete" } as any);

    const res = await admin.agent.patch(`/api/orders/${order.id}/status`).send({ status: "cancelled" });

    expect(res.status).toBe(409);
    expect((await Order.findById(order.id))?.status).toBe("pending");
  });

  it("cancels a pending order whose checkout session had already expired", async () => {
    const alice = await registerAndLogin("alice13@example.com");
    const admin = await registerAndLogin("admin13@example.com", "admin");
    const order = await createOrderFor(alice.user.id, "pending", "cs_test_expired");
    vi.mocked(stripe.checkout.sessions.expire).mockRejectedValueOnce(new Error("already expired"));
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValueOnce({ status: "expired" } as any);

    const res = await admin.agent.patch(`/api/orders/${order.id}/status`).send({ status: "cancelled" });

    expect(res.status).toBe(200);
    expect((await Order.findById(order.id))?.status).toBe("cancelled");
  });

  it("restores stock when a paid order is cancelled", async () => {
    const alice = await registerAndLogin("alice14@example.com");
    const admin = await registerAndLogin("admin14@example.com", "admin");
    const order = await createOrderFor(alice.user.id, "paid");
    const productId = order.items[0].product;
    const stockBefore = (await Product.findById(productId))!.stock;

    const res = await admin.agent.patch(`/api/orders/${order.id}/status`).send({ status: "cancelled" });

    expect(res.status).toBe(200);
    expect((await Product.findById(productId))!.stock).toBe(stockBefore + order.items[0].quantity);
  });
});
