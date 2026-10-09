import { cached, upstream, unavailable } from "@/lib/providers";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query || query.length < 2 || query.length > 100)
    return Response.json({ results: [] });
  try {
    const data = await cached("search:" + query, 3600000, async () => {
      const response = await upstream(
        "https://geocoding-api.open-meteo.com/v1/search?" +
          new URLSearchParams({
            name: query,
            count: "6",
            language: "en",
            format: "json",
          }),
      );
      return response.json();
    });
    return Response.json(data);
  } catch {
    return unavailable("Open-Meteo place search");
  }
}
