# Contributing to Mubble

Use the setup and verification commands in [README.md](README.md). Work on a focused branch and describe the resulting behavior in your pull request.

## Project conventions

- Use **Mubble** consistently in the interface, metadata, loading states, documentation, and share features. Preserve the original orbital M identity.
- Keep TypeScript strict. Use the Next.js documentation installed with the project when changing framework behavior.
- Keep source dates, forecast cycles, valid times, units, coverage, and agency wind conventions visible and accurate.
- Preserve explicit unavailable states. Fixture or simulated weather belongs in tests, never in the product's production data path.
- Access upstream providers through server adapters with fixed trusted origins, timeouts, and TLS verification. Never place credentials in client code or commits.
- Respect upstream attribution and usage terms. Update the source and license notices when adding assets, fonts, or datasets.
- Keep controls usable on phones, with keyboard focus, accessible names, and reduced-motion preferences.

## Validation

Run lint, type checking, the unit tests, and a production build for code changes. For globe or interaction changes, also run the relevant browser tests against a running server. Documentation-only changes need link and formatting checks. Add a focused test when behavior introduces a meaningful failure case; avoid tests that merely repeat the implementation.

The browser suite includes real provider requests. Report provider access failures separately from application regressions and never remove assertions just to obtain a passing run.

Commit `package-lock.json` and the pinned Python requirements with intentional dependency changes. Do not commit `node_modules`, `.venv`, `.next`, generated Cesium files, `.env` files, or temporary test output.

## Useful bug reports

Include the selected layer/product, displayed source timestamp, expected and actual behavior, reproduction steps, browser/device, and whether the problem persists after retry. Include a screenshot or redacted browser error when useful. Send security-sensitive findings privately as described in [SECURITY.md](SECURITY.md).
