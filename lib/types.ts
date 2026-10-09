export type LayerId =
  | "satellite"
  | "radar"
  | "precipitation"
  | "wind"
  | "temperature"
  | "humidity"
  | "pressure";
export type SatelliteProduct =
  | "automatic"
  | "visible"
  | "infrared"
  | "water-vapor";
export type Mode = "earth" | "weather";
export type Units = "metric" | "imperial";
export interface Place {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}
export interface Frame {
  timestamp: string;
  label?: string;
  path?: string;
}
export interface SatelliteDataset {
  id: string;
  title: string;
  frames: Frame[];
  maxLevel: number;
  matrix: string;
  legend?: string;
}
export interface SatelliteCatalog {
  visible: SatelliteDataset;
  infrared?: SatelliteDataset;
  attribution: string;
  fetchedAt: string;
}
export interface RadarCatalog {
  frames: Frame[];
  attribution: string;
  coverage: string;
  fetchedAt: string;
}
export interface Forecast {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    surface_pressure: number;
    is_day: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    wind_speed_10m: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
}
export interface Grid {
  cycle: string;
  valid: string;
  nx: number;
  ny: number;
  lon0: number;
  lat0: number;
  dx: number;
  dy: number;
  fields: Partial<
    Record<
      "temperature" | "humidity" | "pressure" | "u" | "v" | "precipitation",
      number[]
    >
  >;
  accumulation?: { start: number; end: number };
  attribution: string;
}
export interface Storm {
  id: string;
  name: string;
  classification: string;
  latitude: number;
  longitude: number;
  windKts?: number;
  pressureMb?: number;
  movement?: string;
  advisoryTime: string;
  advisoryUrl?: string;
  agency: string;
  history: { latitude: number; longitude: number; time?: string }[];
  forecast: { latitude: number; longitude: number; time?: string }[];
}
export interface StormCatalog {
  storms: Storm[];
  fetchedAt: string;
  coverage: string;
}
export interface ViewState {
  longitude: number;
  latitude: number;
  height: number;
  heading: number;
  pitch: number;
}
