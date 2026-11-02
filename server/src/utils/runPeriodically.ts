// Runs `job` now and then every `intervalMs`, never two at once. An error in the
// job is logged and doesn't stop later runs or take the process down (an
// unhandled rejection in a timer would). Returns a function that stops it.
export function runPeriodically(job: () => Promise<void>, intervalMs: number) {
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      await job();
    } catch (err) {
      console.error("Scheduled job failed", err);
    } finally {
      running = false;
    }
  };

  void run();
  const timer = setInterval(run, intervalMs);
  // Don't let this timer keep the process alive on shutdown.
  timer.unref();

  return () => clearInterval(timer);
}
