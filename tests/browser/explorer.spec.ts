import { test, expect } from "@playwright/test";
test("Mubble identity, real globe navigation, and persistent settings", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page).toHaveTitle("Mubble — Weather & Earth");
  await expect(page.locator('meta[name="application-name"]')).toHaveAttribute(
    "content",
    "Mubble",
  );
  await expect(page.getByAltText("Mubble orbital M logo")).toBeVisible();
  await expect(page.getByText("Opening Mubble", { exact: true })).toHaveCount(
    0,
    { timeout: 20000 },
  );
  await expect(page.locator(".cesium-widget canvas")).toBeVisible();
  const before = await page.locator(".bottom-meta").innerText();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.locator(".bottom-meta")).not.toHaveText(before);
  await page.getByRole("button", { name: "Weather", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Weather", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Mubble settings", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Mubble");
  await page.getByRole("button", { name: "°F / mi", exact: true }).click();
  await page
    .getByRole("switch", { name: "Country boundaries", exact: true })
    .click();
  await page.getByRole("button", { name: "Close panel", exact: true }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Mubble settings", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "°F / mi", exact: true }),
  ).toHaveClass(/active/);
  await expect(
    page.getByRole("switch", { name: "Country boundaries", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  expect(errors).toEqual([]);
});
test("location search opens a genuine model forecast", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search the planet" }).click();
  await page
    .getByRole("textbox", { name: "Search city, region or country" })
    .fill("Mumbai");
  await page
    .getByRole("button", { name: /Mumbai Maharashtra/ })
    .click({ timeout: 30000 });
  const forecast = page.getByRole("region", { name: "Weather for Mumbai" });
  await expect(forecast).toBeVisible();
  await expect(forecast.locator(".temperature")).toContainText(/\d+°C/, {
    timeout: 30000,
  });
  await expect(forecast).toContainText("Open-Meteo · model-derived conditions");
  await forecast.getByRole("button", { name: "7-day forecast" }).click();
  await expect(forecast.locator(".daily>div")).toHaveCount(7);
  await page.getByRole("button", { name: "Save this place" }).click();
  await expect(
    page.getByRole("button", { name: "Saved in Mubble" }),
  ).toBeVisible();
});
test("satellite timestamps, GFS fields, and manual timeline scrubbing", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".observation-status")).toContainText(
    "Daily satellite mosaic",
    { timeout: 30000 },
  );
  await expect(page.locator("#timeline-slider")).toBeEnabled();
  await page.locator("#timeline-slider").fill("2");
  await expect(page.locator("#timeline-slider")).toHaveValue("2");
  await page.getByRole("button", { name: "Temperature", exact: true }).click();
  await expect(page.locator(".observation-status")).toContainText(
    "Model forecast",
    { timeout: 45000 },
  );
  await expect(page.locator(".weather-legend")).toContainText("°C");
  await expect(page.locator(".timeline")).toContainText("Forecast");
  await page.getByRole("button", { name: "Wind", exact: true }).click();
  await expect(page.locator(".weather-legend")).toContainText("m/s", {
    timeout: 30000,
  });
  await page.waitForTimeout(2000);
  const pixels = await page
    .locator(".wind-canvas")
    .evaluate(
      (canvas: HTMLCanvasElement) =>
        Array.from(
          canvas
            .getContext("2d")!
            .getImageData(0, 0, canvas.width, canvas.height).data,
        ).filter((v, i) => i % 4 === 3 && v > 0).length,
    );
  expect(pixels).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
test("provider outage is explicit and mobile controls stay inside the viewport", async ({
  page,
}) => {
  await page.route("**/api/satellite", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "NASA temporarily unavailable." }),
    }),
  );
  await page.route("**/api/storms", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Advisories unavailable." }),
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".observation-status")).toContainText(
    "Reference Earth",
  );
  await expect(
    page.getByRole("button", { name: "Play timeline" }),
  ).toBeDisabled();
  await expect(page.locator("body")).not.toContainText("Live satellite");
  await expect(page.locator(".cesium-widget canvas")).toBeVisible();
  await page.getByRole("button", { name: "Map layers", exact: true }).click();
  await page
    .getByRole("button", { name: "Tropical cyclones", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "We cannot confirm active storms",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  for (const selector of [
    ".brand-area",
    ".mode-switch",
    ".timeline",
    ".right-tools",
  ]) {
    const box = await page.locator(selector).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
  await page.screenshot({ path: "test-results/mubble-mobile.png" });
});
