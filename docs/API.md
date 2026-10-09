# Mubble API reference

All routes are read-only, same-origin server endpoints. They do not require a Mubble API key. These adapters support the website; their upstream providers retain their own licenses and rate limits.

| Endpoint             | Parameters                                                                               | Response                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `GET /api/satellite` | None                                                                                     | Published visible/infrared products, frame timestamps, matrix limits, legend link, attribution, and fetch time.  |
| `GET /api/radar`     | None                                                                                     | Published historical frames, provider paths, timestamps, attribution, and coverage.                              |
| `GET /api/forecast`  | `lat` in −90…90; `lon` in −180…180                                                       | Open-Meteo current model conditions, hourly values, seven daily forecasts, timezone, and units.                  |
| `GET /api/search`    | `q`: trimmed place name, 2–100 characters                                                | Open-Meteo place results with coordinates and administrative names.                                              |
| `GET /api/grid`      | `hour`: 3…72, divisible by 3; default 3                                                  | Decoded GFS grid geometry, cycle/valid time, fields, accumulation intervals, and attribution.                    |
| `GET /api/storms`    | None                                                                                     | NHC normalized advisories, supported-basin coverage, fetch time, and available official history/forecast tracks. |
| `GET /api/tiles`     | Satellite: `kind=satellite`, catalog `layer`, published `date=YYYY-MM-DD`, `z`, `x`, `y` | Geographic NASA WMS image tile.                                                                                  |
| `GET /api/tiles`     | Radar: `kind=radar`, provider `path`, `z`, `x`, `y`                                      | Published RainViewer image tile.                                                                                 |
| `GET /api/terrain`   | Valid Web Mercator `z`, `x`, `y`; `z` 0…14                                               | 256×256 Terrarium PNG elevation tile.                                                                            |
| `GET /api/legend`    | Connected satellite `layer`                                                              | Provider's genuine color-scale legend.                                                                           |

## Examples

```bash
curl --fail 'http://127.0.0.1:3000/api/forecast?lat=19.076&lon=72.8777'
curl --fail 'http://127.0.0.1:3000/api/search?q=Mumbai'
curl --fail 'http://127.0.0.1:3000/api/grid?hour=3'
```

Use catalog-provided satellite dates and radar paths rather than inventing timestamps or URLs. Requests for missing or invalid coordinates return `400`. Unavailable satellite products return `404`; provider failures generally return `503`. JSON outage responses include `error`, `provider`, and a readable `message`. Tile failures return text.

The GFS route allows up to 40 seconds for upstream retrieval and 15 seconds for decoding. A public reverse proxy needs enough time for that operation. Responses can be several megabytes; apply appropriate request limits and caching on the host.

## Interpretation

Current point conditions are model-derived, not a weather station measurement. Satellite frame dates are acquisition days, not one simultaneous global exposure. GFS uses its native 1° grid; bilinear rendering does not create new measured detail. Precipitation is accumulated over the decoded interval. Cyclone tracks retain published positions, and empty track arrays mean no connected track was retrieved.
