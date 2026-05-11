# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Single-page diagnostic web app that walks a homeowner through an irrigation/sprinkler troubleshooting questionnaire and continually re-ranks the most likely root causes, visualised on a system schematic. Live at https://paumen.github.io/irrigation/. See `spec.md` for the product spec (sections, ranking, map, recommendation rules).

## Build / run

```bash
npm install
npm run build      # esbuild bundles irrigation.jsx → irrigation.js (minified, react/react-dom external)
```

There is no dev server and no test runner. To iterate locally, rebuild and open `index.html` directly (or serve the directory with any static server). React 18 and ReactDOM are loaded as globals from a CDN by `index.html` — the bundle relies on those globals (note `const { useState, ... } = React;` at the top of `irrigation.jsx`), which is why both packages are marked `--external` in the build script.

## Deployment

GitHub Actions (`.github/workflows/pages.yml`) runs `npm install && npm run build` on push to `main` and publishes the entire repo root to GitHub Pages. Anything that needs to ship must live at the repo root and be referenced by `index.html`.
