import { describe, it, expect } from "vitest";
import { parseTrustProxy } from "../src/config/trustProxy";

describe("parseTrustProxy", () => {
  it("parses a numeric hop count", () => {
    expect(parseTrustProxy("1")).toBe(1);
    expect(parseTrustProxy("2")).toBe(2);
  });

  it("parses boolean-shaped values case-insensitively", () => {
    expect(parseTrustProxy("true")).toBe(true);
    expect(parseTrustProxy("TRUE")).toBe(true);
    expect(parseTrustProxy("false")).toBe(false);
  });

  it("throws a clear error instead of letting Express crash on garbage input", () => {
    expect(() => parseTrustProxy("garbage")).toThrow(/Invalid TRUST_PROXY value/);
    expect(() => parseTrustProxy("yes")).toThrow(/Invalid TRUST_PROXY value/);
  });
});
