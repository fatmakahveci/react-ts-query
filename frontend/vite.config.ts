import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    restoreMocks: true,
    setupFiles: "./src/test/setup.ts",
    coverage: {
      provider: "v8",
      include: [
        "src/app/util/http.tsx",
        "src/app/components/Events/{FindEventSection,NewEventsSection}.tsx",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
