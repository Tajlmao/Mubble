# Mubble roadmap

The initial release connects the providers listed in the README. This roadmap records remaining work from the global exploration brief; entries are not claims of implemented features or promised delivery dates.

## Global observation coverage

- Integrate GOES, Himawari, and Meteosat geostationary imagery with genuine acquisition timestamps, documented coverage, and appropriate source attribution.
- Add water-vapor products with native provider legends and clear interpretation.
- Add measured cloud-height products when a supported source supplies them.

## Cyclone coverage

- Connect authoritative regional agencies, including IMD and JMA, while preserving basin coverage, agency classifications, and differing wind-averaging periods.
- Render published uncertainty cones rather than generating assumed forecast uncertainty.
- Compare and label agency products when multiple sources cover the same storm.

## Additional scientific products

- Add fog or severe-storm classification only when supported by a documented validated product.
- Make observation age, spatial resolution, missing coverage, and forecast uncertainty easier to inspect.

## Public hosting

- Publish a verified HTTPS preview and select a durable host that supports Node.js and Python.
- Add deployment-level traffic limits, availability monitoring, and commercial provider configuration if the usage requires it.
- Expand mobile performance and accessibility verification across physical devices and browsers.
