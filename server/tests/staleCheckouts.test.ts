import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { stripe } from "../src/config/stripe";
import { STALE_CHECKOUT_AFTER_MS } from "../src/config/checkout";
import Product from "../src/models/Product";
import Order from "../src/models/Order";
import AuditLog from "../src/models/AuditLog";
import { sweepStaleCheckouts } from "../src/utils/staleCheckouts";
import { connectTestDb, disconnectTestDb, clearTestDb } from "./testDb";

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

const expire = vi.mocked(stripe.checkout.sessions.expire);
const retrieve = vi.mocked(stripe.checkout.sessions.retrieve);

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

beforeEach(() => {
  expire.mockReset();
  retrieve.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// A moment after every pending order created in a test has become stale.
const later = () => Date.now() + STALE_CHECKOUT_AFTER_MS + 60_000;

async function createProduct(stock: number) {
  return Product.create({
    name: "Sweep Test Product",
    description: "For sweeper testing",
    price: 10,
    category: "electronics",
    imageUrl: "https://example.com/product.png",
    stock,
  });
}

// Stock is as reserved at checkout: 2 units of a product that had 10.
async function createOrder(
  productId: string,
  overrides: Partial<{ status: "pending" | "cancelled"; stripeSessionId: string | null; stockHeld: boolean }> = {}
) {
  const { stripeSessionId = "cs_test_1", ...rest } = overrides;
  return Order.create({
    user: new mongoose.Types.ObjectId(),
    items: [{ product: productId, name: "Sweep Test Product", price: 10, quantity: 2 }],
    totalAmount: 20,
    shippingAddress: { line1: "Test street 1", city: "Helsinki", postalCode: "00100", country: "FI" },
    status: "pending",
    stockHeld: true,
    ...(stripeSessionId ? { stripeSessionId } : {}),
    ...rest,
  });
}

const stockOf = async (productId: string) => (await Product.findById(productId))!.stock;

describe("sweepStaleCheckouts", () => {
  it("cancels a stale pending order whose Stripe session expired, and puts its stock back", async () => {
    const product = await createProduct(8);
    const order = await createOrder(product.id);
    expire.mockResolvedValue({} as never);

    const summary = await sweepStaleCheckouts(later());

    expect(summary).toMatchObject({ cancelled: 1, markedPaid: 0, failed: 0 });
    const after = await Order.findById(order.id);
    expect(after!.status).toBe("cancelled");
    expect(after!.stockHeld).toBe(false);
    expect(await stockOf(product.id)).toBe(10);

    const entry = await AuditLog.findOne({ action: "checkout.expired_cleanup" });
    expect(entry).toMatchObject({ targetId: order.id, details: { reason: "stripe_session_expired" } });
    expect(entry!.admin).toBeUndefined();
  });

  it("cancels a stale order that never got a Stripe session without calling Stripe", async () => {
    const product = await createProduct(8);
    const order = await createOrder(product.id, { stripeSessionId: null });

    const summary = await sweepStaleCheckouts(later());

    expect(summary.cancelled).toBe(1);
    expect(expire).not.toHaveBeenCalled();
    expect((await Order.findById(order.id))!.status).toBe("cancelled");
    expect(await stockOf(product.id)).toBe(10);
    expect(await AuditLog.findOne({ action: "checkout.expired_cleanup" })).toMatchObject({
      details: { reason: "no_stripe_session" },
    });
  });

  it("marks a stale order paid, keeping its stock sold, when Stripe says the session was paid", async () => {
    const product = await createProduct(8);
    const order = await createOrder(product.id);
    expire.mockRejectedValue(new Error("session already complete"));
    retrieve.mockResolvedValue({ status: "complete" } as never);

    const summary = await sweepStaleCheckouts(later());

    expect(summary).toMatchObject({ cancelled: 0, markedPaid: 1, failed: 0 });
    const after = await Order.findById(order.id);
    expect(after!.status).toBe("paid");
    expect(after!.paidAt).toBeInstanceOf(Date);
    expect(after!.stockHeld).toBe(true);
    expect(await stockOf(product.id)).toBe(8);
    expect(await AuditLog.findOne({ action: "payment.reconciled" })).toMatchObject({ targetId: order.id });
  });

  it("leaves orders alone that are not yet stale", async () => {
    const product = await createProduct(8);
    const order = await createOrder(product.id);

    const summary = await sweepStaleCheckouts();

    expect(summary).toEqual({ cancelled: 0, markedPaid: 0, stockRepaired: 0, failed: 0 });
    expect(expire).not.toHaveBeenCalled();
    expect((await Order.findById(order.id))!.status).toBe("pending");
    expect(await stockOf(product.id)).toBe(8);
  });

  it("leaves stale pending orders that hold no stock alone", async () => {
    // Orders from before stock was reserved at checkout.
    const product = await createProduct(8);
    const order = await createOrder(product.id, { stockHeld: false });

    await sweepStaleCheckouts(later());

    expect((await Order.findById(order.id))!.status).toBe("pending");
    expect(expire).not.toHaveBeenCalled();
    expect(await stockOf(product.id)).toBe(8);
  });

  it("leaves an order pending when Stripe can't be reached, and carries on with the others", async () => {
    const product = await createProduct(6);
    const unreachable = await createOrder(product.id, { stripeSessionId: "cs_unreachable" });
    const fine = await createOrder(product.id, { stripeSessionId: "cs_fine" });
    expire.mockImplementation(async (id) => {
      if (id === "cs_unreachable") throw new Error("network down");
      return {} as never;
    });
    retrieve.mockRejectedValue(new Error("network down"));

    const summary = await sweepStaleCheckouts(later());

    expect(summary).toMatchObject({ cancelled: 1, failed: 1 });
    expect((await Order.findById(unreachable.id))!.status).toBe("pending");
    expect((await Order.findById(unreachable.id))!.stockHeld).toBe(true);
    expect((await Order.findById(fine.id))!.status).toBe("cancelled");
    expect(await stockOf(product.id)).toBe(8);
  });

  it("repairs a cancelled order that still holds stock", async () => {
    const product = await createProduct(8);
    const order = await createOrder(product.id, { status: "cancelled" });

    const summary = await sweepStaleCheckouts();

    expect(summary.stockRepaired).toBe(1);
    expect((await Order.findById(order.id))!.stockHeld).toBe(false);
    expect(await stockOf(product.id)).toBe(10);
  });

  it("returns stock exactly once when run again, or twice at the same time", async () => {
    const product = await createProduct(8);
    await createOrder(product.id);
    expire.mockResolvedValue({} as never);

    await Promise.all([sweepStaleCheckouts(later()), sweepStaleCheckouts(later())]);
    await sweepStaleCheckouts(later());

    expect(await stockOf(product.id)).toBe(10);
    expect(await AuditLog.countDocuments({ action: "checkout.expired_cleanup" })).toBe(1);
  });
});
