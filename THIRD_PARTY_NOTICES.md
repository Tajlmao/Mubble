# Third-party notices

Mubble's [MIT License](LICENSE) covers its original code and documentation. It does not change the licenses of the materials listed below. Preserve their notices when redistributing or hosting the application.

## Bundled data and assets

| Material                             | Source                                                                          | Terms and attribution                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| NASA Blue Marble reference           | NASA GIBS `BlueMarble_NextGeneration` WMS                                       | NASA imagery; credit NASA EOSDIS GIBS and NASA's Blue Marble project. Historical, cloud-free reference imagery. |
| NASA VIIRS Earth at Night reference  | NASA GIBS `VIIRS_CityLights_2012` WMS                                           | Credit NASA/NOAA and NASA EOSDIS GIBS. Historical 2012 composite.                                               |
| Country boundaries                   | Natural Earth                                                                   | Public-domain vector data; attribution to Natural Earth retained.                                               |
| Manrope font                         | Manrope Project Authors, distributed by Fontsource                              | SIL Open Font License 1.1; complete notice in `/licenses/Manrope-OFL.txt`.                                      |
| CesiumJS engine, workers, and assets | CesiumJS Contributors                                                           | Apache 2.0 plus included third-party notices; complete package notice in `/licenses/Cesium-LICENSE.md`.         |
| Interface icons                      | Lucide Icons and Contributors; certain icons derived from Feather by Cole Bemis | ISC and the included Feather MIT notice; complete notice in `/licenses/Lucide-LICENSE.txt`.                     |

Reference image URLs, retrieval date, dimensions, and checksums are recorded in [`public/earth/SOURCES.md`](public/earth/SOURCES.md). NASA imagery is subject to [NASA's media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/); NASA names and insignia do not imply endorsement. U.S. government-produced imagery is generally not subject to copyright in the United States, while third-party material and marks retain their own rights.

## Connected external data

- **NASA EOSDIS GIBS:** acknowledge NASA EOSDIS GIBS and the displayed product/instrument. Daily mosaics and infrared observations retain their published acquisition dates.
- **NOAA/NCEP GFS and NOAA NHC:** acknowledge NOAA and the responsible service. U.S. government datasets are not relicensed by Mubble. Retain product times, agency classification, and native interpretation.
- **Open-Meteo:** data attribution under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The free API tier is noncommercial; commercial use requires an appropriate subscription or compliant self-hosted setup under [provider terms](https://open-meteo.com/en/terms).
- **RainViewer:** acknowledge RainViewer and contributing radar networks; follow [API documentation and current terms](https://www.rainviewer.com/api.html). Coverage and usage limits are provider-defined.
- **Mapzen elevation / national contributors:** terrain combines datasets with distinct terms. Preserve the full [terrain attribution](public/earth/terrain-attribution.md) linked from the application.

## Software dependencies

Direct browser/server dependencies use the following published licenses: Next.js, React, React DOM, fast-xml-parser, fflate, and undici — MIT; CesiumJS — Apache 2.0; Manrope — OFL 1.1; Lucide — ISC with Feather-derived icons under MIT. `package-lock.json` records exact resolved npm versions and license metadata.

The Python decoder uses ecCodes and findlibs (Apache 2.0), ECMWF's ecCodes/eckit native libraries, NumPy (BSD and bundled dependency notices), attrs (MIT), cffi (MIT-0), and pycparser (BSD). Exact versions are pinned in `requirements-weather.txt`; installed distributions retain their complete license files. Consult those distribution notices when packaging native binaries.

The setup script copies the font, icon, and Cesium notices into the public license directory. Dependency license files and notices must accompany any packaged redistribution. Provider API responses are fetched at runtime and are not included under Mubble's MIT grant.
