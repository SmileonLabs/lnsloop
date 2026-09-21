import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter @loop/api exec tsx src/test-server.ts",
      url: "http://localhost:4000/health",
      env: { TEST_ORIGINS: "http://localhost:5173,http://localhost:8081" },
      reuseExistingServer: false,
    },
    {
      command: "pnpm --filter @loop/admin dev",
      url: "http://localhost:5173",
      reuseExistingServer: false,
    },
    {
      command:
        "pnpm --filter @loop/admin exec vite ../patient-mobile/dist --host 127.0.0.1 --port 8081",
      url: "http://localhost:8081",
      reuseExistingServer: false,
    },
  ],
  timeout: 60000,
});
