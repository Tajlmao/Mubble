import { fetch as upstreamFetch, ProxyAgent } from "undici";
import { XMLParser } from "fast-xml-parser";
import type { Frame, SatelliteCatalog, SatelliteDataset } from "./types";
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;
const cache = new Map<string, { expires: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();
export async function cached<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>,
): Promise<T> {
  const found = cache.get(key);
  if (found && found.expires > Date.now()) return found.value as T;
  if (pending.has(key)) return pending.get(key) as Promise<T>;
  const promise = fn()
    .then((value) => {
      if (cache.size > 36) cache.delete(cache.keys().next().value!);
      cache.set(key, { expires: Date.now() + ttl, value });
      return value;
    })
    .finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}
export async function upstream(url: string, timeout = 18000) {
  const response = await upstreamFetch(url, {
    dispatcher,
    signal: AbortSignal.timeout(timeout),
    redirect: "error",
    headers: {
      "User-Agent": "Mubble/0.1 (weather exploration)",
      Accept: "*/*",
    },
  });
  if (!response.ok)
    throw new Error(`Provider returned HTTP ${response.status}`);
  return response;
}
export function unavailable(provider: string) {
  return Response.json(
    {
      error: "unavailable",
      provider,
      message: `${provider} is currently unreachable. Check provider access or retry shortly. No substitute data is displayed.`,
    },
    { status: 503, headers: { "Retry-After": "60" } },
  );
}
export function coordinate(value: string | null, limit: number) {
  if (value === null || value.trim() === "")
    throw new Error("Missing coordinate");
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) > limit)
    throw new Error("Invalid coordinate");
  return n;
}
export function recentDailyFrames(dimension: {
  Default?: string;
  Value?: string | string[];
}): Frame[] {
  const published = [dimension.Value || dimension.Default || ""].flat();
  const dates = new Set<string>();
  for (const value of published) {
    const [start, end] = value.split("/");
    const last = new Date((end || start).slice(0, 10) + "T00:00:00Z");
    const first = new Date(start.slice(0, 10) + "T00:00:00Z");
    if (!Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime()))
      continue;
    for (let i = 0; i < 7; i++) {
      const date = new Date(last.getTime() - i * 86400000);
      if (date < first) break;
      dates.add(date.toISOString());
    }
  }
  return [...dates]
    .sort()
    .slice(-7)
    .map((timestamp) => ({ timestamp }));
}
export async function satelliteCatalog(): Promise<SatelliteCatalog> {
  return cached("satellite", 30 * 60000, async () => {
    const response = await upstream(
      "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/WMTSCapabilities.xml",
    );
    const xml = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,
    }).parse(await response.text());
    const layers = xml.Capabilities.Contents.Layer as Record<string, unknown>[];
    function find(ids: string[]): SatelliteDataset | undefined {
      const layer = ids
        .map((id) => layers.find((l) => l.Identifier === id))
        .find(Boolean);
      if (!layer) return;
      const dimensions = [layer.Dimension].flat() as {
        Identifier: string;
        Default: string;
        Value: string;
      }[];
      const time = dimensions.find((d) => d.Identifier === "Time");
      if (!time) return;
      const links = [layer.TileMatrixSetLink].flat() as {
        TileMatrixSet: string;
      }[];
      const matrix = links[0].TileMatrixSet;
      const matrices = xml.Capabilities.Contents.TileMatrixSet.find(
        (m: { Identifier: string }) => m.Identifier === matrix,
      );
      const maxLevel = Math.min(8, matrices?.TileMatrix?.length - 1 || 5);
      return {
        id: String(layer.Identifier),
        title:
          typeof layer.Title === "object"
            ? String((layer.Title as Record<string, string>)["#text"])
            : String(layer.Title),
        frames: recentDailyFrames(time),
        matrix,
        maxLevel,
        legend: (() => {
          const style = layer.Style as
            | { LegendURL?: { "@_href": string; "@_title"?: string }[] }
            | undefined;
          return [style?.LegendURL]
            .flat()
            .find((l) => l?.["@_title"]?.includes("Horizontal"))?.["@_href"];
        })(),
      };
    }
    const visible = find([
      "VIIRS_SNPP_CorrectedReflectance_TrueColor",
      "MODIS_Terra_CorrectedReflectance_TrueColor",
    ]);
    if (!visible?.frames.length)
      throw new Error("Daily satellite imagery unavailable");
    const infrared = find([
      "VIIRS_SNPP_Brightness_Temp_BandI5_Night",
      "MODIS_Terra_Brightness_Temp_Band31_Night",
    ]);
    return {
      visible,
      infrared,
      attribution: "NASA EOSDIS GIBS · VIIRS / MODIS",
      fetchedAt: new Date().toISOString(),
    };
  });
}
