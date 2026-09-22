import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  // Next's postcss.config.mjs uses its string-plugin-name shorthand, which
  // plain Vite/postcss-load-config can't resolve — give Vite an inline,
  // empty postcss config so it skips auto-discovering that file.
  css: { postcss: {} },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
