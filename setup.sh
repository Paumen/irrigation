#!/bin/bash
set -euo pipefail
pip install --quiet --ignore-installed "mcp>=1.0" cairosvg matplotlib graphviz
npm install -g --silent --no-audit --no-fund \
  eslint@^9 \
  globals@^15 \
  prettier@^3 \
  stylelint@^16 \
  stylelint-config-recess-order@^5 \
  stylelint-config-standard@^36 \
  stylelint-declaration-strict-value@^1 \
  alpinejs@^3 \
  playwright@^1

# --- System packages: image conversion (ImageMagick) + graph rendering (Graphviz dot) ---
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq --no-install-recommends imagemagick graphviz

# --- Headless Chromium for screenshots / HTML+CSS rendering (Playwright) ---
playwright install --with-deps chromium

# --- GitHub CLI (gh) ---
if ! command -v gh >/dev/null 2>&1; then
  GH_VER="$(curl -fsSLI -o /dev/null -w '%{url_effective}' \
    https://github.com/cli/cli/releases/latest | sed -E 's#.*/tag/v##')"
  curl -fsSL "https://github.com/cli/cli/releases/download/v${GH_VER}/gh_${GH_VER}_linux_amd64.tar.gz" \
    | tar -xz -C /tmp
  install -m 0755 "/tmp/gh_${GH_VER}_linux_amd64/bin/gh" /usr/local/bin/gh
fi
