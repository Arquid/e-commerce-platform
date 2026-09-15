import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { connectTestDb, disconnectTestDb } from "./testDb";

describe("GET /api/health", () => {
  it("reports degraded when the database is not connected", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "degraded", db: "disconnected" });
  });

  it("reports ok once the database is connected", async () => {
    await connectTestDb();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: "connected" });
  });

  afterAll(disconnectTestDb);
});
