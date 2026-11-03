import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:13000",
    browserName: "chromium",
    channel: "msedge",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "node scripts/ui-server.js",
      // Dedicated test ports and an isolated MongoDB protect the running workspace.
      env: {
        PORT: "18000",
        CORS_ORIGINS: "http://127.0.0.1:13000",
        RATE_LIMIT_MAX: "2000",
        NODE_ENV: "test",
      },
      url: "http://127.0.0.1:18000/api/v1/health",
      timeout: 120000,
    },
    {
      command: "npm run dev -w client -- --port 13000",
      env: { VITE_API_BASE_URL: "http://127.0.0.1:18000/api/v1" },
      url: "http://127.0.0.1:13000",
      timeout: 60000,
    },
  ],
});
