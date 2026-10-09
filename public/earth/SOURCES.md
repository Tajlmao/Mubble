# Bundled Earth reference sources

These textures are historical reference products, not current weather observations. They were downloaded over TLS from NASA EOSDIS GIBS on **2026-10-09** without image modification.

## Blue Marble

- Product: NASA GIBS `BlueMarble_NextGeneration`.
- File: `blue-marble.jpg`, 2048×1024 JPEG, EPSG:4326 global bounds.
- Credit: NASA EOSDIS GIBS / NASA Blue Marble.
- SHA-256: `7f1b66f435c3a21a3dce6a537818997a28c5a820dd218c45308054daf2eddabd`.
- [Exact source request](https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=BlueMarble_NextGeneration&STYLES=&FORMAT=image/jpeg&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=2048&HEIGHT=1024).

## Earth at Night

- Product: NASA GIBS `VIIRS_CityLights_2012`.
- File: `night-lights.png`, 2048×1024 PNG, EPSG:4326 global bounds.
- Acquisition period: historical 2012 VIIRS composite; no claim of current city-light conditions.
- Credit: NASA/NOAA / NASA EOSDIS GIBS.
- SHA-256: `eef463540defad8daba9f8c5ac3c9f1cb27b2894a1e216a0d862a5950abbaa1f`.
- [Exact source request](https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=VIIRS_CityLights_2012&STYLES=&FORMAT=image/png&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=2048&HEIGHT=1024).

## Country boundaries

`boundaries.geojson` contains Natural Earth country boundaries, used as optional geographic reference lines. Natural Earth vector and raster map data are [public domain](https://www.naturalearthdata.com/about/terms-of-use/). Boundaries are reference cartography rather than assertions about sovereignty.

See the project third-party notices and NASA's [media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). Terrain sources have separate notices in `terrain-attribution.md`.
