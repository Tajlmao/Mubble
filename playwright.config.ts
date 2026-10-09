import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.MUBBLE_TEST_URL || "http://localhost:3000",
    headless: true,
    launchOptions: {
      executablePath: process.env.MUBBLE_CHROMIUM_PATH || undefined,
      args: [
        "--no-sandbox",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
    screenshot: "only-on-failure",
  },
  reporter: "list",
});
