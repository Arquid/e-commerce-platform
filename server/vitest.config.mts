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
    },
  },
});
