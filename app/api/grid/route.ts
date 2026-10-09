import { spawn } from "node:child_process";
import { join } from "node:path";
import { cached, upstream, unavailable } from "@/lib/providers";
import { gfsCycle } from "@/lib/weather";
import type { Grid } from "@/lib/types";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("hour") || "3";
  const hour = Number(raw);
  if (!Number.isInteger(hour) || hour < 3 || hour > 72 || hour % 3 !== 0)
    return Response.json(
      { error: "Forecast hour must be 3–72, in 3-hour steps" },
      { status: 400 },
    );
  const cycle = gfsCycle(),
    day = cycle.toISOString().slice(0, 10).replaceAll("-", ""),
    cycleHour = String(cycle.getUTCHours()).padStart(2, "0");
  try {
    const grid = await cached(
      `gfs:${day}:${cycleHour}:${hour}`,
      3600000,
      async () => {
        const query = new URLSearchParams({
          file: `gfs.t${cycleHour}z.pgrb2.1p00.f${String(hour).padStart(3, "0")}`,
          dir: `/gfs.${day}/${cycleHour}/atmos`,
          var_TMP: "on",
          var_RH: "on",
          var_UGRD: "on",
          var_VGRD: "on",
          var_PRMSL: "on",
          var_APCP: "on",
          lev_2_m_above_ground: "on",
          lev_10_m_above_ground: "on",
          lev_mean_sea_level: "on",
          lev_surface: "on",
        });
        const response = await upstream(
          "https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_1p00.pl?" + query,
          40000,
        );
        const buffer = Buffer.from(await response.arrayBuffer());
        if (
          buffer.byteLength > 20000000 ||
          buffer.subarray(0, 4).toString() !== "GRIB"
        )
          throw new Error("Invalid NOAA GRIB response");
        return await new Promise<Grid>((resolve, reject) => {
          const child = spawn(
            join(process.cwd(), ".venv/bin/python"),
            [join(process.cwd(), "scripts/decode-grib.py")],
            { stdio: ["pipe", "pipe", "pipe"] },
          );
          let output = "";
          child.stdout.on("data", (data) => {
            output += data;
            if (output.length > 20000000) child.kill();
          });
          child.stderr.resume();
          child.on("error", reject);
          const timeout = setTimeout(() => {
            child.kill();
            reject(new Error("Decoder timeout"));
          }, 15000);
          child.on("close", (code) => {
            clearTimeout(timeout);
            try {
              if (code !== 0) throw new Error("GRIB decoder failed");
              resolve(JSON.parse(output));
            } catch (error) {
              reject(error);
            }
          });
          child.stdin.on("error", () => {});
          child.stdin.end(buffer);
        });
      },
    );
    return Response.json(grid, {
      headers: { "Cache-Control": "public, max-age=1800" },
    });
  } catch {
    return unavailable("NOAA GFS global forecast");
  }
}
