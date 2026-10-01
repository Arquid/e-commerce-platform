import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/**/*.d.ts"],
      // A few points under the current level (90 / 86 / 81 / 90), so normal
      // changes don't trip it but a real drop in coverage fails CI. Raise
      // these as coverage improves — never lower them to make a build pass.
      thresholds: {
        statements: 88,
        branches: 84,
        functions: 78,
        lines: 88,
      },
    },
  },
});
