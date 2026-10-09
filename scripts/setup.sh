#!/usr/bin/env bash
set -euo pipefail
mubble_repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$mubble_repo_dir"
npm ci --cache "${MUBBLE_NPM_CACHE:-${TMPDIR:-/tmp}/mubble-npm-cache}" --no-audit --no-fund
"${MUBBLE_PYTHON_BIN:-python3}" -m venv --copies .venv
.venv/bin/python -m pip install --cache-dir "${MUBBLE_PIP_CACHE:-${TMPDIR:-/tmp}/mubble-pip-cache}" -r requirements-weather.txt
.venv/bin/python -m pip --cache-dir "${MUBBLE_PIP_CACHE:-${TMPDIR:-/tmp}/mubble-pip-cache}" check
npm run build
