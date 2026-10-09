import { upstream } from "@/lib/providers";
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const z = Number(p.get("z")),
    x = Number(p.get("x")),
    y = Number(p.get("y"));
  if (
    ![z, x, y].every(Number.isInteger) ||
    z < 0 ||
    z > 14 ||
    x < 0 ||
    y < 0 ||
    x >= 2 ** z ||
    y >= 2 ** z
  )
    return new Response("Invalid terrain tile", { status: 400 });
  try {
    const response = await upstream(
      `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
    );
    return new Response(await response.arrayBuffer(), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=604800",
      },
    });
  } catch {
    return new Response("Terrain source unavailable", { status: 503 });
  }
}
