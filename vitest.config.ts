import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: [{ find: /^@\//, replacement: `${path.resolve(__dirname)}/` }],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    environmentMatchGlobs: [["src/**/*.test.tsx", "jsdom"]],
    restoreMocks: true,
  },
});
