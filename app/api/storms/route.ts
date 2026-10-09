import { cached, upstream, unavailable } from "@/lib/providers";
import { normalizeStorms, parseAtcf } from "@/lib/storms";
import { unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";
export async function GET() {
  try {
    const data = await cached("storms", 300000, async () => {
      const source = (await (
        await upstream("https://www.nhc.noaa.gov/CurrentStorms.json")
      ).json()) as { activeStorms: Record<string, unknown>[] };
      const storms = normalizeStorms(source);
      await Promise.all(
        storms.map(async (storm) => {
          const raw = source.activeStorms.find((s) => s.id === storm.id);
          const track = raw?.forecastTrack as
            | { url?: string; kmzFile?: string }
            | undefined;
          if (/^((al)|(ep)|(cp))\d{6}$/.test(storm.id)) {
            await Promise.all(
              [
                ["fst", `https://ftp.nhc.noaa.gov/atcf/fst/${storm.id}.fst`],
                ["btk", `https://ftp.nhc.noaa.gov/atcf/btk/b${storm.id}.dat`],
              ].map(async ([type, url]) => {
                try {
                  const positions = parseAtcf(
                    await (await upstream(url, 10000)).text(),
                    type === "fst",
                  );
                  if (type === "fst") storm.forecast = positions;
                  else storm.history = positions;
                } catch {}
              }),
            );
          }
          if (storm.forecast.length) return;
          const trackUrl = track?.kmzFile || track?.url;
          if (!trackUrl) return;
          try {
            const url = new URL(trackUrl);
            if (
              url.hostname !== "www.nhc.noaa.gov" ||
              url.protocol !== "https:"
            )
              return;
            const response = await upstream(url.toString());
            const archive = new Uint8Array(await response.arrayBuffer());
            if (archive.length > 2000000) return;
            const files = url.pathname.endsWith(".kmz")
              ? unzipSync(archive, {
                  filter: (file) =>
                    file.name.endsWith(".kml") && file.originalSize < 5000000,
                })
              : { "track.kml": archive };
            const file = Object.values(files)[0];
            if (!file) return;
            const doc = new XMLParser({ removeNSPrefix: true }).parse(
              new TextDecoder().decode(file),
            );
            const walk = (node: unknown) => {
              if (!node || typeof node !== "object") return;
              const obj = node as Record<string, unknown>;
              if (obj.LineString) {
                const line = obj.LineString as { coordinates?: string };
                if (line.coordinates)
                  storm.forecast = line.coordinates
                    .trim()
                    .split(/\s+/)
                    .map((c) => {
                      const [lon, lat] = c.split(",").map(Number);
                      return { longitude: lon, latitude: lat };
                    })
                    .filter(
                      (p) =>
                        Number.isFinite(p.latitude) &&
                        Number.isFinite(p.longitude),
                    );
              }
              Object.values(obj).forEach(walk);
            };
            walk(doc);
          } catch {
            /* Keep verified advisories when optional track retrieval fails. */
          }
        }),
      );
      return {
        storms,
        fetchedAt: new Date().toISOString(),
        coverage:
          "NHC: Atlantic, eastern and central Pacific. Other basins are not connected.",
      };
    });
    return Response.json(data);
  } catch {
    return unavailable("NHC tropical cyclone advisories");
  }
}
