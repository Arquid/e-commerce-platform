import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { runPeriodically } from "../src/utils/runPeriodically";

describe("runPeriodically", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("runs the job straight away and then every interval, until stopped", async () => {
    const job = vi.fn().mockResolvedValue(undefined);
    const stop = runPeriodically(job, 1000);
    expect(job).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2500);
    expect(job).toHaveBeenCalledTimes(3);

    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(job).toHaveBeenCalledTimes(3);
  });

  it("keeps running after the job throws, logging the error", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const job = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(undefined);
    const stop = runPeriodically(job, 1000);

    await vi.advanceTimersByTimeAsync(1000);

    expect(error).toHaveBeenCalledTimes(1);
    expect(job).toHaveBeenCalledTimes(2);
    stop();
  });

  it("does not start a run while the previous one is still going", async () => {
    let finish!: () => void;
    const job = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const stop = runPeriodically(job, 1000);

    await vi.advanceTimersByTimeAsync(3500);
    expect(job).toHaveBeenCalledTimes(1);

    finish();
    await vi.advanceTimersByTimeAsync(1000);
    expect(job).toHaveBeenCalledTimes(2);
    stop();
  });
});
