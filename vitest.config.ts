import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    setupFiles: ["./tests/setup.ts"],
    // El primer test puede descargar el modelo de embeddings local
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
