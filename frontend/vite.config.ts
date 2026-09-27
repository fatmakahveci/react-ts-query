import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    restoreMocks: true,
    setupFiles: "./src/testing/setup.ts",
    coverage: {
      provider: "v8",
      include: [
        "src/features/events/api/events.api.ts",
        "src/features/events/api/events.queries.ts",
        "src/features/events/hooks/*.ts",
        "src/lib/api-client.ts",
        "src/lib/visitor-preferences.ts",
        "src/features/events/lib/*.ts",
        "src/features/auth/AdminAccess.tsx",
        "src/features/events/pages/{CreateEventPage,EditEventPage,EventDetailsPage,EventCollectionPage}.tsx",
        "src/components/layout/ThemePicker.tsx",
        "src/components/ui/Toast.tsx",
        "src/components/ui/Modal.tsx",
        "src/features/events/components/{EventSearchSection,EventForm,EventImagePicker}.tsx",
        "src/features/events/components/{DiscoveryHighlights,EventActions,EventCalendar,GettingStarted,SaveEventButton}.tsx",
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
