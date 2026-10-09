"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type * as Cesium from "cesium";
import type {
  Grid,
  LayerId,
  Mode,
  Place,
  SatelliteCatalog,
  SatelliteProduct,
  Frame,
  Storm,
  ViewState,
} from "@/lib/types";
import { colorAt, gridValue, layerValue, palettes } from "@/lib/weather";
type Engine = typeof Cesium;
declare global {
  interface Window {
    Cesium?: Engine;
    CESIUM_BASE_URL?: string;
  }
}
export interface EarthHandle {
  zoom: (direction: number) => void;
  reset: () => void;
  goTo: (place: Place) => void;
  getView: () => ViewState | undefined;
  fitTrack: (storm: Storm) => void;
  skip: () => void;
}
interface Props {
  mode: Mode;
  layer: LayerId;
  satellite: SatelliteCatalog | null;
  product: SatelliteProduct;
  frame: Frame | undefined;
  time: string;
  grid: Grid | null;
  storms: Storm[];
  selected: Place | null;
  terrain: boolean;
  nightLights: boolean;
  borders: boolean;
  quality: "balanced" | "low";
  onReady: () => void;
  onError: (message: string) => void;
  onClick: (place: Place) => void;
  onStorm: (storm: Storm) => void;
  onHover: (
    info: {
      x: number;
      y: number;
      storm?: Storm;
      value?: number;
      latitude: number;
      longitude: number;
    } | null,
  ) => void;
  onView: (view: ViewState) => void;
  initialView: Partial<ViewState>;
  reducedMotion: boolean;
}
let enginePromise: Promise<Engine> | undefined;
function loadEngine() {
  if (window.Cesium) return Promise.resolve(window.Cesium);
  if (enginePromise) return enginePromise;
  enginePromise = new Promise((resolve, reject) => {
    window.CESIUM_BASE_URL = "/cesium/";
    const script = document.createElement("script");
    script.src = "/cesium/Cesium.js";
    script.async = true;
    script.onload = () =>
      window.Cesium
        ? resolve(window.Cesium)
        : reject(new Error("Globe engine unavailable"));
    script.onerror = () => {
      enginePromise = undefined;
      reject(new Error("Could not load the globe engine"));
    };
    document.head.appendChild(script);
  });
  return enginePromise;
}
const Earth = forwardRef<EarthHandle, Props>(function Earth(props, ref) {
  const [ready, setReady] = useState(false);
  const container = useRef<HTMLDivElement>(null),
    particles = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null),
    viewer = useRef<Cesium.Viewer | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const overlay = useRef<Cesium.ImageryLayer[]>([]),
    night = useRef<Cesium.ImageryLayer | null>(null);
  const boundary = useRef<Cesium.DataSource | null>(null),
    stormEntities = useRef<Cesium.Entity[]>([]);
  const point = useRef<Cesium.Entity | null>(null);
  const getView = () => {
    const v = viewer.current,
      C = engine.current;
    if (!v || !C || v.isDestroyed()) return;
    const pos = v.camera.positionCartographic;
    return {
      longitude: C.Math.toDegrees(pos.longitude),
      latitude: C.Math.toDegrees(pos.latitude),
      height: pos.height,
      heading: v.camera.heading,
      pitch: v.camera.pitch,
    };
  };
  const goTo = (place: Place) => {
    const v = viewer.current,
      C = engine.current;
    if (!v || !C) return;
    v.camera.flyTo({
      destination: C.Cartesian3.fromDegrees(
        place.longitude,
        place.latitude,
        latest.current.mode === "earth" ? 4200000 : 280000,
      ),
      duration: latest.current.reducedMotion ? 0 : 1.8,
      orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
    });
  };
  useImperativeHandle(ref, () => ({
    zoom: (direction) => {
      const v = viewer.current;
      if (v)
        v.camera.zoomIn(
          direction * v.camera.positionCartographic.height * 0.28,
        );
    },
    reset: () => {
      const v = viewer.current;
      if (v)
        v.camera.flyTo({
          destination: v.camera.position,
          orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
          duration: latest.current.reducedMotion ? 0 : 0.7,
        });
    },
    goTo,
    getView,
    skip: () => viewer.current?.camera.cancelFlight(),
    fitTrack: (storm) => {
      const C = engine.current,
        v = viewer.current;
      if (!C || !v) return;
      const points = [storm, ...storm.forecast, ...storm.history];
      v.camera.flyToBoundingSphere(
        C.BoundingSphere.fromPoints(
          points.map((p) => C.Cartesian3.fromDegrees(p.longitude, p.latitude)),
        ),
        {
          duration: latest.current.reducedMotion ? 0 : 1.5,
          offset: new C.HeadingPitchRange(0, -Math.PI / 2, 2500000),
        },
      );
    },
  }));
  useEffect(() => {
    let disposed = false;
    let handler: Cesium.ScreenSpaceEventHandler | undefined;
    let unsubscribe: (() => void) | undefined;
    const keyboard = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement)?.closest(
          'button,input,select,[role="dialog"]',
        )
      )
        return;
      const v = viewer.current;
      if (!v) return;
      const step = 0.07;
      if (event.key === "ArrowLeft") v.camera.rotateLeft(step);
      else if (event.key === "ArrowRight") v.camera.rotateRight(step);
      else if (event.key === "ArrowUp") v.camera.rotateUp(step);
      else if (event.key === "ArrowDown") v.camera.rotateDown(step);
      else if (event.key === "+" || event.key === "=")
        v.camera.zoomIn(v.camera.positionCartographic.height * 0.2);
      else if (event.key === "-")
        v.camera.zoomOut(v.camera.positionCartographic.height * 0.2);
      else return;
      event.preventDefault();
      v.scene.requestRender();
    };
    (async () => {
      try {
        const C = await loadEngine();
        if (disposed || !container.current) return;
        engine.current = C;
        C.CreditDisplay.cesiumCredit = new C.Credit("CesiumJS", true);
        const v = new C.Viewer(container.current, {
          baseLayer: false,
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          shouldAnimate: false,
          requestRenderMode: true,
          maximumRenderTimeChange: 1,
          contextOptions: {
            webgl: {
              alpha: false,
              antialias: true,
              powerPreference: "high-performance",
            },
          },
        });
        viewer.current = v;
        v.scene.backgroundColor = C.Color.fromCssColorString("#071119");
        if (v.scene.skyBox) v.scene.skyBox.show = false;
        if (v.scene.sun) v.scene.sun.show = false;
        if (v.scene.moon) v.scene.moon.show = false;
        v.scene.globe.baseColor = C.Color.fromCssColorString("#142b36");
        v.scene.globe.enableLighting = true;
        v.scene.globe.lightingFadeOutDistance = 2000000;
        v.scene.globe.lightingFadeInDistance = 6000000;
        v.scene.globe.showGroundAtmosphere = true;
        v.scene.globe.maximumScreenSpaceError = 2;
        v.scene.fog.enabled = true;
        v.scene.fog.density = 0.0001;
        v.scene.screenSpaceCameraController.minimumZoomDistance = 1200;
        v.scene.screenSpaceCameraController.maximumZoomDistance = 35000000;
        v.clock.currentTime = C.JulianDate.fromDate(
          new Date(latest.current.time),
        );
        const initial = latest.current.initialView;
        v.camera.setView({
          destination: C.Cartesian3.fromDegrees(
            initial.longitude ?? 66,
            initial.latitude ?? 17,
            initial.height ?? 25000000,
          ),
          orientation: {
            heading: initial.heading ?? 0,
            pitch: initial.pitch ?? -Math.PI / 2,
            roll: 0,
          },
        });
        const base = await C.SingleTileImageryProvider.fromUrl(
          "/earth/blue-marble.jpg",
          { credit: "NASA Blue Marble · reference composite" },
        );
        if (disposed) return;
        v.imageryLayers.addImageryProvider(base);
        const lights = await C.SingleTileImageryProvider.fromUrl(
          "/earth/night-lights.png",
          { credit: "NASA VIIRS Earth at Night · 2012 reference" },
        );
        if (disposed) return;
        night.current = v.imageryLayers.addImageryProvider(lights);
        night.current.dayAlpha = 0;
        night.current.nightAlpha = 1;
        night.current.brightness = 1.7;
        night.current.show = latest.current.nightLights;
        // These are geographic labels, never weather detections.
        for (const [text, lon, lat] of [
          ["INDIA", 79, 23],
          ["AFRICA", 21, 5],
          ["EUROPE", 20, 50],
          ["ASIA", 91, 46],
          ["Arabian Sea", 65, 14],
          ["Indian Ocean", 75, -20],
          ["Australia", 134, -25],
        ] as [string, number, number][]) {
          v.entities.add({
            position: C.Cartesian3.fromDegrees(lon, lat),
            label: {
              text,
              font:
                text === text.toUpperCase()
                  ? "500 11px Manrope"
                  : "400 13px Manrope",
              fillColor: C.Color.WHITE.withAlpha(0.58),
              outlineColor: C.Color.BLACK.withAlpha(0.3),
              outlineWidth: 2,
              style: C.LabelStyle.FILL_AND_OUTLINE,
              distanceDisplayCondition: new C.DistanceDisplayCondition(
                700000,
                30000000,
              ),
              translucencyByDistance: new C.NearFarScalar(
                300000,
                0.2,
                12000000,
                0.7,
              ),
            },
          });
        }
        handler = new C.ScreenSpaceEventHandler(v.scene.canvas);
        handler.setInputAction((event: { position: Cesium.Cartesian2 }) => {
          const pick = v.scene.pick(event.position);
          const entity = pick?.id as Cesium.Entity | undefined;
          if (entity?.id?.startsWith("storm:")) {
            const storm = latest.current.storms.find(
              (s) => "storm:" + s.id === entity.id,
            );
            if (storm) latest.current.onStorm(storm);
            return;
          }
          const world = v.camera.pickEllipsoid(event.position);
          if (!world) return;
          const coord = C.Cartographic.fromCartesian(world);
          const longitude = C.Math.toDegrees(coord.longitude),
            latitude = C.Math.toDegrees(coord.latitude);
          latest.current.onClick({
            name: `${Math.abs(latitude).toFixed(2)}°${latitude < 0 ? "S" : "N"}, ${Math.abs(longitude).toFixed(2)}°${longitude < 0 ? "W" : "E"}`,
            latitude,
            longitude,
          });
        }, C.ScreenSpaceEventType.LEFT_CLICK);
        let lastHover = 0;
        handler.setInputAction((event: { endPosition: Cesium.Cartesian2 }) => {
          if (performance.now() - lastHover < 80) return;
          lastHover = performance.now();
          const pick = v.scene.pick(event.endPosition);
          const entity = pick?.id as Cesium.Entity | undefined;
          const storm = entity?.id?.startsWith("storm:")
            ? latest.current.storms.find((s) => "storm:" + s.id === entity.id)
            : undefined;
          const world = v.camera.pickEllipsoid(event.endPosition);
          if (!world) {
            latest.current.onHover(null);
            return;
          }
          const coord = C.Cartographic.fromCartesian(world),
            longitude = C.Math.toDegrees(coord.longitude),
            latitude = C.Math.toDegrees(coord.latitude);
          const value = latest.current.grid
            ? layerValue(
                latest.current.grid,
                latest.current.layer,
                longitude,
                latitude,
              )
            : undefined;
          latest.current.onHover({
            x: event.endPosition.x,
            y: event.endPosition.y,
            storm,
            value,
            latitude,
            longitude,
          });
          v.scene.canvas.style.cursor = storm ? "pointer" : "grab";
        }, C.ScreenSpaceEventType.MOUSE_MOVE);
        unsubscribe = v.camera.moveEnd.addEventListener(() => {
          const view = getView();
          if (view) latest.current.onView(view);
        });
        document.addEventListener("keydown", keyboard);
        setReady(true);
        latest.current.onReady();
        if (
          !initial.height &&
          !latest.current.reducedMotion &&
          !sessionStorage.getItem("mubble-intro")
        ) {
          v.camera.flyTo({
            destination: C.Cartesian3.fromDegrees(66, 17, 17500000),
            duration: 3.2,
            orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
          });
          sessionStorage.setItem("mubble-intro", "seen");
        } else if (!initial.height)
          v.camera.setView({
            destination: C.Cartesian3.fromDegrees(66, 17, 17500000),
          });
        v.scene.requestRender();
      } catch (error) {
        if (!disposed)
          latest.current.onError(
            error instanceof Error ? error.message : "WebGL could not start",
          );
      }
    })();
    return () => {
      disposed = true;
      handler?.destroy();
      unsubscribe?.();
      document.removeEventListener("keydown", keyboard);
      if (viewer.current && !viewer.current.isDestroyed())
        viewer.current.destroy();
      viewer.current = null;
    };
  }, []);
  useEffect(() => {
    const v = viewer.current,
      C = engine.current;
    if (!v || !C) return;
    const date = new Date(props.time);
    if (Number.isFinite(date.getTime()))
      v.clock.currentTime = C.JulianDate.fromDate(date);
    v.scene.requestRender();
  }, [ready, props.time]);
  useEffect(() => {
    const v = viewer.current,
      C = engine.current;
    if (!v || !C) return;
    const { selected, reducedMotion } = latest.current;
    const current = v.camera.positionCartographic;
    const lon = selected?.longitude ?? C.Math.toDegrees(current.longitude),
      lat = selected?.latitude ?? C.Math.toDegrees(current.latitude);
    v.camera.flyTo({
      destination: C.Cartesian3.fromDegrees(
        lon,
        lat,
        props.mode === "earth" ? 17500000 : 1100000,
      ),
      orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
      duration: reducedMotion ? 0 : 0.8,
    });
  }, [props.mode]);
  useEffect(() => {
    const v = viewer.current,
      C = engine.current;
    if (!v || !C) return;
    if (point.current) v.entities.remove(point.current);
    if (props.selected)
      point.current = v.entities.add({
        position: C.Cartesian3.fromDegrees(
          props.selected.longitude,
          props.selected.latitude,
        ),
        point: {
          pixelSize: 8,
          color: C.Color.fromCssColorString("#dceee6"),
          outlineColor: C.Color.fromCssColorString("#192e2c"),
          outlineWidth: 3,
        },
        label: {
          text: props.selected.name,
          font: "500 12px Manrope",
          pixelOffset: new C.Cartesian2(0, -24),
          fillColor: C.Color.WHITE,
          showBackground: true,
          backgroundColor: C.Color.fromCssColorString("#13242be8"),
          backgroundPadding: new C.Cartesian2(9, 5),
        },
      });
    v.scene.requestRender();
  }, [ready, props.selected]);
  useEffect(() => {
    if (night.current) night.current.show = props.nightLights;
    if (viewer.current) {
      viewer.current.resolutionScale =
        props.quality === "low"
          ? 0.65
          : Math.min(1, 1.5 / window.devicePixelRatio);
      viewer.current.scene.requestRender();
    }
  }, [ready, props.nightLights, props.quality]);
  useEffect(() => {
    const v = viewer.current,
      C = engine.current;
    if (!v || !C) return;
    if (!props.terrain) {
      v.terrainProvider = new C.EllipsoidTerrainProvider();
      v.scene.requestRender();
      return;
    }
    let failed = false;
    const provider = new C.CustomHeightmapTerrainProvider({
      width: 65,
      height: 65,
      tilingScheme: new C.WebMercatorTilingScheme(),
      credit:
        "Mapzen terrain · USGS / NOAA and contributing open elevation sources; full attribution in Mubble About",
      callback: (x, y, level) => {
        if (level > 14 || failed) return undefined;
        return fetch(`/api/terrain?z=${level}&x=${x}&y=${y}`)
          .then(async (response) => {
            if (!response.ok) throw new Error("Terrain source unavailable");
            const bitmap = await createImageBitmap(await response.blob());
            const canvas = document.createElement("canvas");
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(bitmap, 0, 0);
            bitmap.close();
            const pixels = ctx.getImageData(0, 0, 256, 256).data;
            const heights = new Float32Array(65 * 65);
            for (let row = 0; row < 65; row++)
              for (let col = 0; col < 65; col++) {
                const i =
                  (Math.min(255, Math.round((row * 255) / 64)) * 256 +
                    Math.min(255, Math.round((col * 255) / 64))) *
                  4;
                heights[row * 65 + col] =
                  pixels[i] * 256 + pixels[i + 1] + pixels[i + 2] / 256 - 32768;
              }
            return heights;
          })
          .catch((error) => {
            if (!failed && !v.isDestroyed()) {
              failed = true;
              v.terrainProvider = new C.EllipsoidTerrainProvider();
              latest.current.onError(
                "Terrain source unavailable. Showing the reference ellipsoid.",
              );
            }
            throw error;
          });
      },
    });
    v.terrainProvider = provider;
    v.scene.requestRender();
  }, [ready, props.terrain]);
  useEffect(() => {
    let cancelled = false;
    const v = viewer.current,
      C = engine.current;
    if (!v || !C) return;
    if (boundary.current) {
      boundary.current.show = props.borders;
      v.scene.requestRender();
      return;
    }
    if (!props.borders) return;
    C.GeoJsonDataSource.load("/earth/boundaries.geojson", {
      stroke: C.Color.fromCssColorString("#c2d5c34f"),
      strokeWidth: 1,
      fill: C.Color.TRANSPARENT,
    })
      .then((data) => {
        if (cancelled || v.isDestroyed()) return;
        boundary.current = data;
        v.dataSources.add(data);
        v.scene.requestRender();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ready, props.borders]);
  useEffect(() => {
    const v = viewer.current,
      C = engine.current;
    if (!v || !C) return;
    stormEntities.current.forEach((e) => v.entities.remove(e));
    stormEntities.current = [];
    for (const storm of props.storms) {
      stormEntities.current.push(
        v.entities.add({
          id: "storm:" + storm.id,
          position: C.Cartesian3.fromDegrees(storm.longitude, storm.latitude),
          point: {
            pixelSize: 12,
            color: C.Color.fromCssColorString("#e6b080"),
            outlineColor: C.Color.fromCssColorString("#14252b"),
            outlineWidth: 3,
          },
          label: {
            text: storm.name,
            font: "600 12px Manrope",
            pixelOffset: new C.Cartesian2(0, -23),
            fillColor: C.Color.fromCssColorString("#f0d4b6"),
            showBackground: true,
            backgroundColor: C.Color.fromCssColorString("#14252be0"),
            backgroundPadding: new C.Cartesian2(8, 4),
          },
        }),
      );
      if (storm.forecast.length > 1)
        stormEntities.current.push(
          v.entities.add({
            polyline: {
              positions: storm.forecast.map((p) =>
                C.Cartesian3.fromDegrees(p.longitude, p.latitude),
              ),
              width: 2,
              material: new C.PolylineDashMaterialProperty({
                color: C.Color.fromCssColorString("#e6b080"),
                dashLength: 12,
              }),
            },
          }),
        );
      if (storm.history.length > 1)
        stormEntities.current.push(
          v.entities.add({
            polyline: {
              positions: storm.history.map((p) =>
                C.Cartesian3.fromDegrees(p.longitude, p.latitude),
              ),
              width: 2,
              material: C.Color.fromCssColorString("#d8eee9"),
            },
          }),
        );
    }
    v.scene.requestRender();
  }, [ready, props.storms]);
  useEffect(() => {
    let cancelled = false;
    const v = viewer.current,
      C = engine.current;
    if (!v || !C) return;
    overlay.current.forEach((l) => v.imageryLayers.remove(l, true));
    overlay.current = [];
    const add = (
      provider: Cesium.ImageryProvider,
      options?: { dayAlpha?: number; nightAlpha?: number },
    ) => {
      if (cancelled || v.isDestroyed()) return;
      const l = v.imageryLayers.addImageryProvider(provider);
      l.alpha = latest.current.layer === "satellite" ? 1 : 0.88;
      if (options?.dayAlpha !== undefined) l.dayAlpha = options.dayAlpha;
      if (options?.nightAlpha !== undefined) l.nightAlpha = options.nightAlpha;
      l.errorEvent?.addEventListener(() =>
        latest.current.onError(
          "Imagery tiles are unavailable. The reference Earth remains visible.",
        ),
      );
      provider.errorEvent.addEventListener(() =>
        latest.current.onError(
          "Some imagery tiles are unavailable. Coverage may be incomplete.",
        ),
      );
      overlay.current.push(l);
      v.scene.requestRender();
    };
    const satellite = (
      dataset: NonNullable<Props["satellite"]>["visible"],
      options?: { dayAlpha?: number; nightAlpha?: number },
    ) => {
      if (!props.frame) return;
      add(
        new C.UrlTemplateImageryProvider({
          url: `/api/tiles?kind=satellite&layer=${encodeURIComponent(dataset.id)}&date=${props.frame.timestamp.slice(0, 10)}&z={z}&x={x}&y={y}`,
          tilingScheme: new C.GeographicTilingScheme({
            numberOfLevelZeroTilesX: 2,
            numberOfLevelZeroTilesY: 1,
          }),
          tileWidth: 512,
          tileHeight: 512,
          maximumLevel: dataset.maxLevel,
          credit: "NASA EOSDIS GIBS · daily satellite observations",
        }),
        options,
      );
    };
    if (props.layer === "satellite" && props.satellite && props.frame) {
      if (props.product === "visible") satellite(props.satellite.visible);
      else if (props.product === "infrared" && props.satellite.infrared)
        satellite(props.satellite.infrared);
      else if (props.product === "automatic") {
        satellite(props.satellite.visible, { dayAlpha: 1, nightAlpha: 0 });
        if (props.satellite.infrared)
          satellite(props.satellite.infrared, { dayAlpha: 0, nightAlpha: 1 });
      }
    } else if (props.layer === "radar" && props.frame?.path) {
      add(
        new C.UrlTemplateImageryProvider({
          url: `/api/tiles?kind=radar&path=${encodeURIComponent(props.frame.path)}&z={z}&x={x}&y={y}`,
          maximumLevel: 7,
          credit: "RainViewer · regional radar observations",
        }),
      );
    } else if (props.grid && palettes[props.layer]) {
      const canvas = document.createElement("canvas");
      canvas.width = 720;
      canvas.height = 360;
      const ctx = canvas.getContext("2d")!;
      const image = ctx.createImageData(720, 360);
      const { stops } = palettes[props.layer];
      for (let y = 0; y < 360; y++)
        for (let x = 0; x < 720; x++) {
          const value = layerValue(
              props.grid,
              props.layer,
              x / 2 - 180,
              90 - y / 2,
            ),
            index = (y * 720 + x) * 4;
          if (value === undefined) continue;
          const [r, g, b] = colorAt(value, stops);
          image.data[index] = r;
          image.data[index + 1] = g;
          image.data[index + 2] = b;
          image.data[index + 3] =
            props.layer === "precipitation" && value < 0.1 ? 0 : 180;
        }
      ctx.putImageData(image, 0, 0);
      C.SingleTileImageryProvider.fromUrl(canvas.toDataURL(), {
        credit: props.grid.attribution + " · bilinear display smoothing",
      })
        .then((provider) => add(provider))
        .catch(() =>
          latest.current.onError("Could not render this forecast field."),
        );
    }
    return () => {
      cancelled = true;
    };
  }, [
    ready,
    props.layer,
    props.satellite,
    props.product,
    props.frame,
    props.grid,
  ]);
  useEffect(() => {
    const v = viewer.current,
      C = engine.current,
      canvas = particles.current,
      grid = props.grid;
    if (
      !v ||
      !C ||
      !canvas ||
      props.layer !== "wind" ||
      !grid?.fields.u ||
      !grid.fields.v ||
      props.reducedMotion
    )
      return;
    const ctx = canvas.getContext("2d")!;
    let animation = 0,
      last = 0;
    type Particle = { lon: number; lat: number; age: number };
    const count = props.quality === "low" ? 90 : 240;
    const seed = (): Particle => ({
      lon: Math.random() * 360 - 180,
      lat: Math.random() * 150 - 75,
      age: Math.random() * 100,
    });
    const points = Array.from({ length: count }, seed);
    const animate = (now: number) => {
      animation = requestAnimationFrame(animate);
      if (document.hidden || now - last < 32) return;
      const elapsed = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (
        canvas.width !== canvas.clientWidth ||
        canvas.height !== canvas.clientHeight
      ) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = "rgba(0,0,0,.9)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(230,248,243,.55)";
      ctx.lineWidth = 1;
      const occluder = new C.EllipsoidalOccluder(
        C.Ellipsoid.WGS84,
        v.camera.positionWC,
      );
      for (let i = 0; i < points.length; i++) {
        const p = points[i],
          u = gridValue(grid, "u", p.lon, p.lat),
          north = gridValue(grid, "v", p.lon, p.lat);
        if (u === undefined || north === undefined || p.age++ > 130) {
          points[i] = seed();
          continue;
        }
        const start = C.Cartesian3.fromDegrees(p.lon, p.lat, 12000);
        // Accelerated display advection; direction and relative speed come from GFS vectors.
        p.lon +=
          (u * elapsed * 0.06) /
          Math.max(0.2, Math.cos((p.lat * Math.PI) / 180));
        p.lat += north * elapsed * 0.06;
        if (Math.abs(p.lat) > 85) {
          points[i] = seed();
          continue;
        }
        if (p.lon > 180) p.lon -= 360;
        if (p.lon < -180) p.lon += 360;
        const end = C.Cartesian3.fromDegrees(p.lon, p.lat, 12000);
        if (!occluder.isPointVisible(start)) continue;
        const a = C.SceneTransforms.worldToWindowCoordinates(v.scene, start),
          b = C.SceneTransforms.worldToWindowCoordinates(v.scene, end);
        if (a && b && Math.abs(a.x - b.x) < 60 && Math.abs(a.y - b.y) < 60) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    };
    animation = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animation);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [ready, props.grid, props.layer, props.quality, props.reducedMotion]);
  return (
    <>
      <div
        ref={container}
        className="earth-canvas"
        role="region"
        tabIndex={0}
        aria-label="Interactive Mubble Earth. Drag to rotate, scroll to zoom. Arrow keys rotate the globe; plus and minus zoom."
      />
      <canvas ref={particles} className="wind-canvas" aria-hidden="true" />
    </>
  );
});
export default Earth;
