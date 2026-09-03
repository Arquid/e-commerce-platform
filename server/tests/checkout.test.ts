import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import request from "supertest";
import app from "../src/app";
import { stripe } from "../src/config/stripe";
import Product from "../src/models/Product";
import Order from "../src/models/Order";
import { connectTestDb, disconnectTestDb, clearTestDb } from "./testDb";

// vi.mock calls are hoisted above imports by Vitest, so this replaces the
// real Stripe client before app.ts (and paymentController.ts) load it.
vi.mock("../src/config/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/test-session",
        }),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function registerAndLogin(email: string) {
  await request(app).post("/api/auth/register").send({
    name: "Checkout Tester",
    email,
    password: "password123",
  });
  const loginRes = await request(app).post("/api/auth/login").send({ email, password: "password123" });
  return loginRes.body.token as string;
}

async function createPendingOrder(email: string) {
  const token = await registerAndLogin(email);
  const product = await Product.create({
    name: "Webhook Test Product",
    description: "For webhook testing",
    price: 10,
    category: "electronics",
    imageUrl: "https://example.com/product.png",
    stock: 20,
  });

  await request(app)
    .post("/api/payments/create-checkout-session")
    .set("Authorization", `Bearer ${token}`)
    .send({
      items: [{ productId: product.id, name: product.name, price: product.price, quantity: 1 }],
      shippingAddress: { line1: "Test street 1", city: "Helsinki", postalCode: "00100", country: "FI" },
    });

  const order = await Order.findOne({});
  return order!.id as string;
}

describe("POST /api/payments/create-checkout-session", () => {
  it("rejects the request when not authenticated", async () => {
    const res = await request(app).post("/api/payments/create-checkout-session").send({
      items: [],
      shippingAddress: {},
    });
    expect(res.status).toBe(401);
  });

  it("creates a pending order and returns the Stripe checkout URL", async () => {
    const token = await registerAndLogin("checkout@example.com");
    const product = await Product.create({
      name: "Test Product",
      description: "For checkout testing",
      price: 25,
      category: "electronics",
      imageUrl: "https://example.com/product.png",
      stock: 20,
    });

    const res = await request(app)
      .post("/api/payments/create-checkout-session")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: product.id, name: product.name, price: product.price, quantity: 2 }],
        shippingAddress: { line1: "Test street 1", city: "Helsinki", postalCode: "00100", country: "FI" },
      });

    expect(res.status).toBe(200);
    expect(res.body.url).toBe("https://checkout.stripe.com/test-session");

    const order = await Order.findOne({});
    expect(order).not.toBeNull();
    expect(order?.status).toBe("pending");
    expect(order?.totalAmount).toBe(50);
    expect(order?.items).toHaveLength(1);
  });
});

describe("POST /api/payments/webhook", () => {
  it("marks a pending order as paid on checkout.session.completed", async () => {
    const orderId = await createPendingOrder("webhook-paid@example.com");

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce({
      type: "checkout.session.completed",
      data: { object: { metadata: { orderId } } },
    } as any);

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "test-signature")
      .send(Buffer.from("{}"));

    expect(res.status).toBe(200);
    const order = await Order.findById(orderId);
    expect(order?.status).toBe("paid");
  });

  it("marks a pending order as cancelled on checkout.session.expired", async () => {
    const orderId = await createPendingOrder("webhook-expired@example.com");

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce({
      type: "checkout.session.expired",
      data: { object: { metadata: { orderId } } },
    } as any);

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "test-signature")
      .send(Buffer.from("{}"));

    expect(res.status).toBe(200);
    const order = await Order.findById(orderId);
    expect(order?.status).toBe("cancelled");
  });

  it("does not un-cancel or override an order that was already paid", async () => {
    const orderId = await createPendingOrder("webhook-already-paid@example.com");
    await Order.findByIdAndUpdate(orderId, { status: "paid" });

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce({
      type: "checkout.session.expired",
      data: { object: { metadata: { orderId } } },
    } as any);

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "test-signature")
      .send(Buffer.from("{}"));

    expect(res.status).toBe(200);
    const order = await Order.findById(orderId);
    expect(order?.status).toBe("paid");
  });

  it("rejects the request when signature verification fails", async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockImplementationOnce(() => {
      throw new Error("Invalid signature");
    });

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "bad-signature")
      .send(Buffer.from("{}"));

    expect(res.status).toBe(400);
  });
});
