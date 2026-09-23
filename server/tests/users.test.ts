import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "../src/app";
import User from "../src/models/User";
import AuditLog from "../src/models/AuditLog";
import { connectTestDb, disconnectTestDb, clearTestDb } from "./testDb";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function registerAndLogin(email: string, role: "customer" | "admin" = "customer") {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({
    name: "User Tester",
    email,
    password: "password123",
  });
  if (role === "admin") {
    await User.updateOne({ email }, { role: "admin" });
  }
  const res = await agent.post("/api/auth/login").send({ email, password: "password123" });
  return { agent, user: res.body.user as { id: string } };
}

describe("GET /api/users", () => {
  it("rejects the request when not authenticated", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(401);
  });

  it("rejects a non-admin user", async () => {
    const customer = await registerAndLogin("customer@example.com");
    const res = await customer.agent.get("/api/users");
    expect(res.status).toBe(403);
  });

  it("returns a paginated list of users for an admin", async () => {
    const admin = await registerAndLogin("admin@example.com", "admin");
    await registerAndLogin("someone-else@example.com");

    const res = await admin.agent.get("/api/users");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.users).toHaveLength(2);
    expect(res.body.users[0].password).toBeUndefined();
  });
});

describe("PATCH /api/users/:id/role", () => {
  it("rejects the request when not authenticated", async () => {
    const res = await request(app).patch("/api/users/000000000000000000000000/role").send({ role: "admin" });
    expect(res.status).toBe(401);
  });

  it("rejects a non-admin user", async () => {
    const customer = await registerAndLogin("customer2@example.com");
    const res = await customer.agent
      .patch(`/api/users/${customer.user.id}/role`)
      .send({ role: "admin" });
    expect(res.status).toBe(403);
  });

  it("rejects an invalid role value", async () => {
    const admin = await registerAndLogin("admin2@example.com", "admin");
    const other = await registerAndLogin("promote-me@example.com");

    const res = await admin.agent.patch(`/api/users/${other.user.id}/role`).send({ role: "superuser" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for a non-existent user", async () => {
    const admin = await registerAndLogin("admin3@example.com", "admin");
    const res = await admin.agent
      .patch("/api/users/000000000000000000000000/role")
      .send({ role: "admin" });
    expect(res.status).toBe(404);
  });

  it("rejects an admin trying to change their own role", async () => {
    const admin = await registerAndLogin("admin4@example.com", "admin");
    const res = await admin.agent.patch(`/api/users/${admin.user.id}/role`).send({ role: "customer" });
    expect(res.status).toBe(400);

    const stillAdmin = await User.findById(admin.user.id);
    expect(stillAdmin?.role).toBe("admin");
  });

  it("promotes a customer to admin and logs the change", async () => {
    const admin = await registerAndLogin("admin5@example.com", "admin");
    const target = await registerAndLogin("promote-me2@example.com");

    const res = await admin.agent.patch(`/api/users/${target.user.id}/role`).send({ role: "admin" });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("admin");

    const updated = await User.findById(target.user.id);
    expect(updated?.role).toBe("admin");

    const logs = await AuditLog.find({ action: "user.role_update" });
    expect(logs).toHaveLength(1);
    expect(logs[0].targetId).toBe(target.user.id);
    expect(logs[0].details).toMatchObject({ from: "customer", to: "admin" });
  });

  it("demotes an admin back to customer", async () => {
    const admin = await registerAndLogin("admin6@example.com", "admin");
    const target = await registerAndLogin("demote-me@example.com", "admin");

    const res = await admin.agent.patch(`/api/users/${target.user.id}/role`).send({ role: "customer" });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("customer");
  });
});
