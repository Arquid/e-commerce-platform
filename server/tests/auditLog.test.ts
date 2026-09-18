import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import request from "supertest";
import app from "../src/app";
import User from "../src/models/User";
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
      },
    },
  },
}));

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function registerAndLogin(email: string, role: "customer" | "admin" = "customer") {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({
    name: "Audit Log Tester",
    email,
    password: "password123",
  });
  if (role === "admin") {
    await User.updateOne({ email }, { role: "admin" });
  }
  const res = await agent.post("/api/auth/login").send({ email, password: "password123" });
  return { agent, user: res.body.user as { id: string } };
}

const validProduct = {
  name: "Audit Test Product",
  description: "For audit log testing",
  price: 30,
  category: "electronics",
  imageUrl: "https://example.com/product.png",
  stock: 5,
};

describe("Admin action audit logging", () => {
  it("logs an entry when an admin creates a product", async () => {
    const admin = await registerAndLogin("audit-create@example.com", "admin");
    const res = await admin.agent.post("/api/products").send(validProduct);
    expect(res.status).toBe(201);

    const logs = await AuditLog.find();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("product.create");
    expect(logs[0].targetType).toBe("Product");
    expect(logs[0].targetId).toBe(res.body._id);
    expect(logs[0].admin.toString()).toBe(admin.user.id);
  });

  it("logs an entry when an admin deletes a product", async () => {
    const admin = await registerAndLogin("audit-delete@example.com", "admin");
    const created = await admin.agent.post("/api/products").send(validProduct);

    await admin.agent.delete(`/api/products/${created.body._id}`);

    const logs = await AuditLog.find({ action: "product.delete" });
    expect(logs).toHaveLength(1);
    expect(logs[0].targetId).toBe(created.body._id);
  });

  it("logs an entry with the old and new status when an admin updates an order", async () => {
    const customer = await registerAndLogin("audit-order-customer@example.com");
    const admin = await registerAndLogin("audit-order-admin@example.com", "admin");

    const productRes = await admin.agent.post("/api/products").send(validProduct);

    const checkoutRes = await customer.agent.post("/api/payments/create-checkout-session").send({
      items: [{ productId: productRes.body._id, quantity: 1 }],
      shippingAddress: { line1: "Test street 1", city: "Helsinki", postalCode: "00100", country: "FI" },
    });
    expect(checkoutRes.status).toBe(200);

    const ordersRes = await admin.agent.get("/api/orders/all");
    const orderId = ordersRes.body.orders[0]._id as string;

    const updateRes = await admin.agent.patch(`/api/orders/${orderId}/status`).send({ status: "shipped" });
    expect(updateRes.status).toBe(200);

    const logs = await AuditLog.find({ action: "order.status_update" });
    expect(logs).toHaveLength(1);
    expect(logs[0].targetId).toBe(orderId);
    expect(logs[0].details).toEqual({ from: "pending", to: "shipped" });
  });
});

describe("GET /api/admin/audit-logs", () => {
  it("rejects the request when not authenticated", async () => {
    const res = await request(app).get("/api/admin/audit-logs");
    expect(res.status).toBe(401);
  });

  it("rejects a non-admin user", async () => {
    const customer = await registerAndLogin("audit-list-customer@example.com");
    const res = await customer.agent.get("/api/admin/audit-logs");
    expect(res.status).toBe(403);
  });

  it("returns logged actions with the admin's name and email populated", async () => {
    const admin = await registerAndLogin("audit-list-admin@example.com", "admin");
    await admin.agent.post("/api/products").send(validProduct);

    const res = await admin.agent.get("/api/admin/audit-logs");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].action).toBe("product.create");
    expect(res.body[0].admin.email).toBe("audit-list-admin@example.com");
  });
});
