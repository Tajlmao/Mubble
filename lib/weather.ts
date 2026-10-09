import type { Grid, LayerId, Units, ViewState } from "./types";
export const forecastLayers: LayerId[] = [
  "wind",
  "temperature",
  "humidity",
  "pressure",
  "precipitation",
];
export const palettes: Record<
  string,
  { stops: [number, string][]; unit: string }
> = {
  temperature: {
    stops: [
      [-30, "#786ac4"],
      [-10, "#4e9bc4"],
      [0, "#85d6cf"],
      [15, "#dad69c"],
      [30, "#e8a477"],
      [45, "#b2515c"],
    ],
    unit: "°C",
  },
  wind: {
    stops: [
      [0, "#aac5cc"],
      [5, "#77c9c4"],
      [15, "#cece75"],
      [30, "#d58b62"],
      [50, "#b96ba6"],
    ],
    unit: "m/s",
  },
  humidity: {
    stops: [
      [0, "#b39474"],
      [30, "#c6c6a1"],
      [60, "#76bdb5"],
      [100, "#397ab6"],
    ],
    unit: "%",
  },
  pressure: {
    stops: [
      [960, "#695b9f"],
      [990, "#659eb5"],
      [1010, "#a1c9b8"],
      [1030, "#d6b482"],
      [1050, "#c47971"],
    ],
    unit: "hPa",
  },
  precipitation: {
    stops: [
      [0, "#24414d"],
      [1, "#5cbac2"],
      [10, "#71b47d"],
      [30, "#dbc06e"],
      [60, "#bc779b"],
    ],
    unit: "mm",
  },
};
export function gfsCycle(now = new Date()) {
  const date = new Date(now.getTime() - 6 * 3600000);
  date.setUTCMinutes(0, 0, 0);
  date.setUTCHours(Math.floor(date.getUTCHours() / 6) * 6);
  return date;
}
export function gridValue(
  grid: Grid,
  field: keyof Grid["fields"],
  lon: number,
  lat: number,
) {
  const data = grid.fields[field];
  if (!data) return undefined;
  // Longitude wraps; the latitude axis is bounded. Bilinear interpolation is a display enhancement.
  const x = ((lon - grid.lon0 + 720) % 360) / grid.dx;
  const y = (lat - grid.lat0) / grid.dy;
  if (y < 0 || y > grid.ny - 1) return undefined;
  const x0 = Math.floor(x) % grid.nx,
    x1 = (x0 + 1) % grid.nx,
    y0 = Math.floor(y),
    y1 = Math.min(y0 + 1, grid.ny - 1);
  const a = data[y0 * grid.nx + x0],
    b = data[y0 * grid.nx + x1],
    c = data[y1 * grid.nx + x0],
    d = data[y1 * grid.nx + x1];
  if (![a, b, c, d].every(Number.isFinite)) return undefined;
  const tx = x - Math.floor(x),
    ty = y - y0;
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}
export function layerValue(
  grid: Grid,
  layer: LayerId,
  lon: number,
  lat: number,
) {
  if (layer === "wind") {
    const u = gridValue(grid, "u", lon, lat),
      v = gridValue(grid, "v", lon, lat);
    return u === undefined || v === undefined ? undefined : Math.hypot(u, v);
  }
  return gridValue(grid, layer as keyof Grid["fields"], lon, lat);
}
export function weatherLabel(code: number) {
  if (code === 0) return "Clear sky";
  if (code < 4) return "Partly cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code < 60) return "Drizzle";
  if (code < 70) return "Rain";
  if (code < 80) return "Snow";
  if (code < 90) return "Rain showers";
  return "Thunderstorms";
}
export function temperature(value: number, units: Units) {
  return Math.round(units === "metric" ? value : (value * 9) / 5 + 32);
}
export function speed(value: number, units: Units) {
  return Math.round(units === "metric" ? value : value * 0.621371);
}
export function formatTime(
  iso: string,
  timeZone = "UTC",
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
    ...options,
  }).format(new Date(iso));
}
export function parseView(params: URLSearchParams): Partial<ViewState> {
  const result: Partial<ViewState> = {};
  for (const key of [
    "longitude",
    "latitude",
    "height",
    "heading",
    "pitch",
  ] as const) {
    const raw = params.get(key);
    if (raw === null) continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    if (
      (key === "latitude" && Math.abs(n) > 90) ||
      (key === "longitude" && Math.abs(n) > 180) ||
      (key === "height" && (n < 1000 || n > 40000000))
    )
      continue;
    result[key] = n;
  }
  return result;
}
export function colorAt(value: number, stops: [number, string][]) {
  const lo = stops.reduce((a, s) => (s[0] <= value ? s : a), stops[0]);
  const hi = stops.find((s) => s[0] >= value) || stops.at(-1)!;
  const t =
    lo[0] === hi[0]
      ? 0
      : Math.max(0, Math.min(1, (value - lo[0]) / (hi[0] - lo[0])));
  const rgb = (hex: string) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const a = rgb(lo[1]),
    b = rgb(hi[1]);
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}
