import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ["./tests/setupEnv.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      // Standalone entry scripts, run directly with ts-node — tests import
      // app.ts instead, so these would only ever show up as 0% noise.
      exclude: ["src/index.ts", "src/seed.ts"],
      // A few points under the current level (90 / 75 / 94 / 92), so normal
      // changes don't trip it but a real drop in coverage fails CI. Raise
      // these as coverage improves — never lower them to make a build pass.
      thresholds: {
        statements: 88,
        branches: 72,
        functions: 92,
        lines: 90,
      },
    },
  },
});
