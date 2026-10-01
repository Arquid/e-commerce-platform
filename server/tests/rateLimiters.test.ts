import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { checkoutLimiter } from "../src/middleware/rateLimiters";
import type { AuthRequest } from "../src/middleware/auth";

// The limiters skip themselves while NODE_ENV is "test" (otherwise the rest
// of the suite would trip them), so switch that off for these tests only.
// Each test builds its own app but the limiter's counters live in the shared
// limiter instance, so every test uses user ids nobody else uses.
function buildApp() {
  const app = express();
  // Stand-in for `protect`, which sets req.userId from the auth cookie.
  app.use((req: AuthRequest, _res, next) => {
    req.userId = req.get("x-test-user") ?? undefined;
    next();
  });
  app.post("/checkout", checkoutLimiter, (_req, res) => res.sendStatus(200));
  return app;
}

describe("checkoutLimiter", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("allows 10 checkouts per customer, then answers 429 with a readable message", async () => {
    const app = buildApp();
    for (let i = 0; i < 10; i++) {
      expect((await request(app).post("/checkout").set("x-test-user", "limit-user-a")).status).toBe(200);
    }

    const blocked = await request(app).post("/checkout").set("x-test-user", "limit-user-a");
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toMatch(/Too many checkout attempts/);
  });

  it("counts per customer, not per IP — one customer's attempts don't use up another's", async () => {
    const app = buildApp();
    // Every request comes from the same address; only the user differs.
    for (let i = 0; i < 11; i++) {
      await request(app).post("/checkout").set("x-test-user", "limit-user-b");
    }

    expect((await request(app).post("/checkout").set("x-test-user", "limit-user-b")).status).toBe(429);
    expect((await request(app).post("/checkout").set("x-test-user", "limit-user-c")).status).toBe(200);
  });

  it("is switched off under NODE_ENV=test, like the other limiters", async () => {
    process.env.NODE_ENV = "test";
    const app = buildApp();
    for (let i = 0; i < 15; i++) {
      expect((await request(app).post("/checkout").set("x-test-user", "limit-user-d")).status).toBe(200);
    }
  });
});
