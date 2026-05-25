# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Single-page diagnostic web app that walks a homeowner through an irrigation/rotor troubleshooting questionnaire and continually re-ranks the most likely root causes, visualised on a system schematic. Live at https://paumen.github.io/irrigation/. See `docs/spec.md` for the product spec.

The same scoring engine is also exposed as an MCP tool so agents can drive the question-and-answer loop programmatically. See `.claude/skills/irrigation-troubleshoot/SKILL.md` for how the agent loop is meant to run.

## Build / run

There is no build step, no dev server, and no test runner. To iterate locally, edit files and open `index.html` directly (or serve the directory with any static server). Alpine.js 3 is loaded as a global from a CDN by `index.html`; `data.js`, `icons.js`, `engine.js`, and `app.js` populate `window.DATA`, `window.ICONS`, `window.createEngine`, and register the Alpine `app` factory respectively.

The DOM lives in `index.html` as declarative Alpine templates (`x-data="app"`, `x-for`, `x-if`, `x-text`, `:attr`, `@event`). State, watchers, and UI methods live in `app.js`; pure scoring/recommendation logic lives in `engine.js`.

## Engine vs app

- `engine.js` — pure functions: `rank(answers)`, `recommendations(answers, skipped)`, `relevancyLevel(qid, answers, skipped)`, `discriminators`, `stageProgress`, `isAnswered`, `isCompleted`. No DOM, no Alpine, no `localStorage`. Imported by `app.js` (browser) and `tools/engine.py` (mirror). Edit weights, question shapes, and scoring rules here.
- `app.js` — Alpine factory, persistence, navigation, animations, equipment-date UI, SVG rendering. Delegates all scoring to `ENGINE.*`.

## Agent tooling (`tools/`)

- `tools/engine.py` — Python port of `engine.js`, stdlib only. Identical algorithm.
- `tools/diagnose.py` — agent-facing wrapper: returns top causes + next questions with `D` and `relevancy`. Usable as a library or stdin/stdout CLI.
- `tools/mcp_server.py` — FastMCP server exposing two tools, `diagnose_irrigation(answers, skipped)` and `irrigation_hydraulics(adjustments, zone, concurrent_zones)`. Registered in `.mcp.json`.
- `tools/hydraulics.py` — hydraulic calculator. Reads `setup.yaml` and runs a full solve (DAB Jet pump curve → static lift from elevations → Hazen-Williams pipe friction → per-head pressure → per-head flow, iterated because unregulated I-20 flow depends on pressure; MP Rotators are 40 PSI regulated). Returns per-zone flow, head pressures, and a min/max pressure + flow weakest-link report. Each zone also carries a `node_pressures_bar` profile (pump discharge → manifold → after-valve) and per-head `loss_breakdown_bar`. Supports what-if `adjustments` (swap a nozzle, change a pump, pin an operating pressure, move the water table) and `concurrent_zones=[2,3]` to model several zones running at once (shared pump/main carrying the combined flow, per-zone valves and laterals). Embeds the Hunter I-20 Blue / MP Rotator charts and DAB Jet curves. Library or stdin/stdout CLI. Needs `pyyaml`.
- `tools/export-data.mjs` — extracts `window.DATA` from `data.js` into `data.json` (the Python engine reads the JSON mirror). Run with `npm run export-data`.
- `tools/test-parity.mjs` — runs 17 canned answer scenarios through both engines and asserts identical rankings within 1e-9. Also detects stale `data.json`. Run with `npm run test:parity`.
- `tools/test_hydraulics.py` — sanity checks for the hydraulic calculator (chart lookups, baseline solve, weakest links, what-if behaviour). Run with `npm run test:hydraulics`.

`data.js` is the single source of truth for questions/causes/weights. `data.json` is a generated mirror; never edit it by hand. After changing `data.js`, run `npm run export-data` and `npm run test:parity`.

## Engine changes

When tuning the scoring math, edit `engine.js` **and** `tools/engine.py` together. The parity test catches drift but doesn't fix it. If you can only edit one, edit `engine.js` first — it's the browser source of truth — then mirror to Python.

## Session setup

`.claude/hooks/session-start.sh` (registered via `.claude/settings.json`) runs at the start of every Claude Code on the web session: `pip install -r requirements.txt` for the MCP SDK, `npm install` for the JS dev deps. Synchronous so the session is ready when it opens.
