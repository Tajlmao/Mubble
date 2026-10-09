# Deploying Mubble

## Required host

Use a Linux Node.js server with Python support. GitHub stores the source code; GitHub Pages cannot run this project's Node/Python backend. A full server, VM, or service that supports both runtimes can run the application.

Install Node.js 24 and Python 3.12, then run from the checkout:

```bash
bash scripts/setup.sh
MUBBLE_SITE_URL=https://your-public-domain.example npm start
```

Replace the example origin with the actual public HTTPS origin. Configure the host to retain the checkout, `node_modules`, `.next`, `.venv`, `scripts/decode-grib.py`, and prepared `public/cesium` assets. Run the process from the project root. Do not copy a virtual environment between different operating systems or architectures; create it on the target host.

The default port is 3000; the host can select another with `PORT`. Use a process supervisor or the hosting platform's restart mechanism. Keep credentials in host configuration rather than repository files.

## HTTPS and mobile access

Place the server behind the host's HTTPS ingress or a trusted reverse proxy. Browser geolocation and modern clipboard sharing require a secure context. Pass the correct `Host`, `X-Forwarded-Host`, and `X-Forwarded-Proto` values; sanitize forwarded headers at the proxy. Allow at least 60 seconds for GFS requests.

For a temporary phone preview, expose this running server through the hosting platform's public preview feature or an HTTPS tunnel. The URL must point to the complete Node/Python application and remain reachable while its server and tunnel are running. A repository URL or local loopback address is not a hosted website. No permanent or temporary deployment URL is assumed by this repository.

## Outbound access

| Domain                         | Use                                     |
| ------------------------------ | --------------------------------------- |
| `gibs.earthdata.nasa.gov`      | Satellite catalog, imagery, and legends |
| `nomads.ncep.noaa.gov`         | GFS GRIB2 files                         |
| `api.open-meteo.com`           | Point forecasts                         |
| `geocoding-api.open-meteo.com` | Place search                            |
| `api.rainviewer.com`           | Radar metadata                          |
| `tilecache.rainviewer.com`     | Radar image tiles                       |
| `www.nhc.noaa.gov`             | Advisories and optional official KMZ    |
| `ftp.nhc.noaa.gov` over HTTPS  | Official ATCF tracks                    |
| `s3.amazonaws.com`             | Mapzen elevation tiles                  |

Dependency installation also needs the npm and PyPI registries. The server honors inherited `HTTPS_PROXY` or `HTTP_PROXY` through its upstream adapter and keeps TLS verification enabled. Supply the trusted CA configuration required by the deployment platform when using a managed proxy.

## Check the deployed application

Verify that `/` returns the Mubble page, `/cesium/Cesium.js` is served, and the globe renders on a phone. Then verify `/api/forecast?lat=19.076&lon=72.8777` contains a real current timestamp and numeric temperature, `/api/satellite` contains published frame dates, and `/api/grid?hour=3` contains decoded fields with cycle and valid times.

Run the existing browser suite against the deployment with `MUBBLE_TEST_URL` and an installed Chromium. Check the data-source panel and explicit failure states as well as the root page.

For sustained public traffic, apply request and resource limits, monitor provider availability, and configure licensing suitable for the use. Open-Meteo's free API is for noncommercial use. Retain Mubble's About/source links and all notices served under `/licenses/`.
