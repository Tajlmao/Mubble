# Security policy

Security fixes target the current `main` branch. Mubble 0.1.0 is a development release; there are no maintained older release branches.

## Reporting a vulnerability

Use this repository's **Security → Report a vulnerability** option if private reporting is enabled. If that option is unavailable, contact the repository owner privately through an existing contact channel. A public issue may request a private reporting channel without including exploit details.

Include the affected commit, reproduction steps, impact, and any proposed fix. Do not include credentials, unredacted personal location data, or an exploit against a third-party provider in a public issue.

## Deployment considerations

The application keeps provider requests on fixed server-side origins, validates coordinates and tile parameters, applies timeouts, and preserves TLS verification. Saved places and preferences stay in browser storage; selected coordinates and searches are sent to the server and relevant data provider. Shared map URLs can contain selected locations.

A public host should terminate HTTPS, restrict trusted proxy headers, apply request and resource limits, and keep Node.js, Python, native GRIB dependencies, and npm packages updated. Configure provider accounts and licenses for the intended traffic. See [deployment guidance](docs/DEPLOYMENT.md).
