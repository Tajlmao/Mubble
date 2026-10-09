"use client";
import {
  ArrowUp,
  ChevronRight,
  Cloud,
  CloudRain,
  Droplets,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Sun,
  Wind,
  X,
} from "lucide-react";
import type { Forecast, Place, Units } from "@/lib/types";
import { speed, temperature, weatherLabel } from "@/lib/weather";
import { useState } from "react";
export default function ForecastPanel({
  place,
  data,
  error,
  loading,
  units,
  onClose,
  onRetry,
}: {
  place: Place;
  data: Forecast | null;
  error: string | null;
  loading: boolean;
  units: Units;
  onClose: () => void;
  onRetry: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const current = data?.current;
  const start = data
    ? Math.max(
        0,
        data.hourly.time.findIndex((t) => t >= data.current.time),
      )
    : 0;
  return (
    <section
      className="glass forecast-panel"
      aria-label={`Weather for ${place.name}`}
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Location forecast</span>
          <h2>
            <MapPin size={14} />
            {place.name}
          </h2>
          {place.country && (
            <p>{[place.admin1, place.country].filter(Boolean).join(", ")}</p>
          )}
        </div>
        <button
          className="icon-button subtle"
          aria-label="Close location forecast"
          onClick={onClose}
        >
          <X size={17} />
        </button>
      </div>
      {loading && !data ? (
        <div className="panel-empty">
          <LoaderCircle size={20} className="spin" />
          <p>Reading the weather…</p>
        </div>
      ) : error ? (
        <div className="panel-empty">
          <Cloud size={24} />
          <h3>Forecast unavailable</h3>
          <p>{error}</p>
          <button className="text-button" onClick={onRetry}>
            <RefreshCw size={13} />
            Try again
          </button>
        </div>
      ) : data && current ? (
        <>
          <div className="current-weather">
            <div>
              <div className="temperature">
                {temperature(current.temperature_2m, units)}
                <span>°{units === "metric" ? "C" : "F"}</span>
              </div>
              <p>{weatherLabel(current.weather_code)}</p>
              <small>
                Feels like {temperature(current.apparent_temperature, units)}°
              </small>
            </div>
            {current.weather_code === 0 ? (
              <Sun size={45} strokeWidth={1} />
            ) : (
              <Cloud size={45} strokeWidth={1} />
            )}
          </div>
          <div className="weather-metrics">
            <div>
              <Wind size={15} />
              <strong>
                {speed(current.wind_speed_10m, units)}{" "}
                <small>{units === "metric" ? "km/h" : "mph"}</small>
              </strong>
              <span>Wind</span>
            </div>
            <div>
              <Droplets size={15} />
              <strong>
                {current.relative_humidity_2m}
                <small>%</small>
              </strong>
              <span>Humidity</span>
            </div>
            <div>
              <CloudRain size={15} />
              <strong>
                {units === "metric"
                  ? current.precipitation.toFixed(1)
                  : (current.precipitation / 25.4).toFixed(2)}{" "}
                <small>{units === "metric" ? "mm" : "in"}</small>
              </strong>
              <span>Precipitation</span>
            </div>
          </div>
          <div className="hourly">
            <div className="section-label">
              Next hours <span>Local time</span>
            </div>
            <div className="hourly-row">
              {data.hourly.time.slice(start, start + 6).map((t, i) => (
                <div key={t}>
                  <span>{i === 0 ? "Now" : t.slice(11, 16)}</span>
                  {data.hourly.precipitation_probability[start + i] > 40 ? (
                    <CloudRain size={17} />
                  ) : (
                    <Cloud size={17} />
                  )}
                  <strong>
                    {temperature(data.hourly.temperature_2m[start + i], units)}°
                  </strong>
                  <small>
                    {data.hourly.precipitation_probability[start + i]}%
                  </small>
                </div>
              ))}
            </div>
          </div>
          {expanded && (
            <div className="daily">
              {data.daily.time.map((day, i) => (
                <div key={day}>
                  <span>
                    {i === 0
                      ? "Today"
                      : new Date(day + "T12:00:00Z").toLocaleDateString(
                          "en-GB",
                          { weekday: "short", timeZone: "UTC" },
                        )}
                  </span>
                  <span title={weatherLabel(data.daily.weather_code[i])}>
                    {data.daily.weather_code[i] === 0 ? (
                      <Sun size={15} />
                    ) : (
                      <Cloud size={15} />
                    )}
                  </span>
                  <small>{data.daily.precipitation_probability_max[i]}%</small>
                  <strong>
                    {temperature(data.daily.temperature_2m_max[i], units)}°
                  </strong>
                  <span>
                    {temperature(data.daily.temperature_2m_min[i], units)}°
                  </span>
                </div>
              ))}
            </div>
          )}
          <button
            className="forecast-expand"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            7-day forecast{" "}
            {expanded ? <ArrowUp size={14} /> : <ChevronRight size={14} />}
          </button>
          <div className="source-note">
            Open-Meteo · model-derived conditions
            <br />
            {current.time.replace("T", " ")} · {data.timezone}
          </div>
        </>
      ) : null}
    </section>
  );
}
