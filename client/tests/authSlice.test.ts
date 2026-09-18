import { describe, it, expect } from "vitest";
import reducer, { setCredentials, logOut } from "../src/features/auth/authSlice";

const user = { id: "1", name: "Ada", email: "ada@example.com", role: "customer" };

describe("authSlice", () => {
  it("starts with no user", () => {
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.user).toBeNull();
  });

  it("does not read or write localStorage — the token lives only in an httpOnly cookie", () => {
    localStorage.setItem("token", "should-be-ignored");
    const state = reducer(undefined, setCredentials({ user }));
    expect(state.user).toEqual(user);
    expect(localStorage.getItem("token")).toBe("should-be-ignored");
    expect(localStorage.getItem("user")).toBeNull();
    localStorage.clear();
  });

  it("setCredentials stores the user in state", () => {
    const state = reducer(undefined, setCredentials({ user }));
    expect(state.user).toEqual(user);
  });

  it("logOut clears the user from state", () => {
    let state = reducer(undefined, setCredentials({ user }));
    state = reducer(state, logOut());
    expect(state.user).toBeNull();
  });
});
