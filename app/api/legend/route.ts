import { satelliteCatalog, upstream } from "@/lib/providers";
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("layer"),
      catalog = await satelliteCatalog();
    const source = [catalog.visible, catalog.infrared].find(
      (d) => d?.id === id,
    )?.legend;
    if (!source) return new Response("Legend unavailable", { status: 404 });
    const url = new URL(source);
    if (url.hostname !== "gibs.earthdata.nasa.gov" || url.protocol !== "https:")
      return new Response("Invalid source", { status: 400 });
    const response = await upstream(url.toString());
    return new Response(await response.text(), {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    return new Response("Legend source unavailable", { status: 503 });
  }
}
