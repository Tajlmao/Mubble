import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const baseURL = process.env.MUBBLE_TEST_URL || "http://127.0.0.1:3000";
const output = resolve(process.env.MUBBLE_SCREENSHOT_DIR || "docs/images");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.MUBBLE_CHROMIUM_PATH || undefined,
  headless: true,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseURL);
  await page.locator(".cesium-widget canvas").waitFor({ timeout: 30000 });
  await page.waitForFunction(
    () => !document.body.textContent.includes("Opening Mubble"),
    undefined,
    { timeout: 30000 },
  );
  await page.waitForTimeout(10000);
  await page.screenshot({ path: resolve(output, "desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.locator(".cesium-widget canvas").waitFor({ timeout: 30000 });
  await page.waitForTimeout(7000);
  await page.screenshot({ path: resolve(output, "mobile.png") });
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(`Mubble screenshots saved to ${output}`);
} finally {
  await browser.close();
}
