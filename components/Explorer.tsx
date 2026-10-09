"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  Compass,
  Globe2,
  Info,
  Layers3,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Minus,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Settings2,
  Share2,
  SlidersHorizontal,
  Sun,
  Thermometer,
  Tornado,
  Wind,
  X,
  Droplets,
  Gauge,
  LoaderCircle,
  ArrowRight,
  ExternalLink,
  Keyboard,
} from "lucide-react";
import Earth, { type EarthHandle } from "./Earth";
import Brand from "./Brand";
import ForecastPanel from "./ForecastPanel";
import type {
  Frame,
  Forecast,
  Grid,
  LayerId,
  Mode,
  Place,
  RadarCatalog,
  SatelliteCatalog,
  SatelliteProduct,
  Storm,
  StormCatalog,
  Units,
  ViewState,
} from "@/lib/types";
import {
  forecastLayers,
  formatTime,
  gfsCycle,
  palettes,
  parseView,
} from "@/lib/weather";
const layerList: {
  id: LayerId;
  label: string;
  icon: typeof Wind;
  description: string;
}[] = [
  {
    id: "satellite",
    label: "Satellite",
    icon: Globe2,
    description: "Daily satellite observations",
  },
  {
    id: "radar",
    label: "Radar",
    icon: Radio,
    description: "Regional precipitation radar",
  },
  {
    id: "precipitation",
    label: "Precipitation",
    icon: CloudRain,
    description: "GFS accumulated precipitation",
  },
  {
    id: "wind",
    label: "Wind",
    icon: Wind,
    description: "GFS 10-metre wind vectors",
  },
  {
    id: "temperature",
    label: "Temperature",
    icon: Thermometer,
    description: "GFS 2-metre air temperature",
  },
  {
    id: "humidity",
    label: "Humidity",
    icon: Droplets,
    description: "GFS 2-metre relative humidity",
  },
  {
    id: "pressure",
    label: "Pressure",
    icon: Gauge,
    description: "GFS mean sea-level pressure",
  },
];
const remoteCache = new Map<string, unknown>();
function useRemote<T>(url: string | null, retry: number = 0) {
  const [state, setState] = useState<{
    data: T | null;
    error: string | null;
    loading: boolean;
  }>({ data: null, error: null, loading: !!url });
  useEffect(() => {
    if (!url) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    let active = true;
    const controller = new AbortController();
    const hit = remoteCache.get(url);
    if (hit && retry === 0) {
      setState({ data: hit as T, error: null, loading: false });
      return;
    }
    setState({ data: null, error: null, loading: true });
    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.message || "The data source is currently unavailable.",
          );
        if (active) {
          if (remoteCache.size > 28)
            remoteCache.delete(remoteCache.keys().next().value!);
          remoteCache.set(url, data);
          setState({ data, error: null, loading: false });
        }
      })
      .catch((error) => {
        if (active && error.name !== "AbortError")
          setState({ data: null, error: error.message, loading: false });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [url, retry]);
  return state;
}
const destinations: Place[] = [
  { name: "Mumbai", latitude: 19.076, longitude: 72.8777, country: "India" },
  {
    name: "London",
    latitude: 51.5072,
    longitude: -0.1276,
    country: "United Kingdom",
  },
  { name: "Tokyo", latitude: 35.6762, longitude: 139.6503, country: "Japan" },
  {
    name: "New York",
    latitude: 40.7128,
    longitude: -74.006,
    country: "United States",
  },
];
export default function Explorer() {
  const earth = useRef<EarthHandle>(null);
  const [mode, setMode] = useState<Mode>("earth"),
    [layer, setLayer] = useState<LayerId>("satellite"),
    [product, setProduct] = useState<SatelliteProduct>("automatic");
  const [ready, setReady] = useState(false),
    [globeError, setGlobeError] = useState<string | null>(null),
    [tileError, setTileError] = useState<string | null>(null);
  const [layersOpen, setLayersOpen] = useState(true),
    [panel, setPanel] = useState<"settings" | "about" | "storms" | null>(null);
  const [searchOpen, setSearchOpen] = useState(false),
    [query, setQuery] = useState(""),
    [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<Place | null>(null),
    [storm, setStorm] = useState<Storm | null>(null),
    [stormVisible, setStormVisible] = useState(true);
  const [units, setUnits] = useState<Units>("metric"),
    [terrain, setTerrain] = useState(false),
    [nightLights, setNightLights] = useState(true),
    [borders, setBorders] = useState(false),
    [quality, setQuality] = useState<"balanced" | "low">("balanced");
  const [retry, setRetry] = useState(0),
    [forecastRetry, setForecastRetry] = useState(0),
    [playing, setPlaying] = useState(false),
    [playbackSpeed, setPlaybackSpeed] = useState(1),
    [timelineOpen, setTimelineOpen] = useState(false);
  const [indexes, setIndexes] = useState<Partial<Record<LayerId, number>>>({}),
    [cycle, setCycle] = useState(gfsCycle());
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    storm?: Storm;
    value?: number;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [view, setView] = useState<ViewState>({
    longitude: 66,
    latitude: 17,
    height: 17500000,
    heading: 0,
    pitch: -Math.PI / 2,
  });
  const [toast, setToast] = useState(""),
    [reducedMotion, setReducedMotion] = useState(false),
    [initialized, setInitialized] = useState(false),
    [initialView, setInitialView] = useState<Partial<ViewState>>({});
  const [restoredTime, setRestoredTime] = useState<string | null>(null);
  const [intro, setIntro] = useState(true),
    [savedPlaces, setSavedPlaces] = useState<Place[]>([]);
  const searchInput = useRef<HTMLInputElement>(null),
    dialogRef = useRef<HTMLElement>(null),
    lastFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setInitialView(parseView(params));
    const requestedTime = params.get("time");
    if (requestedTime && Number.isFinite(new Date(requestedTime).getTime()))
      setRestoredTime(requestedTime);
    const requestedProduct = params.get("product");
    if (
      ["automatic", "visible", "infrared", "water-vapor"].includes(
        requestedProduct || "",
      )
    )
      setProduct(requestedProduct as SatelliteProduct);
    const sharedLayer = params.get("layer");
    if (layerList.some((l) => l.id === sharedLayer))
      setLayer(sharedLayer as LayerId);
    if (params.get("mode") === "weather") setMode("weather");
    try {
      const settings = JSON.parse(
        localStorage.getItem("mubble-settings") || "{}",
      );
      if (settings.units === "imperial") setUnits("imperial");
      if (settings.nightLights === false) setNightLights(false);
      if (settings.borders === true) setBorders(true);
      if (settings.quality === "low") setQuality("low");
      setSavedPlaces(JSON.parse(localStorage.getItem("mubble-places") || "[]"));
    } catch {}
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const update = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", update);
    setInitialized(true);
    const timeout = setTimeout(() => setIntro(false), 5500);
    if (window.innerWidth < 700) setLayersOpen(false);
    return () => {
      mq.removeEventListener("change", update);
      clearTimeout(timeout);
    };
  }, []);
  useEffect(() => {
    if (initialized)
      localStorage.setItem(
        "mubble-settings",
        JSON.stringify({ units, nightLights, borders, quality }),
      );
  }, [units, nightLights, borders, quality, initialized]);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query]);
  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3800);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    if (panel) {
      lastFocus.current = document.activeElement as HTMLElement;
      dialogRef.current?.focus();
    } else lastFocus.current?.focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPanel(null);
        setSearchOpen(false);
        setStorm(null);
        setTimelineOpen(false);
      }
      if (
        event.key === "/" &&
        !(event.target as HTMLElement).closest("input")
      ) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [panel]);
  const satellite = useRemote<SatelliteCatalog>("/api/satellite", retry),
    radar = useRemote<RadarCatalog>(
      layer === "radar" ? "/api/radar" : null,
      retry,
    ),
    storms = useRemote<StormCatalog>("/api/storms", retry);
  const forecastFrames = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(
          cycle.getTime() + (i + 1) * 3 * 3600000,
        ).toISOString(),
      })),
    [cycle],
  );
  const frames: Frame[] = useMemo(
    () =>
      layer === "satellite"
        ? (product === "infrared"
            ? satellite.data?.infrared?.frames
            : satellite.data?.visible.frames) || []
        : layer === "radar"
          ? radar.data?.frames || []
          : forecastFrames,
    [layer, product, satellite.data, radar.data, forecastFrames],
  );
  useEffect(() => {
    if (!restoredTime || !frames.length) return;
    const found = frames.findIndex(
      (f) =>
        new Date(f.timestamp).getTime() === new Date(restoredTime).getTime(),
    );
    if (found >= 0) setIndexes((previous) => ({ ...previous, [layer]: found }));
    else
      setToast("The shared timestamp is no longer available from this source.");
    setRestoredTime(null);
  }, [restoredTime, frames, layer]);
  const isForecast = forecastLayers.includes(layer),
    index = Math.min(
      indexes[layer] ??
        (isForecast
          ? 0
          : Math.max(0, frames.length - (layer === "satellite" ? 2 : 1))),
      Math.max(0, frames.length - 1),
    ),
    frame = frames[index];
  const grid = useRemote<Grid>(
    isForecast ? "/api/grid?hour=" + (index + 1) * 3 : null,
    retry,
  );
  const pointForecast = useRemote<Forecast>(
    selected
      ? `/api/forecast?lat=${selected.latitude}&lon=${selected.longitude}`
      : null,
    forecastRetry,
  );
  const results = useRemote<{ results?: Place[] }>(
    searchOpen && debounced.length >= 2
      ? "/api/search?q=" + encodeURIComponent(debounced)
      : null,
  );
  useEffect(() => {
    if (grid.data && new Date(grid.data.cycle).getTime() !== cycle.getTime())
      setCycle(new Date(grid.data.cycle));
  }, [grid.data, cycle]);
  const active = isForecast ? grid : layer === "radar" ? radar : satellite;
  const productUnavailable =
    layer === "satellite" &&
    (product === "water-vapor" ||
      (product === "infrared" && !satellite.data?.infrared));
  const available = !!active.data && !productUnavailable;
  const [now, setNow] = useState(new Date().toISOString());
  const stale =
    !!frame &&
    !isForecast &&
    new Date(now).getTime() - new Date(frame.timestamp).getTime() >
      (layer === "satellite" ? 72 * 3600000 : 90 * 60000);
  const selectedTime = available
    ? isForecast
      ? grid.data?.valid
      : frame?.timestamp
    : undefined;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date().toISOString()), 60000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    setTileError(null);
    setPlaying(false);
    setHover(null);
  }, [layer, product]);
  useEffect(() => {
    if (!playing || !available || frames.length < 2) return;
    const id = setInterval(
      () => {
        if (document.hidden) return;
        setIndexes((prev) => ({
          ...prev,
          [layer]: ((prev[layer] ?? index) + 1) % frames.length,
        }));
      },
      (isForecast ? 2000 : 1400) / playbackSpeed,
    );
    return () => clearInterval(id);
  }, [
    playing,
    available,
    frames.length,
    layer,
    index,
    playbackSpeed,
    isForecast,
  ]);
  const choose = useCallback((place: Place) => {
    setSelected(place);
    setStorm(null);
    setSearchOpen(false);
    setQuery("");
    earth.current?.goTo(place);
  }, []);
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback((message: string) => {
    if (message.startsWith("Terrain")) {
      setToast(message);
      return;
    }
    if (
      message.includes("engine") ||
      message.includes("WebGL") ||
      message.includes("render")
    )
      setGlobeError(message);
    else setTileError(message);
  }, []);
  const onClick = useCallback((place: Place) => {
    setSelected(place);
    setStorm(null);
  }, []);
  const onStorm = useCallback((storm: Storm) => {
    setStorm(storm);
    setSelected(null);
    setPanel(null);
  }, []);
  const share = async () => {
    const current = earth.current?.getView() || view;
    const url = new URL(window.location.href);
    url.search = "";
    for (const [key, value] of Object.entries(current))
      url.searchParams.set(
        key,
        Number(value).toFixed(key === "height" ? 0 : 4),
      );
    url.searchParams.set("layer", layer);
    url.searchParams.set("mode", mode);
    url.searchParams.set("product", product);
    if (selectedTime) url.searchParams.set("time", selectedTime);
    try {
      await navigator.clipboard.writeText(url.toString());
      setToast("Mubble map link copied");
    } catch {
      window.prompt("Copy your Mubble map link", url.toString());
    }
  };
  const locate = () => {
    if (!navigator.geolocation) {
      setToast("Location is not supported in this browser.");
      return;
    }
    setToast("Waiting for location permission…");
    navigator.geolocation.getCurrentPosition(
      (position) =>
        choose({
          name: "Your location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      (error) =>
        setToast(
          error.code === 1
            ? "Location permission was declined. You can search for a place."
            : "Your location could not be found.",
        ),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  };
  const savePlace = () => {
    if (!selected) return;
    const next = savedPlaces.some((p) => p.name === selected.name)
      ? savedPlaces.filter((p) => p.name !== selected.name)
      : [selected, ...savedPlaces].slice(0, 8);
    setSavedPlaces(next);
    localStorage.setItem("mubble-places", JSON.stringify(next));
    setToast(
      next.some((p) => p.name === selected.name)
        ? "Place saved in Mubble"
        : "Place removed from saved places",
    );
  };
  const dateLabel = selectedTime
    ? new Date(selectedTime).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "Awaiting source data";
  const infoName = layerList.find((l) => l.id === layer)!;
  return (
    <main className="explorer">
      <div className="space-grid" aria-hidden="true" />
      <div className="space-stars" aria-hidden="true" />
      {initialized && (
        <Earth
          ref={earth}
          mode={mode}
          layer={layer}
          satellite={satellite.data}
          product={product}
          frame={available ? frame : undefined}
          time={
            layer === "satellite" && selectedTime
              ? selectedTime.slice(0, 10) + now.slice(10)
              : selectedTime || now
          }
          grid={grid.data}
          storms={stormVisible ? storms.data?.storms || [] : []}
          selected={selected}
          terrain={terrain}
          nightLights={nightLights}
          borders={borders}
          quality={quality}
          initialView={initialView}
          reducedMotion={reducedMotion}
          onReady={onReady}
          onError={onError}
          onClick={onClick}
          onStorm={onStorm}
          onHover={setHover}
          onView={setView}
        />
      )}
      <div className="map-vignette" aria-hidden="true" />
      {!ready && !globeError && (
        <div className="earth-loading" role="status">
          <img src="/mubble-mark.svg" alt="" width="46" height="46" />
          <span>Opening Mubble</span>
          <small>Preparing your view of Earth</small>
          <LoaderCircle size={15} className="spin" />
        </div>
      )}
      {globeError && (
        <div className="globe-error glass" role="alert">
          <Globe2 size={32} />
          <h2>Mubble needs WebGL</h2>
          <p>{globeError}</p>
          <p>
            Try a browser with hardware acceleration enabled. Location search
            and forecasts remain available.
          </p>
          <button
            className="primary-button"
            onClick={() => window.location.reload()}
          >
            Reload Earth
          </button>
        </div>
      )}
      <header className="brand-area">
        <Brand />
        <span className="brand-tagline">A closer look at our planet.</span>
      </header>
      <div className="top-context">
        <span className="context-coordinate">
          {Math.abs(view.latitude).toFixed(1)}° {view.latitude < 0 ? "S" : "N"}{" "}
          <span>/</span> {Math.abs(view.longitude).toFixed(1)}°{" "}
          {view.longitude < 0 ? "W" : "E"}
        </span>
        <span className="context-divider" />
        <span>EARTH EXPLORER</span>
      </div>
      <div className="left-controls">
        <button
          className="search-trigger glass"
          disabled={!initialized}
          aria-expanded={searchOpen}
          onClick={() => setSearchOpen(!searchOpen)}
        >
          <Search size={16} />
          <span>Search the planet</span>
          <kbd>/</kbd>
        </button>
        {searchOpen && (
          <section className="search-panel glass" aria-label="Search places">
            <div className="search-input-row">
              <Search size={16} />
              <input
                ref={searchInput}
                value={query}
                placeholder="City, region or country"
                aria-label="Search city, region or country"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results.data?.results?.[0])
                    choose(results.data.results[0]);
                }}
              />
              <button
                className="icon-button subtle"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
              >
                <X size={15} />
              </button>
            </div>
            {query.length >= 2 ? (
              <div className="search-results">
                {results.loading ? (
                  <div className="search-message">
                    <LoaderCircle size={14} className="spin" />
                    Searching places…
                  </div>
                ) : results.error ? (
                  <div className="search-message">
                    Place search is unavailable. Try a suggested place or click
                    the globe.
                  </div>
                ) : results.data?.results?.length ? (
                  results.data.results.map((p, i) => (
                    <button key={i} onClick={() => choose(p)}>
                      <MapPin size={15} />
                      <div>
                        <strong>{p.name}</strong>
                        <span>
                          {[p.admin1, p.country].filter(Boolean).join(", ")}
                        </span>
                      </div>
                      <ArrowUpRight size={14} />
                    </button>
                  ))
                ) : (
                  <div className="search-message">No places found.</div>
                )}
              </div>
            ) : (
              <>
                <div className="section-label">
                  {savedPlaces.length ? "Saved places" : "Explore somewhere"}
                </div>
                {(savedPlaces.length ? savedPlaces : destinations).map((p) => (
                  <button
                    className="place-suggestion"
                    key={p.name}
                    onClick={() => choose(p)}
                  >
                    <MapPin size={14} />
                    <span>
                      {p.name}
                      <small>{p.country}</small>
                    </span>
                    <ArrowUpRight size={14} />
                  </button>
                ))}
              </>
            )}
          </section>
        )}
        <section
          className={`layer-panel glass ${layersOpen ? "" : "collapsed"}`}
          aria-label="Weather layers"
        >
          <button
            className="layer-heading"
            onClick={() => setLayersOpen(!layersOpen)}
            aria-expanded={layersOpen}
            disabled={!initialized}
          >
            <Layers3 size={15} />
            <span>Map layers</span>
            <ChevronDown size={14} className={layersOpen ? "" : "rotated"} />
          </button>
          {layersOpen && (
            <>
              <div className="layer-section">Observations</div>
              {layerList.slice(0, 2).map((l) => (
                <button
                  key={l.id}
                  className={`layer-option ${layer === l.id ? "selected" : ""}`}
                  onClick={() => setLayer(l.id)}
                  aria-pressed={layer === l.id}
                  title={l.description}
                >
                  <l.icon size={17} />
                  <span>{l.label}</span>
                  {layer === l.id ? (
                    <span className="selected-dot" />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                </button>
              ))}
              <div className="layer-section forecast-section">
                Forecasts <span>GFS</span>
              </div>
              {layerList.slice(2).map((l) => (
                <button
                  key={l.id}
                  className={`layer-option ${layer === l.id ? "selected" : ""}`}
                  onClick={() => setLayer(l.id)}
                  aria-pressed={layer === l.id}
                  title={l.description}
                >
                  <l.icon size={17} />
                  <span>{l.label}</span>
                  {layer === l.id ? (
                    <span className="selected-dot" />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                </button>
              ))}
              <div className="layer-footer">
                <button
                  onClick={() => setPanel(panel === "storms" ? null : "storms")}
                  aria-label="Tropical cyclones"
                  aria-expanded={panel === "storms"}
                >
                  <Tornado size={15} />
                  <span>Tropical cyclones</span>
                  {storms.data ? (
                    <span className="storm-count">
                      {storms.data.storms.length}
                    </span>
                  ) : (
                    <span
                      className="unavailable-dot"
                      title="Advisories unavailable"
                    />
                  )}
                  <ChevronRight size={12} />
                </button>
              </div>
            </>
          )}
        </section>
        {layersOpen && layer === "satellite" && (
          <div className="product-control glass">
            <Sun size={14} />
            <label htmlFor="satellite-product" className="sr-only">
              Satellite product
            </label>
            <select
              id="satellite-product"
              value={product}
              onChange={(e) => setProduct(e.target.value as SatelliteProduct)}
            >
              <option value="automatic">Automatic · day / night</option>
              <option value="visible">Visible · natural color</option>
              <option value="infrared">Infrared · thermal</option>
              <option value="water-vapor">Water vapor</option>
            </select>
            <ChevronDown size={12} />
          </div>
        )}
        <button className="source-button" onClick={() => setPanel("about")}>
          <Info size={12} />
          <span>About this view</span>
          <ArrowUpRight size={12} />
        </button>
      </div>
      <div className="mode-switch glass" role="group" aria-label="View mode">
        <button
          className={mode === "earth" ? "active" : ""}
          onClick={() => setMode("earth")}
          aria-pressed={mode === "earth"}
        >
          <Globe2 size={14} />
          Earth
        </button>
        <button
          className={mode === "weather" ? "active" : ""}
          onClick={() => setMode("weather")}
          aria-pressed={mode === "weather"}
        >
          <MapIcon size={14} />
          Weather
        </button>
      </div>
      <aside className="right-tools" aria-label="Map controls">
        <div className="tool-group glass">
          <button
            className="icon-button"
            aria-label="Mubble settings"
            title="Mubble settings"
            onClick={() => setPanel(panel === "settings" ? null : "settings")}
          >
            <Settings2 size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Share Mubble map"
            title="Share this view"
            onClick={share}
          >
            <Share2 size={17} />
          </button>
        </div>
        <div className="tool-group glass">
          <button
            className="icon-button"
            aria-label="Use my location"
            title="Use my location"
            onClick={locate}
          >
            <LocateFixed size={18} />
          </button>
          <button
            className="icon-button compass-button"
            aria-label="Reset compass bearing"
            title="Reset bearing"
            onClick={() => earth.current?.reset()}
          >
            <Compass
              size={22}
              strokeWidth={1.3}
              style={{ transform: `rotate(${-view.heading}rad)` }}
            />
            <span>N</span>
          </button>
        </div>
        <div className="tool-group glass">
          <button
            className="icon-button"
            aria-label="Zoom in"
            title="Zoom in"
            onClick={() => earth.current?.zoom(1)}
          >
            <Plus size={19} />
          </button>
          <span className="tool-divider" />
          <button
            className="icon-button"
            aria-label="Zoom out"
            title="Zoom out"
            onClick={() => earth.current?.zoom(-1)}
          >
            <Minus size={19} />
          </button>
        </div>
        <button
          className="icon-button glass info-tool"
          aria-label="Mubble data sources and help"
          title="Data sources and help"
          onClick={() => setPanel("about")}
        >
          <Info size={17} />
        </button>
      </aside>
      {!selected && !storm && (
        <div className="view-caption">
          <div className="caption-kicker">
            <span className="tiny-line" />
            OUR WORLD, IN PERSPECTIVE
          </div>
          <h1>See the bigger picture.</h1>
          <p>
            From a passing cloud to a changing planet.
            <br />
            Follow the weather. Find your perspective.
          </p>
          <div className="gesture-hint">
            <span className="mouse-icon" />
            Drag to explore <span>·</span> Scroll to get closer
          </div>
        </div>
      )}
      <div className="observation-status glass">
        <span
          className={`status-dot ${available && !stale && !tileError ? "connected" : ""}`}
        />
        <div>
          <strong>
            {active.loading
              ? "Connecting to " +
                (isForecast
                  ? "NOAA GFS"
                  : layer === "radar"
                    ? "radar"
                    : "NASA GIBS")
              : available && !tileError
                ? stale
                  ? "Older observations"
                  : isForecast
                    ? "Model forecast"
                    : layer === "radar"
                      ? "Radar observations"
                      : "Daily satellite mosaic"
                : productUnavailable
                  ? "Product unavailable"
                  : "Reference Earth"}
          </strong>
          <span>
            {active.loading
              ? "The globe is ready to explore"
              : available && !tileError
                ? isForecast
                  ? "NOAA GFS · " +
                    grid.data?.cycle.slice(11, 16) +
                    " UTC cycle"
                  : layer === "radar"
                    ? "RainViewer · regional coverage"
                    : "NASA GIBS · daily, not live"
                : "NASA Blue Marble · historical composite"}
          </span>
        </div>
        {!active.loading && (!available || tileError) && (
          <button
            className="icon-button subtle"
            aria-label="Retry weather provider"
            onClick={() => {
              setTileError(null);
              setRetry((r) => r + 1);
            }}
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>
      {(productUnavailable || tileError) && (
        <div className="availability-note" role="status">
          {tileError ||
            "This satellite product is not available from the connected source."}
        </div>
      )}
      {available &&
        layer === "satellite" &&
        product === "automatic" &&
        !satellite.data?.infrared && (
          <div className="availability-note">
            Infrared unavailable · night hemisphere shows reference imagery
          </div>
        )}
      <section className="timeline glass" aria-label="Weather timeline">
        <div className="timeline-top">
          <div className="timeline-date">
            <span className="time-state">
              {isForecast
                ? "Forecast"
                : layer === "radar"
                  ? "Observation"
                  : "Daily observation"}
            </span>
            <strong>{dateLabel}</strong>
            {selectedTime && (
              <span>
                {layer === "satellite"
                  ? "UTC day"
                  : formatTime(selectedTime) + " UTC"}
              </span>
            )}
          </div>
          <button
            className="timeline-latest"
            disabled={!available}
            onClick={() => {
              setPlaying(false);
              setIndexes((prev) => ({
                ...prev,
                [layer]: isForecast ? 0 : frames.length - 1,
              }));
            }}
          >
            {isForecast ? "First" : "Latest"}
            <span className={available ? "selected-dot" : ""} />
          </button>
          <button
            className="icon-button subtle"
            aria-label="Timeline playback settings"
            onClick={() => setTimelineOpen(!timelineOpen)}
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
        <div className="timeline-main">
          <button
            className="play-button"
            aria-label={playing ? "Pause timeline" : "Play timeline"}
            disabled={!available || frames.length < 2}
            onClick={() => setPlaying(!playing)}
          >
            {playing ? (
              <Pause size={14} fill="currentColor" />
            ) : (
              <Play size={14} fill="currentColor" />
            )}
          </button>
          <div className="timeline-track">
            <label htmlFor="timeline-slider" className="sr-only">
              Selected weather frame
            </label>
            <input
              id="timeline-slider"
              type="range"
              min="0"
              max={Math.max(1, frames.length - 1)}
              value={index}
              disabled={!available}
              onChange={(e) => {
                setPlaying(false);
                setIndexes((prev) => ({
                  ...prev,
                  [layer]: Number(e.target.value),
                }));
              }}
              style={
                {
                  "--progress": `${frames.length > 1 ? (index / (frames.length - 1)) * 100 : 0}%`,
                } as React.CSSProperties
              }
            />
            <div className="timeline-ticks">
              {frames.length ? (
                frames
                  .filter(
                    (_, i) =>
                      i % Math.max(1, Math.floor(frames.length / 5)) === 0,
                  )
                  .slice(0, 6)
                  .map((f) => (
                    <span key={f.timestamp}>
                      {layer === "satellite"
                        ? new Date(f.timestamp).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            timeZone: "UTC",
                          })
                        : formatTime(f.timestamp)}
                    </span>
                  ))
              ) : (
                <>
                  <span>History</span>
                  <span>No source timestamps available</span>
                  <span>Latest</span>
                </>
              )}
            </div>
          </div>
          <div className="frame-controls">
            <button
              className="icon-button subtle"
              aria-label="Previous frame"
              disabled={!available}
              onClick={() => {
                setPlaying(false);
                setIndexes((prev) => ({
                  ...prev,
                  [layer]: Math.max(0, index - 1),
                }));
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              className="icon-button subtle"
              aria-label="Next frame"
              disabled={!available}
              onClick={() => {
                setPlaying(false);
                setIndexes((prev) => ({
                  ...prev,
                  [layer]: Math.min(frames.length - 1, index + 1),
                }));
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        {timelineOpen && (
          <div className="timeline-options">
            <label>
              Playback speed
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              >
                <option value="0.5">0.5×</option>
                <option value="1">1×</option>
                <option value="2">2×</option>
              </select>
            </label>
            <span>Loops available frames · pauses when tab is hidden</span>
          </div>
        )}
      </section>
      {available &&
        layer === "satellite" &&
        product === "infrared" &&
        satellite.data?.infrared?.legend && (
          <div className="infrared-legend glass">
            <strong>Night infrared</strong>
            <span>Brightness temperature · NASA palette</span>
            <img
              src={`/api/legend?layer=${encodeURIComponent(satellite.data.infrared.id)}`}
              alt="NASA VIIRS brightness-temperature color scale"
              width="230"
              height="52"
            />
          </div>
        )}
      {available && isForecast && palettes[layer] && (
        <div className="weather-legend glass">
          <strong>
            {infoName.label}
            <span>{palettes[layer].unit}</span>
          </strong>
          <div
            className="legend-gradient"
            style={{
              background: `linear-gradient(to right, ${palettes[layer].stops.map((s) => s[1]).join(",")})`,
            }}
          />
          <div className="legend-values">
            {palettes[layer].stops.map(([v]) => (
              <span key={v}>{v}</span>
            ))}
          </div>
          <small>
            {layer === "precipitation"
              ? `${grid.data?.accumulation?.start ?? 0}–${grid.data?.accumulation?.end ?? 0} h accumulation`
              : layer === "wind"
                ? "10 m · accelerated particle display"
                : "1° model grid · display smoothing"}
          </small>
        </div>
      )}
      <div className="bottom-meta">
        <span className="planet-symbol">⊕</span>
        <span>
          {mode === "earth" ? "Orbital perspective" : "Regional perspective"}
        </span>
        <span className="meta-dot" />{" "}
        <span>
          {Math.round(view.height / 1000).toLocaleString()} km altitude
        </span>
      </div>
      {intro && ready && !reducedMotion && (
        <button
          className="skip-intro"
          onClick={() => {
            earth.current?.skip();
            setIntro(false);
          }}
        >
          Skip opening <ArrowRight size={12} />
        </button>
      )}
      {selected && (
        <>
          <ForecastPanel
            place={selected}
            data={pointForecast.data}
            error={pointForecast.error}
            loading={pointForecast.loading}
            units={units}
            onClose={() => setSelected(null)}
            onRetry={() => setForecastRetry((r) => r + 1)}
          />
          <button className="save-place glass" onClick={savePlace}>
            <MapPin size={13} />
            {savedPlaces.some((p) => p.name === selected.name)
              ? "Saved in Mubble"
              : "Save this place"}
          </button>
        </>
      )}
      {hover && (hover.storm || hover.value !== undefined) && (
        <div
          className="map-tooltip glass"
          style={{
            left: Math.min(
              hover.x + 17,
              typeof window === "undefined" ? hover.x : window.innerWidth - 250,
            ),
            top: Math.max(80, hover.y - 75),
          }}
        >
          {hover.storm ? (
            <>
              <strong>
                {hover.storm.classification} — {hover.storm.name}
              </strong>
              {hover.storm.windKts !== undefined && (
                <span>Maximum sustained wind: {hover.storm.windKts} kt</span>
              )}
              <small>
                Advisory: {hover.storm.advisoryTime || "Timestamp unavailable"}
              </small>
            </>
          ) : (
            <>
              <strong>
                {infoName.label} · {hover.value?.toFixed(1)}{" "}
                {palettes[layer]?.unit}
              </strong>
              <small>
                GFS forecast ·{" "}
                {selectedTime ? formatTime(selectedTime) + " UTC" : ""}
              </small>
            </>
          )}
        </div>
      )}
      {panel && (
        <section
          ref={dialogRef}
          className="detail-panel glass"
          role="dialog"
          tabIndex={-1}
          aria-labelledby="detail-title"
        >
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Mubble</span>
              <h2 id="detail-title">
                {panel === "settings"
                  ? "Make it your world"
                  : panel === "about"
                    ? "A closer look"
                    : "Tropical cyclones"}
              </h2>
            </div>
            <button
              className="icon-button subtle"
              onClick={() => setPanel(null)}
              aria-label="Close panel"
            >
              <X size={17} />
            </button>
          </div>
          {panel === "settings" ? (
            <div className="settings-content">
              <p className="panel-description">
                A few considered choices for your view of Earth.
              </p>
              <div className="setting-section">Measurements</div>
              <div className="setting-row">
                <span>
                  Location forecast units
                  <small>Global field legends keep native units</small>
                </span>
                <div className="segmented">
                  <button
                    className={units === "metric" ? "active" : ""}
                    onClick={() => setUnits("metric")}
                  >
                    °C / km
                  </button>
                  <button
                    className={units === "imperial" ? "active" : ""}
                    onClick={() => setUnits("imperial")}
                  >
                    °F / mi
                  </button>
                </div>
              </div>
              <div className="setting-section">Your Earth</div>
              {[
                [
                  terrain,
                  setTerrain,
                  "3D terrain",
                  "Mapzen elevation · requires source access",
                ],
                [
                  nightLights,
                  setNightLights,
                  "Nighttime lights",
                  "Historical NASA composite",
                ],
                [
                  borders,
                  setBorders,
                  "Country boundaries",
                  "Natural Earth geographic reference",
                ],
                [
                  stormVisible,
                  setStormVisible,
                  "Cyclone markers",
                  "Verified NHC advisories only",
                ],
              ].map(([value, setter, title, subtitle]) => (
                <div className="setting-row" key={String(title)}>
                  <span>
                    {String(title)}
                    <small>{String(subtitle)}</small>
                  </span>
                  <button
                    className={`toggle ${value ? "on" : ""}`}
                    role="switch"
                    aria-checked={Boolean(value)}
                    aria-label={String(title)}
                    onClick={() => {
                      (setter as (value: boolean) => void)(!value);
                    }}
                  >
                    <span />
                  </button>
                </div>
              ))}
              <div className="setting-section">Performance</div>
              <div className="setting-row">
                <span>
                  Rendering quality<small>Lower quality saves GPU power</small>
                </span>
                <select
                  value={quality}
                  onChange={(e) =>
                    setQuality(e.target.value as "balanced" | "low")
                  }
                  aria-label="Rendering quality"
                >
                  <option value="balanced">Balanced</option>
                  <option value="low">Low power</option>
                </select>
              </div>
              <div className="settings-note">
                <Check size={13} />
                Preferences are saved in this browser.
              </div>
            </div>
          ) : panel === "about" ? (
            <div className="about-content">
              <Brand small />
              <p>
                Mubble is a window to our changing planet. Explore freely, and
                always know what you are looking at.
              </p>
              <div className="source-item">
                <strong>Earth reference</strong>
                <p>
                  NASA Blue Marble and the 2012 VIIRS Earth at Night composite.
                  These textures are not live weather. For daily mosaics,
                  sunlight uses the selected day and current UTC time. Country
                  boundaries: Natural Earth. Optional terrain: Mapzen open
                  elevation data.
                </p>
              </div>
              <a
                href="/licenses/THIRD_PARTY_NOTICES.md"
                target="_blank"
                rel="noreferrer"
              >
                Asset sources & licenses <ExternalLink size={11} />
              </a>
              <a
                href="/earth/terrain-attribution.md"
                target="_blank"
                rel="noreferrer"
              >
                Terrain sources & attribution <ExternalLink size={11} />
              </a>
              <div className="source-item">
                <strong>Satellite observations</strong>
                <p>
                  NASA EOSDIS GIBS · VIIRS / MODIS daily mosaics. Dates
                  represent an acquisition day, not a simultaneous global frame.
                  Polar-orbiting imagery; geostationary feeds are not connected.
                </p>
                <a
                  href="https://www.earthdata.nasa.gov/data/tools/gibs"
                  target="_blank"
                  rel="noreferrer"
                >
                  NASA GIBS <ExternalLink size={11} />
                </a>
              </div>
              <div className="source-item">
                <strong>Forecasts & radar</strong>
                <p>
                  NOAA GFS, a 1° global numerical forecast. Point forecasts by
                  Open-Meteo (CC BY 4.0; noncommercial free tier). Radar by
                  RainViewer where coverage exists. GFS fields use native units;
                  wind motion is accelerated for visibility.
                </p>
                <a
                  href="https://open-meteo.com/en/terms"
                  target="_blank"
                  rel="noreferrer"
                >
                  Provider terms <ExternalLink size={11} />
                </a>
              </div>
              <div className="source-item">
                <strong>Cyclones</strong>
                <p>
                  NHC advisories cover the Atlantic and eastern/central Pacific.
                  Forecast paths use dashes; historical tracks use solid lines
                  when published. Other basins and uncertainty cones are not yet
                  connected.
                </p>
              </div>
              <div className="help-shortcuts">
                <Keyboard size={16} />
                <span>
                  Arrow keys to rotate · + / − to zoom
                  <br />/ to search · Esc to close a panel
                </span>
              </div>
              <small className="source-note">
                Mubble is for exploration, not emergency decisions. Consult your
                national weather service for warnings.
              </small>
            </div>
          ) : (
            <div className="storm-list">
              <p className="panel-description">
                {storms.data?.coverage ||
                  "Official NOAA National Hurricane Center advisories. Atlantic and eastern/central Pacific only."}
              </p>
              {storms.loading ? (
                <div className="panel-empty">
                  <LoaderCircle size={20} className="spin" />
                  <p>Checking official advisories…</p>
                </div>
              ) : storms.error ? (
                <div className="panel-empty">
                  <Tornado size={28} />
                  <h3>Advisories unavailable</h3>
                  <p>
                    We cannot confirm active storms while the agency feed is
                    unreachable.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setRetry((r) => r + 1)}
                  >
                    <RefreshCw size={13} />
                    Retry agency feed
                  </button>
                </div>
              ) : storms.data?.storms.length ? (
                storms.data.storms.map((s) => (
                  <button
                    className="storm-list-item"
                    key={s.id}
                    onClick={() => {
                      onStorm(s);
                      earth.current?.goTo({
                        name: s.name,
                        latitude: s.latitude,
                        longitude: s.longitude,
                      });
                    }}
                  >
                    <Tornado size={19} />
                    <div>
                      <strong>{s.name}</strong>
                      <span>{s.classification}</span>
                    </div>
                    {s.windKts !== undefined && <span>{s.windKts} kt</span>}
                    <ChevronRight size={14} />
                  </button>
                ))
              ) : (
                <div className="panel-empty">
                  <Check size={25} />
                  <h3>No active NHC cyclones</h3>
                  <p>
                    No active systems were reported by the connected agency at
                    its latest update.
                  </p>
                </div>
              )}
              {storms.data && (
                <div className="source-note">
                  Checked {formatTime(storms.data.fetchedAt)} UTC · NOAA NHC
                </div>
              )}
            </div>
          )}
        </section>
      )}
      {storm && (
        <section
          className="detail-panel glass storm-detail"
          aria-label={`${storm.name} cyclone advisory`}
        >
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Official cyclone advisory</span>
              <h2>{storm.name}</h2>
              <p>
                {storm.classification} · {storm.id.toUpperCase()}
              </p>
            </div>
            <button
              className="icon-button subtle"
              onClick={() => setStorm(null)}
              aria-label="Close storm advisory"
            >
              <X size={17} />
            </button>
          </div>
          <div className="storm-intensity">
            <Tornado size={44} strokeWidth={1} />
            <div>
              {storm.windKts !== undefined ? (
                <strong>
                  {storm.windKts}
                  <small>kt</small>
                </strong>
              ) : (
                <strong>—</strong>
              )}
              <span>Maximum sustained wind · 1 min</span>
            </div>
          </div>
          <dl className="storm-values">
            <div>
              <dt>Position</dt>
              <dd>
                {storm.latitude.toFixed(1)}°, {storm.longitude.toFixed(1)}°
              </dd>
            </div>
            {storm.pressureMb !== undefined && (
              <div>
                <dt>Central pressure</dt>
                <dd>{storm.pressureMb} hPa</dd>
              </div>
            )}
            {storm.movement && (
              <div>
                <dt>Movement</dt>
                <dd>{storm.movement}</dd>
              </div>
            )}
            <div>
              <dt>Latest advisory</dt>
              <dd>{storm.advisoryTime || "Not supplied"}</dd>
            </div>
          </dl>
          <div className="storm-actions">
            <button
              className="primary-button"
              onClick={() =>
                earth.current?.goTo({
                  name: storm.name,
                  latitude: storm.latitude,
                  longitude: storm.longitude,
                })
              }
            >
              <LocateFixed size={14} />
              Follow storm
            </button>
            <button
              className="secondary-button"
              disabled={!storm.forecast.length && !storm.history.length}
              onClick={() => earth.current?.fitTrack(storm)}
            >
              Fit track
            </button>
          </div>
          {!storm.forecast.length && (
            <p className="panel-description">
              An official forecast track is not available for this advisory.
            </p>
          )}
          <div className="source-note">
            {storm.agency}
            <br />
            {storm.advisoryUrl && (
              <a href={storm.advisoryUrl} target="_blank" rel="noreferrer">
                Read official advisory <ExternalLink size={10} />
              </a>
            )}
          </div>
        </section>
      )}
      {toast && (
        <div className="toast glass" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
