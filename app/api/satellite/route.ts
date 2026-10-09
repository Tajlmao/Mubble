import { satelliteCatalog, unavailable } from "@/lib/providers";
export async function GET() {
  try {
    return Response.json(await satelliteCatalog());
  } catch {
    return unavailable("NASA satellite imagery");
  }
}
