import { describe, it, expect } from "vitest";
import { getErrorMessage } from "../src/utils/errorMessage";

describe("getErrorMessage", () => {
  it("returns the server's message from an RTK Query error", () => {
    expect(getErrorMessage({ status: 409, data: { message: "Already paid." } }, "fallback")).toBe("Already paid.");
  });

  it("falls back when the error carries no message from the server", () => {
    expect(getErrorMessage(new Error("Failed to fetch"), "fallback")).toBe("fallback");
    expect(getErrorMessage({ status: "FETCH_ERROR", error: "x" }, "fallback")).toBe("fallback");
    expect(getErrorMessage({ status: 500, data: {} }, "fallback")).toBe("fallback");
    expect(getErrorMessage({ status: 500, data: "Internal Server Error" }, "fallback")).toBe("fallback");
  });

  it("ignores a message that isn't text", () => {
    expect(getErrorMessage({ data: { message: { nested: true } } }, "fallback")).toBe("fallback");
  });

  it("copes with values that aren't objects at all", () => {
    expect(getErrorMessage(undefined, "fallback")).toBe("fallback");
    expect(getErrorMessage(null, "fallback")).toBe("fallback");
    expect(getErrorMessage("boom", "fallback")).toBe("fallback");
  });
});
