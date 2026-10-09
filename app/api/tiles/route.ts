import { upstream, satelliteCatalog } from "@/lib/providers";
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const kind = p.get("kind"),
    z = Number(p.get("z")),
    x = Number(p.get("x")),
    y = Number(p.get("y"));
  if (
    ![x, y, z].every(Number.isInteger) ||
    z < 0 ||
    z > 10 ||
    x < 0 ||
    y < 0 ||
    x > 2 ** (z + 2) ||
    y > 2 ** (z + 1)
  )
    return new Response("Invalid tile", { status: 400 });
  let url: string;
  try {
    if (kind === "satellite") {
      const catalog = await satelliteCatalog();
      const dataset = [catalog.visible, catalog.infrared].find(
        (d) => d?.id === p.get("layer"),
      );
      const date = p.get("date");
      if (
        !dataset ||
        !date ||
        !dataset.frames.some((f) => f.timestamp.startsWith(date)) ||
        z > dataset.maxLevel
      )
        return new Response("Unavailable product", { status: 404 });
      const span = 180 / 2 ** z,
        west = -180 + x * span,
        north = 90 - y * span;
      const query = new URLSearchParams({
        SERVICE: "WMS",
        REQUEST: "GetMap",
        VERSION: "1.1.1",
        LAYERS: dataset.id,
        STYLES: "",
        FORMAT: "image/png",
        TRANSPARENT: "TRUE",
        SRS: "EPSG:4326",
        BBOX: [west, north - span, west + span, north].join(","),
        WIDTH: "512",
        HEIGHT: "512",
        TIME: date,
      });
      url =
        "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?" + query;
    } else if (kind === "radar") {
      const path = p.get("path");
      if (!path || !/^\/v2\/radar\/[a-zA-Z0-9]+$/.test(path))
        return new Response("Invalid frame", { status: 400 });
      url = `https://tilecache.rainviewer.com${path}/256/${z}/${x}/${y}/2/1_1.png`;
    } else return new Response("Unknown provider", { status: 400 });
    const response = await upstream(url, 15000);
    const body = await response.arrayBuffer();
    if (body.byteLength > 4 * 1024 * 1024)
      return new Response("Tile too large", { status: 502 });
    return new Response(body, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Imagery currently unavailable", { status: 503 });
  }
}
