import { cached, upstream, unavailable } from "@/lib/providers";
export async function GET() {
  try {
    const data = await cached("radar", 120000, async () => {
      const source = (await (
        await upstream("https://api.rainviewer.com/public/weather-maps.json")
      ).json()) as { radar: { past: { time: number; path: string }[] } };
      if (!source.radar?.past?.length) throw new Error("No radar observations");
      return {
        frames: source.radar.past.map((f) => ({
          timestamp: new Date(f.time * 1000).toISOString(),
          path: f.path,
        })),
        attribution: "RainViewer · contributing national radar networks",
        coverage:
          "Regional radar coverage only. Blank areas do not imply dry conditions.",
        fetchedAt: new Date().toISOString(),
      };
    });
    return Response.json(data);
  } catch {
    return unavailable("RainViewer radar");
  }
}
