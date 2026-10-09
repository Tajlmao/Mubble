# Mubble architecture

## Browser and globe

`app/page.tsx` renders the explorer. `components/Explorer.tsx` owns selected layers, product/date, saved preferences, search, forecasts, and panels. `components/Earth.tsx` owns Cesium's imperative viewer, imagery layers, camera, terrain, storms, and wind drawing.

The local Cesium engine is loaded on demand from `/cesium/Cesium.js`. Its workers, textures, and widgets are copied from the locked package during `npm ci`, avoiding an external CDN or a large Next.js engine bundle. Fonts are bundled locally. The globe uses astronomical lighting for the selected instant and keeps historical reference imagery distinct from observations.

Client requests cancel stale selections and use bounded caches. Manual timeline scrubbing pauses playback. Animation respects reduced motion and pauses background work when the document is hidden.

## Server data adapters

Next.js route handlers under `app/api/` fetch actual provider data. `lib/providers.ts` supplies TLS-verified requests, optional inherited HTTP proxy support, request timeouts, bounded metadata/grid caching, and coalescing of matching in-flight requests. Routes use fixed provider origins and validated parameters.

NASA's capabilities describe available products and published acquisition days. Satellite tiles use EPSG:4326 WMS with geographic bounds calculated for Cesium's geographic tiling scheme. RainViewer metadata supplies actual radar frame paths. Provider legends are served from validated NASA catalog links.

The GFS route retrieves selected fields from NOAA's global 1° GRIB2 files and launches `.venv/bin/python scripts/decode-grib.py`. ecCodes supplies grid geometry, forecast cycle, valid time, vectors, and accumulation intervals. The server converts Kelvin to Celsius and pascals to hectopascals. Display interpolation smooths raster values without claiming additional measurement resolution.

NHC adapters preserve agency classification and one-minute wind speed. Official ATCF best-track and forecast products supply positions and times where available; an optional official KMZ fallback supplies paths. A missing track does not suppress a verified advisory or invent a replacement path.

## Storage and privacy

Mubble has no application database or account system. Browser storage retains preferences and saved places. Search and coordinate requests pass to the server and selected external provider. Share URLs encode a view and can include a location. Server caches live in memory and reset when the process restarts.

## Failure behavior

Unavailable providers return explicit errors. The browser reports missing imagery or data and keeps the reference globe usable. Empty radar coverage is not interpreted as dry conditions; unavailable storm data is not interpreted as no active storms. Terrain retrieval failures restore the reference ellipsoid. WebGL failures show a retryable explanation.

## Runtime boundary

The production application needs a persistent Node.js server, Python 3.12, native ecCodes dependencies, the copied-interpreter `.venv`, the decoder script, and prepared Cesium assets. A static host or edge-only runtime cannot execute the complete application. See [DEPLOYMENT.md](DEPLOYMENT.md).
