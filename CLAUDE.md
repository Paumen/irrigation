# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Single-page diagnostic web app that walks a homeowner through an irrigation/sprinkler troubleshooting questionnaire and continually re-ranks the most likely root causes, visualised on a system schematic. Live at https://paumen.github.io/irrigation/. See `spec.md` for the product spec (sections, ranking, map, recommendation rules).

## Build / run

```bash
npm install
npm run build      # esbuild bundles irrigation.jsx → irrigation.js (minified, react/react-dom external)
```

There is no dev server, no test runner, and no linter configured. To iterate locally, rebuild and open `index.html` directly (or serve the directory with any static server). React 18 and ReactDOM are loaded as globals from a CDN by `index.html` — the bundle relies on those globals (note `const { useState, ... } = React;` at the top of `irrigation.jsx`), which is why both packages are marked `--external` in the build script.

`irrigation.js` is the build artifact and is git-ignored; `index.html` references it, so a build is required before the page works.

## Deployment

GitHub Actions (`.github/workflows/pages.yml`) runs `npm install && npm run build` on push to `main` and publishes the entire repo root to GitHub Pages. Anything that needs to ship must live at the repo root and be referenced by `index.html`.

## Architecture

Three files do all the work:

- **`data.json`** — the entire domain model. Two arrays:
  - `causes`: leaf root-cause nodes with `id` (e.g. `R7.1`), `parent` group id (e.g. `R7`), `baseline` prior, and human `label`.
  - `questions`: each has `stage` (1 Ages / 2 Symptoms / 3 Events / 4 Tests), `text`, and `options[]`. Each option has an `effects` map of `{ targetId: delta }` where `targetId` may be a leaf id (`R7.1`) **or** a parent group id (`R7`) — group targets are expanded to all their children at load time by `expand()`/`eff()` in `irrigation.jsx`.
  - To add a cause, question, or tweak weights, edit `data.json` only. The schematic, however, also needs an `R_POS` entry in `irrigation.jsx` for any new leaf id.

- **`irrigation.jsx`** — one file, one `App` component plus pure presentational sub-components (`SystemDiagram`, `StageBar`, `QuestionList`, `QuestionPanel`, `RankingPanel`, `RecommendationPanel`). All state lives in `App`:
  - `answers` (`{questionId: optionIndex}`) is the single source of truth — everything else is `useMemo`'d from it.
  - `scores` = baseline + sum of selected option effects (with the `E_freeze` + `freezeDrained` checkbox halving its effect).
  - `ranked` normalises positive scores into percentages.
  - `severityT` ∈ [0,1] per cause, drives `sevColor()` on both the schematic pips and the ranking bars.
  - `recommendations` ranks unanswered questions by total spread of effects across the current top-5 causes (the "differentiator score" `D`) — this implements the spec's "Smart Recommendations".
  - Answering a question auto-advances to the next one after ~180 ms.

- **`styles.css`** — the "engineering worksheet" look (JetBrains Mono + Nunito Sans, paper/rust palette). Layout uses a top schematic section and a two-column workbench (question panel left, ranking + recommendations right), collapsing on mobile via `useIsMobile(760)`.

### Schematic ↔ data coupling

`SystemDiagram` draws fixed boxes (SOFTWARE → CONTROLLER → RELAY → PUMP → VALVES → 3× SPRINKLER) with hard-coded SVG coordinates. Each leaf cause id has a corresponding pixel position in `R_POS` and is rendered as a numbered "R-pip" coloured by `severityT`. If you add a new cause id to `data.json` without adding it to `R_POS`, it won't appear on the diagram (it will still appear in the ranking).
