import { defineConfig } from "vitest/config";
import path from "node:path";

// Vitest picks up any *.test.ts under server/, tests/, or scripts/. Tests
// run in Node and do not touch the network or any real database — DB-bound
// behaviour (hook arithmetic, cascades) is covered by an integration script
// that requires DATABASE_URL_TEST, listed as a follow-up in MIGRATION_REPORT.
export default defineConfig({
  test: {
    environment: "node",
    include: [
      "server/**/*.test.ts",
      "tests/**/*.test.ts",
      "scripts/**/*.test.ts",
    ],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
});
