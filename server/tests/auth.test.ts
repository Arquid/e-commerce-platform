import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app";
import { connectTestDb, disconnectTestDb, clearTestDb } from "./testDb";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

function authCookie(res: request.Response) {
  const cookies = res.headers["set-cookie"];
  return (Array.isArray(cookies) ? cookies : cookies ? [cookies] : []).find((c: string) =>
    c.startsWith("token=")
  );
}

describe("POST /api/auth/register", () => {
  it("creates a new user and sets an httpOnly auth cookie", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeUndefined();
    expect(res.body.user).toMatchObject({
      name: "Test User",
      email: "test@example.com",
      role: "customer",
    });
    expect(res.body.user.password).toBeUndefined();

    const cookie = authCookie(res);
    expect(cookie).toBeDefined();
    expect(cookie).toContain("HttpOnly");
  });

  it("rejects a duplicate email", async () => {
    await request(app).post("/api/auth/register").send({
      name: "First",
      email: "duplicate@example.com",
      password: "password123",
    });

    const res = await request(app).post("/api/auth/register").send({
      name: "Second",
      email: "duplicate@example.com",
      password: "password123",
    });

    expect(res.status).toBe(409);
  });

  it("rejects an invalid email and a too-short password", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "not-an-email",
      password: "123",
    });

    expect(res.status).toBe(400);
    const paths = res.body.errors.map((e: { path: string }) => e.path);
    expect(paths).toContain("email");
    expect(paths).toContain("password");
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send({
      name: "Login Tester",
      email: "login-tester@example.com",
      password: "password123",
    });
  });

  it("logs in with correct credentials and sets an httpOnly auth cookie", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "login-tester@example.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeUndefined();
    expect(authCookie(res)).toBeDefined();
  });

  it("rejects an incorrect password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "login-tester@example.com",
      password: "wrong-password",
    });

    expect(res.status).toBe(401);
  });

  it("rejects a non-existent email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@example.com",
      password: "password123",
    });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("rejects the request when not authenticated", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the logged-in user using the auth cookie", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send({
      name: "Me Tester",
      email: "me-tester@example.com",
      password: "password123",
    });

    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Me Tester", email: "me-tester@example.com" });
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the auth cookie so /me is no longer authenticated", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send({
      name: "Logout Tester",
      email: "logout-tester@example.com",
      password: "password123",
    });

    expect((await agent.get("/api/auth/me")).status).toBe(200);

    const logoutRes = await agent.post("/api/auth/logout");
    expect(logoutRes.status).toBe(200);

    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });
});
