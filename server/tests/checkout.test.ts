import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import request from "supertest";
import app from "../src/app";
import { stripe } from "../src/config/stripe";
import Product from "../src/models/Product";
import Order from "../src/models/Order";
import AuditLog from "../src/models/AuditLog";
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
        expire: vi.fn(),
        retrieve: vi.fn(),
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
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({
    name: "Checkout Tester",
    email,
    password: "password123",
  });
  await agent.post("/api/auth/login").send({ email, password: "password123" });
  return agent;
}

async function createPendingOrder(email: string) {
  const agent = await registerAndLogin(email);
  const product = await Product.create({
    name: "Webhook Test Product",
    description: "For webhook testing",
    price: 10,
    category: "electronics",
    imageUrl: "https://example.com/product.png",
    stock: 20,
  });

  const checkoutRes = await agent.post("/api/payments/create-checkout-session").send({
    items: [{ productId: product.id, quantity: 1 }],
    shippingAddress: { line1: "Test street 1", city: "Helsinki", postalCode: "00100", country: "FI" },
  });

  if (checkoutRes.status !== 200) {
    throw new Error(
      `createPendingOrder helper failed: create-checkout-session returned ${checkoutRes.status} ${JSON.stringify(checkoutRes.body)}`
    );
  }

  const order = await Order.findOne({});
  return order!.id as string;
}

function deliverWebhook() {
  return request(app)
    .post("/api/payments/webhook")
    .set("Content-Type", "application/json")
    .set("stripe-signature", "test-signature")
    .send(Buffer.from("{}"));
}

const shippingAddress = { line1: "Test street 1", city: "Helsinki", postalCode: "00100", country: "FI" };

async function createProduct(name: string, stock: number) {
  return Product.create({
    name,
    description: "For stock reservation testing",
    price: 10,
    category: "electronics",
    imageUrl: "https://example.com/product.png",
    stock,
  });
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
    const agent = await registerAndLogin("checkout@example.com");
    const product = await Product.create({
      name: "Test Product",
      description: "For checkout testing",
      price: 25,
      category: "electronics",
      imageUrl: "https://example.com/product.png",
      stock: 20,
    });

    const res = await agent.post("/api/payments/create-checkout-session").send({
      items: [{ productId: product.id, quantity: 2 }],
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

  it("rejects an empty items array", async () => {
    const agent = await registerAndLogin("empty-items@example.com");
    const res = await agent.post("/api/payments/create-checkout-session").send({
      items: [],
      shippingAddress: { line1: "Test street 1", city: "Helsinki", postalCode: "00100", country: "FI" },
    });
    expect(res.status).toBe(400);
  });

  it("rejects the request when a product does not exist", async () => {
    const agent = await registerAndLogin("missing-product@example.com");
    const res = await agent.post("/api/payments/create-checkout-session").send({
      items: [{ productId: "000000000000000000000000", quantity: 1 }],
      shippingAddress: { line1: "Test street 1", city: "Helsinki", postalCode: "00100", country: "FI" },
    });
    expect(res.status).toBe(400);
  });

  it("uses the product's real price from the database, ignoring any price sent by the client", async () => {
    const agent = await registerAndLogin("price-tamper@example.com");
    const product = await Product.create({
      name: "Expensive Watch",
      description: "For price-tampering testing",
      price: 249,
      category: "electronics",
      imageUrl: "https://example.com/watch.png",
      stock: 5,
    });

    const res = await agent
      .post("/api/payments/create-checkout-session")
      // A malicious client could still add extra fields like `price` to the
      // JSON body — Zod strips unknown keys, and the controller never reads
      // them anyway, but this proves the end-to-end result is unaffected.
      .send({
        items: [{ productId: product.id, quantity: 1, price: 0.01, name: "Expensive Watch" }],
        shippingAddress: { line1: "Test street 1", city: "Helsinki", postalCode: "00100", country: "FI" },
      });

    expect(res.status).toBe(200);

    const order = await Order.findOne({});
    expect(order?.totalAmount).toBe(249);
    expect(order?.items[0].price).toBe(249);

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 24900 }),
          }),
        ],
      })
    );
  });

  it("rejects the request when the requested quantity exceeds available stock", async () => {
    const agent = await registerAndLogin("out-of-stock@example.com");
    const product = await Product.create({
      name: "Limited Edition Sneakers",
      description: "Only a few left",
      price: 89,
      category: "shoes",
      imageUrl: "https://example.com/sneakers.png",
      stock: 2,
    });

    const res = await agent.post("/api/payments/create-checkout-session").send({
      items: [{ productId: product.id, quantity: 3 }],
      shippingAddress: { line1: "Test street 1", city: "Helsinki", postalCode: "00100", country: "FI" },
    });

    expect(res.status).toBe(400);
    expect(await Order.countDocuments()).toBe(0);
    expect((await Product.findById(product.id))!.stock).toBe(2);
  });

  it("reserves stock at checkout, so two customers can't both buy the last unit", async () => {
    // Regression test: stock used to be checked at checkout but only taken
    // at payment, so both of these checkouts succeeded, both customers paid,
    // and one order was oversold with no warning to anyone.
    const product = await createProduct("Last One", 1);
    const alice = await registerAndLogin("last-alice@example.com");
    const bob = await registerAndLogin("last-bob@example.com");
    const body = { items: [{ productId: product.id, quantity: 1 }], shippingAddress };

    expect((await alice.post("/api/payments/create-checkout-session").send(body)).status).toBe(200);
    const bobRes = await bob.post("/api/payments/create-checkout-session").send(body);

    expect(bobRes.status).toBe(400);
    expect(bobRes.body.message).toMatch(/Not enough stock for "Last One" \(0 available\)/);
    expect((await Product.findById(product.id))!.stock).toBe(0);
    expect(await Order.countDocuments()).toBe(1);
  });

  it("gives back everything already reserved when a later item in the cart is sold out", async () => {
    const available = await createProduct("In Stock", 5);
    const soldOut = await createProduct("Sold Out", 0);
    const agent = await registerAndLogin("partial@example.com");

    const res = await agent.post("/api/payments/create-checkout-session").send({
      items: [
        { productId: available.id, quantity: 2 },
        { productId: soldOut.id, quantity: 1 },
      ],
      shippingAddress,
    });

    expect(res.status).toBe(400);
    expect((await Product.findById(available.id))!.stock).toBe(5);
    expect(await Order.countDocuments()).toBe(0);
  });

  it("gives the reservation back and discards the order if Stripe fails to create the checkout", async () => {
    const product = await createProduct("Stripe Down", 3);
    const agent = await registerAndLogin("stripe-down@example.com");
    vi.mocked(stripe.checkout.sessions.create).mockRejectedValueOnce(new Error("Stripe unavailable"));

    const res = await agent.post("/api/payments/create-checkout-session").send({
      items: [{ productId: product.id, quantity: 2 }],
      shippingAddress,
    });

    expect(res.status).toBe(500);
    expect((await Product.findById(product.id))!.stock).toBe(3);
    expect(await Order.countDocuments()).toBe(0);
  });

  it("makes the checkout page expire after about 30 minutes rather than Stripe's 24h default", async () => {
    const product = await createProduct("Expiry", 3);
    const agent = await registerAndLogin("expiry@example.com");
    const before = Math.floor(Date.now() / 1000);

    await agent.post("/api/payments/create-checkout-session").send({
      items: [{ productId: product.id, quantity: 1 }],
      shippingAddress,
    });

    const { expires_at } = vi.mocked(stripe.checkout.sessions.create).mock.lastCall![0]!;
    expect(expires_at! - before).toBeGreaterThanOrEqual(30 * 60);
    expect(expires_at! - before).toBeLessThanOrEqual(35 * 60);
  });

  describe("when the customer already has a checkout open (e.g. came back via Stripe's back link)", () => {
    const withSession = (id: string) => ({ id, url: `https://checkout.stripe.com/${id}` });

    it("replaces it instead of reserving the stock again", async () => {
      // Regression test: every retry used to reserve the items again, so one
      // customer wanting a single unit could end up holding all of them.
      const product = await createProduct("Popular", 3);
      const agent = await registerAndLogin("retrier@example.com");
      vi.mocked(stripe.checkout.sessions.expire).mockClear();
      vi.mocked(stripe.checkout.sessions.create)
        .mockResolvedValueOnce(withSession("cs_first") as any)
        .mockResolvedValueOnce(withSession("cs_second") as any)
        .mockResolvedValueOnce(withSession("cs_third") as any);
      const body = { items: [{ productId: product.id, quantity: 1 }], shippingAddress };

      for (let i = 0; i < 3; i++) {
        expect((await agent.post("/api/payments/create-checkout-session").send(body)).status).toBe(200);
      }

      expect((await Product.findById(product.id))!.stock).toBe(2);
      expect(await Order.countDocuments({ status: "pending" })).toBe(1);
      expect(await Order.countDocuments({ status: "cancelled" })).toBe(2);
      expect((await Order.findOne({ status: "pending" }))?.stripeSessionId).toBe("cs_third");
      expect(stripe.checkout.sessions.expire).toHaveBeenCalledWith("cs_first");
      expect(stripe.checkout.sessions.expire).toHaveBeenCalledWith("cs_second");
    });

    it("lets them check out again for the last unit they were already holding", async () => {
      const product = await createProduct("Last One Again", 1);
      const agent = await registerAndLogin("last-again@example.com");
      const body = { items: [{ productId: product.id, quantity: 1 }], shippingAddress };

      expect((await agent.post("/api/payments/create-checkout-session").send(body)).status).toBe(200);
      expect((await agent.post("/api/payments/create-checkout-session").send(body)).status).toBe(200);
      expect((await Product.findById(product.id))!.stock).toBe(0);
    });

    it("keeps the previous checkout, recorded as paid, if the customer has already paid for it", async () => {
      const product = await createProduct("Paid Already", 5);
      const agent = await registerAndLogin("paid-already@example.com");
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValueOnce(withSession("cs_paid") as any);
      const body = { items: [{ productId: product.id, quantity: 1 }], shippingAddress };
      await agent.post("/api/payments/create-checkout-session").send(body);
      const firstOrder = await Order.findOne({ stripeSessionId: "cs_paid" });

      vi.mocked(stripe.checkout.sessions.expire).mockRejectedValueOnce(new Error("session is complete"));
      vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValueOnce({ status: "complete" } as any);
      const res = await agent.post("/api/payments/create-checkout-session").send(body);

      expect(res.status).toBe(200);
      // Stripe has confirmed the payment, so it's recorded as paid right away
      // (leaving it pending would also block this new checkout) and its
      // units stay sold.
      const first = await Order.findById(firstOrder!._id);
      expect(first?.status).toBe("paid");
      expect(first?.paidAt).toBeDefined();
      expect((await Product.findById(product.id))!.stock).toBe(3);

      // The webhook arriving afterwards must find nothing left to do.
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce({
        type: "checkout.session.completed",
        data: { object: { id: "cs_paid", metadata: { orderId: firstOrder!.id } } },
      } as any);
      await deliverWebhook();
      expect((await Order.findById(firstOrder!._id))?.status).toBe("paid");
      expect(await AuditLog.countDocuments()).toBe(0);
      expect((await Product.findById(product.id))!.stock).toBe(3);
    });

    it("holds the stock only once when the same customer submits twice at the same moment", async () => {
      // Regression test: two simultaneous requests both saw no pending order,
      // so both reserved the items — one customer, one unit wanted, two held.
      // Timing decides whether the second request replaces the first or is
      // turned away, so repeat it: the outcome may differ, the totals may not.
      const product = await createProduct("Double Submit", 50);
      const agent = await registerAndLogin("double-submit@example.com");
      const body = { items: [{ productId: product.id, quantity: 1 }], shippingAddress };

      for (let round = 1; round <= 8; round++) {
        const results = await Promise.all([
          agent.post("/api/payments/create-checkout-session").send(body),
          agent.post("/api/payments/create-checkout-session").send(body),
        ]);

        const statuses = results.map((r) => r.status);
        expect(statuses.some((s) => s === 200)).toBe(true);
        expect(statuses.every((s) => s === 200 || s === 409)).toBe(true);
        expect(await Order.countDocuments({ status: "pending" })).toBe(1);
        // One unit held, however many requests it took.
        expect((await Product.findById(product.id))!.stock).toBe(49);

        // Hand it back so every round starts from the same place.
        await Order.updateMany({ status: "pending" }, { status: "cancelled" });
        await Product.updateOne({ _id: product.id }, { stock: 50 });
        await Order.updateMany({}, { stockHeld: false });
      }
    });

    it("tells the customer to wait when another checkout of theirs is still being created", async () => {
      const product = await createProduct("In Flight", 5);
      const agent = await registerAndLogin("in-flight@example.com");
      const me = (await agent.get("/api/auth/me")).body.id as string;
      // Another request has created the order but not yet attached a Stripe session.
      await Order.create({
        user: me,
        items: [{ product: product._id, name: "In Flight", quantity: 1, price: 10 }],
        totalAmount: 10,
        shippingAddress,
        status: "pending",
        stockHeld: true,
      });
      await Product.updateOne({ _id: product._id }, { stock: 4 });

      const res = await agent.post("/api/payments/create-checkout-session").send({
        items: [{ productId: product.id, quantity: 1 }],
        shippingAddress,
      });

      expect(res.status).toBe(409);
      // Its units are untouched: this request reserved and gave back its own.
      expect((await Product.findById(product._id))!.stock).toBe(4);
      expect(await Order.countDocuments({ status: "pending" })).toBe(1);
    });

    it("replaces a pending order that never got a Stripe session once it is clearly abandoned", async () => {
      const product = await createProduct("Crashed Mid-Checkout", 5);
      const agent = await registerAndLogin("crashed@example.com");
      const me = (await agent.get("/api/auth/me")).body.id as string;
      const stale = await Order.create({
        user: me,
        items: [{ product: product._id, name: "Crashed Mid-Checkout", quantity: 1, price: 10 }],
        totalAmount: 10,
        shippingAddress,
        status: "pending",
        stockHeld: true,
      });
      await Order.collection.updateOne({ _id: stale._id }, { $set: { createdAt: new Date(Date.now() - 10 * 60 * 1000) } });
      await Product.updateOne({ _id: product._id }, { stock: 4 });

      const res = await agent.post("/api/payments/create-checkout-session").send({
        items: [{ productId: product.id, quantity: 1 }],
        shippingAddress,
      });

      expect(res.status).toBe(200);
      expect((await Order.findById(stale._id))?.status).toBe("cancelled");
      expect((await Product.findById(product._id))!.stock).toBe(4);
    });

    it("stops a customer who opens checkouts over and over, on the real route", async () => {
      const product = await createProduct("Rate Limited", 50);
      const agent = await registerAndLogin("hammer@example.com");
      const body = { items: [{ productId: product.id, quantity: 1 }], shippingAddress };

      // Log in first (above) under the test environment so the auth cookie
      // isn't marked Secure, then let the limiter, which skips itself in
      // tests, apply for these requests.
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      try {
        for (let i = 0; i < 10; i++) {
          expect((await agent.post("/api/payments/create-checkout-session").send(body)).status).toBe(200);
        }
        const blocked = await agent.post("/api/payments/create-checkout-session").send(body);
        expect(blocked.status).toBe(429);
        expect(blocked.body.message).toMatch(/Too many checkout attempts/);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
      // The blocked attempt reserved nothing: only the one open checkout is held.
      expect((await Product.findById(product.id))!.stock).toBe(49);
    });

    it("never touches another customer's open checkout", async () => {
      const product = await createProduct("Shared", 5);
      const alice = await registerAndLogin("replace-alice@example.com");
      const bob = await registerAndLogin("replace-bob@example.com");
      const body = { items: [{ productId: product.id, quantity: 1 }], shippingAddress };

      await alice.post("/api/payments/create-checkout-session").send(body);
      await bob.post("/api/payments/create-checkout-session").send(body);

      expect(await Order.countDocuments({ status: "pending" })).toBe(2);
      expect((await Product.findById(product.id))!.stock).toBe(3);
    });
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

  it("leaves stock alone when payment completes — it was already reserved at checkout", async () => {
    const orderId = await createPendingOrder("webhook-stock@example.com");
    const order = await Order.findById(orderId);
    const productId = order!.items[0].product;
    // createPendingOrder's product starts at 20; checkout reserved 1.
    expect((await Product.findById(productId))!.stock).toBe(19);

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { metadata: { orderId } } },
    } as any);
    // Delivered twice, as Stripe may do — neither delivery touches stock.
    await deliverWebhook();
    await deliverWebhook();

    expect((await Product.findById(productId))!.stock).toBe(19);
    expect((await Order.findById(orderId))?.status).toBe("paid");
  });

  it("cancels an expired checkout's order and puts its reserved stock back — once", async () => {
    const orderId = await createPendingOrder("webhook-expired@example.com");
    const productId = (await Order.findById(orderId))!.items[0].product;
    expect((await Product.findById(productId))!.stock).toBe(19);

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: "checkout.session.expired",
      data: { object: { metadata: { orderId } } },
    } as any);
    expect((await deliverWebhook()).status).toBe(200);
    await deliverWebhook();

    expect((await Order.findById(orderId))?.status).toBe("cancelled");
    expect((await Product.findById(productId))!.stock).toBe(20);
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

  it("flags — once — a payment that arrives for an order cancelled before it was paid", async () => {
    // Regression test: this payment used to be dropped silently, leaving
    // the customer charged for a cancelled order with no trace anywhere.
    const orderId = await createPendingOrder("webhook-paid-after-cancel@example.com");
    await Order.findByIdAndUpdate(orderId, { status: "cancelled" });
    const order = await Order.findById(orderId);
    const stockBefore = (await Product.findById(order!.items[0].product))!.stock;

    const completedEvent = {
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_123", amount_total: 1000, metadata: { orderId } } },
    } as any;
    const deliver = () =>
      request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("stripe-signature", "test-signature")
        .send(Buffer.from("{}"));

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(completedEvent);
    expect((await deliver()).status).toBe(200);
    // Stripe may redeliver the same event — that must not add a second entry.
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(completedEvent);
    await deliver();

    const flags = await AuditLog.find({ action: "payment.received_for_cancelled_order" });
    expect(flags).toHaveLength(1);
    expect(flags[0].targetId).toBe(orderId);
    expect(flags[0].admin).toBeUndefined();

    const after = await Order.findById(orderId);
    expect(after?.status).toBe("cancelled");
    expect((await Product.findById(order!.items[0].product))!.stock).toBe(stockBefore);
  });

  it("does not flag a redelivered payment for an order that was paid and cancelled afterwards", async () => {
    const orderId = await createPendingOrder("webhook-paid-then-cancelled@example.com");
    const completedEvent = {
      type: "checkout.session.completed",
      data: { object: { metadata: { orderId } } },
    } as any;
    const deliver = () =>
      request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("stripe-signature", "test-signature")
        .send(Buffer.from("{}"));

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(completedEvent);
    await deliver();
    await Order.findByIdAndUpdate(orderId, { status: "cancelled" });
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(completedEvent);
    await deliver();

    expect(await AuditLog.countDocuments({ action: "payment.received_for_cancelled_order" })).toBe(0);
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
