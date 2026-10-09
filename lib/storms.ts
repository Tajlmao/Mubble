import type { Storm } from "./types";
export function normalizeStorms(source: {
  activeStorms?: Record<string, unknown>[];
}): Storm[] {
  return (source.activeStorms || []).flatMap((s) => {
    const latitude = Number(s.latitudeNumeric),
      longitude = Number(s.longitudeNumeric);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    )
      return [];
    const advisory = s.publicAdvisory as
      | { issuance?: string; url?: string }
      | undefined;
    const n = (value: unknown) =>
      value === undefined || value === null || value === ""
        ? undefined
        : Number.isFinite(Number(value))
          ? Number(value)
          : undefined;
    const classification = String(s.classification || "Tropical cyclone");
    const classes: Record<string, string> = {
      HU: "Hurricane",
      TS: "Tropical storm",
      TD: "Tropical depression",
      SS: "Subtropical storm",
      SD: "Subtropical depression",
      PTC: "Potential tropical cyclone",
    };
    return [
      {
        id: String(s.id),
        name: String(s.name || s.id),
        classification: classes[classification] || classification,
        latitude,
        longitude,
        windKts: n(s.intensity),
        pressureMb: n(s.pressure),
        movement: s.movementDir
          ? `${s.movementDir}${typeof s.movementDir === "number" ? "°" : ""} at ${s.movementSpeed} kt`
          : undefined,
        advisoryTime: String(advisory?.issuance || s.lastUpdate || ""),
        advisoryUrl: advisory?.url,
        agency: "NOAA National Hurricane Center · 1-minute sustained winds",
        history: [],
        forecast: [],
      },
    ];
  });
}
export function parseAtcf(text: string, forecast: boolean) {
  const positions = new Map<
    string,
    { latitude: number; longitude: number; time: string }
  >();
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(",").map((v) => v.trim()));
  const latest = rows
    .filter((r) => r.length > 9 && (!forecast || r[4] === "OFCL"))
    .map((r) => r[2])
    .sort()
    .at(-1);
  for (const row of rows) {
    if (
      row.length < 10 ||
      (forecast && (row[4] !== "OFCL" || row[2] !== latest))
    )
      continue;
    const coord = (v: string) =>
      /^\d+[NSEW]$/.test(v)
        ? (parseInt(v) / 10) * (/[SW]$/.test(v) ? -1 : 1)
        : NaN;
    const latitude = coord(row[6]),
      longitude = coord(row[7]),
      base = row[2];
    if (
      !/^\d{10}$/.test(base) ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    )
      continue;
    const date = new Date(
      `${base.slice(0, 4)}-${base.slice(4, 6)}-${base.slice(6, 8)}T${base.slice(8, 10)}:00:00Z`,
    );
    date.setUTCHours(date.getUTCHours() + Number(row[5]));
    if (!Number.isFinite(date.getTime())) continue;
    const time = date.toISOString();
    positions.set(time, { latitude, longitude, time });
  }
  return [...positions.values()].sort((a, b) => a.time.localeCompare(b.time));
}
