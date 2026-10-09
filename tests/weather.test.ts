import { test } from "node:test";
import assert from "node:assert/strict";
import {
  gfsCycle,
  gridValue,
  layerValue,
  parseView,
  colorAt,
  temperature,
  weatherLabel,
} from "../lib/weather";
import { recentDailyFrames, coordinate } from "../lib/providers";
import { normalizeStorms } from "../lib/storms";
import type { Grid } from "../lib/types";
const grid: Grid = {
  cycle: "2026-10-09T00:00:00Z",
  valid: "2026-10-09T03:00:00Z",
  nx: 4,
  ny: 2,
  lon0: 0,
  lat0: 90,
  dx: 90,
  dy: -180,
  fields: {
    temperature: [0, 10, 20, 30, 40, 50, 60, 70],
    u: Array(8).fill(3),
    v: Array(8).fill(4),
  },
  attribution: "Isolated test fixture",
};
test("GFS publication lag crosses date boundaries and picks a six-hour cycle", () => {
  assert.equal(
    gfsCycle(new Date("2026-10-09T04:20:00Z")).toISOString(),
    "2026-10-08T18:00:00.000Z",
  );
  assert.equal(
    gfsCycle(new Date("2026-10-09T15:20:00Z")).toISOString(),
    "2026-10-09T06:00:00.000Z",
  );
});
test("grid samples wrap the antimeridian and interpolate north-to-south", () => {
  assert.equal(gridValue(grid, "temperature", 45, 0), 25);
  assert.equal(gridValue(grid, "temperature", -90, 90), 30);
  assert.equal(gridValue(grid, "temperature", 360, 90), 0);
  assert.equal(gridValue(grid, "temperature", 0, 91), undefined);
  assert.equal(layerValue(grid, "wind", -30, 10), 5);
});
test("missing vectors never become invented wind speeds", () => {
  assert.equal(
    layerValue({ ...grid, fields: { u: grid.fields.u } }, "wind", 10, 10),
    undefined,
  );
});
test("NASA frame dates come from published dimensions rather than local time", () => {
  const frames = recentDailyFrames({
    Default: "2026-10-08",
    Value: "2020-01-01/2026-10-07/P1D",
  });
  assert.equal(frames.length, 7);
  assert.equal(frames.at(-1)?.timestamp, "2026-10-07T00:00:00.000Z");
  assert.deepEqual(recentDailyFrames({}), []);
});
test("coordinate validation rejects missing, non-finite, and out-of-range input", () => {
  for (const value of [null, "", "abc", "91", "Infinity"])
    assert.throws(() => coordinate(value, 90));
  assert.equal(coordinate("-89", 90), -89);
});
test("shared view parameters cannot inject invalid geographic positions", () => {
  assert.deepEqual(
    parseView(new URLSearchParams("latitude=91&longitude=abc&height=-2")),
    {},
  );
  assert.equal(
    parseView(new URLSearchParams("latitude=-25&height=4000000")).latitude,
    -25,
  );
});
test("NHC normalization retains wind convention and never fabricates missing pressure", () => {
  const result = normalizeStorms({
    activeStorms: [
      {
        id: "al012026",
        name: "Test storm",
        latitudeNumeric: 20,
        longitudeNumeric: -50,
        classification: "TS",
        intensity: "45",
        publicAdvisory: { issuance: "2026-10-09T00:00:00Z" },
      },
    ],
  });
  assert.equal(result[0].classification, "Tropical storm");
  assert.equal(result[0].windKts, 45);
  assert.equal(result[0].pressureMb, undefined);
  assert.deepEqual(result[0].forecast, []);
  assert.deepEqual(
    normalizeStorms({ activeStorms: [{ latitudeNumeric: "invalid" }] }),
    [],
  );
});
test("scientific legends interpolate colors and point forecast units convert", () => {
  assert.deepEqual(
    colorAt(5, [
      [0, "#000000"],
      [10, "#ffffff"],
    ]),
    [128, 128, 128],
  );
  assert.equal(temperature(0, "imperial"), 32);
  assert.equal(weatherLabel(95), "Thunderstorms");
});
test("published satellite gaps do not turn into invented frames", () => {
  const frames = recentDailyFrames({
    Value: ["2026-10-01/2026-10-03/P1D", "2026-10-06/2026-10-07/P1D"],
  });
  assert.deepEqual(
    frames.map((f) => f.timestamp.slice(0, 10)),
    ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-06", "2026-10-07"],
  );
});
