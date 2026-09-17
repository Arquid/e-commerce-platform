import { describe, it, expect, vi, afterEach } from "vitest";
import { validateEnv } from "../src/config/validateEnv";

describe("validateEnv", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("does not exit when all required variables are present", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    validateEnv();

    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("exits with code 1 and logs the missing variable when one is absent", () => {
    delete process.env.JWT_SECRET;
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    validateEnv();

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("JWT_SECRET"));
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("lists every missing variable when more than one is absent", () => {
    delete process.env.JWT_SECRET;
    delete process.env.STRIPE_SECRET_KEY;
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    validateEnv();

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("JWT_SECRET"));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("STRIPE_SECRET_KEY"));

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
