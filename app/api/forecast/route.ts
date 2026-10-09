import { cached, coordinate, upstream, unavailable } from "@/lib/providers";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  let latitude: number, longitude: number;
  try {
    latitude = coordinate(params.get("lat"), 90);
    longitude = coordinate(params.get("lon"), 180);
  } catch {
    return Response.json({ error: "Invalid coordinates" }, { status: 400 });
  }
  try {
    const data = await cached(
      `point:${latitude.toFixed(3)}:${longitude.toFixed(3)}`,
      10 * 60000,
      async () => {
        const query = new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
          timezone: "auto",
          forecast_days: "7",
          current:
            "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,is_day",
          hourly:
            "temperature_2m,precipitation_probability,precipitation,wind_speed_10m",
          daily:
            "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        });
        return (
          await upstream("https://api.open-meteo.com/v1/forecast?" + query)
        ).json();
      },
    );
    return Response.json(data, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return unavailable("Open-Meteo forecast");
  }
}
