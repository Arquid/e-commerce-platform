import { describe, it, expect, beforeEach, vi } from "vitest";

const user = { id: "1", name: "Ada", email: "ada@example.com", role: "customer" };

describe("authSlice", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("starts with no user when localStorage is empty", async () => {
    const { default: reducer } = await import("../src/features/auth/authSlice");
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it("restores a persisted user and token from localStorage", async () => {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", "persisted-token");
    const { default: reducer } = await import("../src/features/auth/authSlice");
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.token).toBe("persisted-token");
    expect(state.user?.email).toBe("ada@example.com");
  });

  it("setCredentials stores the user and token in state and localStorage", async () => {
    const { default: reducer, setCredentials } = await import("../src/features/auth/authSlice");
    const state = reducer(undefined, setCredentials({ user, token: "new-token" }));
    expect(state.user).toEqual(user);
    expect(state.token).toBe("new-token");
    expect(localStorage.getItem("token")).toBe("new-token");
    expect(JSON.parse(localStorage.getItem("user")!)).toEqual(user);
  });

  it("logOut clears the user and token from state and localStorage", async () => {
    const { default: reducer, setCredentials, logOut } = await import("../src/features/auth/authSlice");
    let state = reducer(undefined, setCredentials({ user, token: "new-token" }));
    state = reducer(state, logOut());
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });
});
