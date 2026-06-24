## Context

The physics core is plain ES modules importable by both the browser and the Node
harness, exposing `solveElectrical` and `solveSteady` plus the `readings.js` facade
over the solved `live`/`pressure`/`flow` primitives. The UI is purely a consumer of
those results: it adds no physics and runs no qualitative rule layer alongside the
solve. The locked platform decisions (`docs/sim_build_plan.md`) and the visual spec
(`docs/sim_ui.md`) constrain the *how*; this file records them so the spec stays
about outcomes.

## Goals / Non-Goals

**Goals:**
- A single live SVG view of hydraulics + wiring, mobile-first, phone portrait.
- Render strictly from solved primitives; positions are static, only styles update.
- A geometry completeness test that fails on any `system.yaml` element without a
  position (or vice versa).

**Non-Goals:**
- Fault-injection UI (deferred to M8; the engine runs a no-fault baseline today).
- Auto-layout / elkjs, any framework, bundler, or d3.
- Accessibility, legacy-browser fallbacks, scenario presets/persistence.

## Decisions

- Vanilla JS + hand-rolled SVG/DOM; CDN deps via importmap; no bundler.
- Hand-authored `geometry.js` coordinates; no auto-layout.
- Solver in a Web Worker, main-thread fallback if CDN wasm-in-worker breaks.
- `scene.js` builds paths/glyphs once; `render.js` only updates stroke width
  (proportional to |flow|), colour (against the no-fault baseline), idle styling,
  and `live` wiring traces. Hosted on GitHub Pages deploying the whole repo so
  `../system.yaml` resolves from `sim/index.html`.

## Risks / Trade-offs

- CDN wasm locate failure in-browser -> vendor just the `.wasm` and point the
  loader at it; keep CDN otherwise.
- Flow-legibility technique (gradient vs dash-density vs thickness) is left open;
  the spec only requires "roughly how much, at a glance".
- Hand-authored geometry is laborious but is the explicit decision over auto-layout;
  the completeness test guards against drift as `system.yaml` evolves.
