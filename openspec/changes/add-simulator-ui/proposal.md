## Why

The simulator's physics core (M1-M4) is built and verified by the Node harness,
but there is no UI: none of `geometry.js`, `scene.js`, `render.js`, `controls.js`,
`app.js`, or `index.html` exist (`docs/sim_build_plan.md`, M5/M6 = not started).
Requirements R11-R16 (`docs/sim_spec.md`) — show the system as a live, controllable
diagram — are entirely unmet. This change introduces the UI so the verified engine
becomes something a homeowner can actually drive.

## What Changes

- Add a hand-authored coordinates module (`geometry.js`) covering every flow node,
  circuit-part port, and wire route, validated by a completeness test against
  `system.yaml` (no auto-layout, per the locked decision in `sim_build_plan.md`).
- Add `scene.js` (static scene graph built once) and `render.js` (data-join SVG
  update from a solved result; positions never move).
- Add the eight item-level controls (`docs/sim_state_model.md`) and the side sheet,
  the Web Worker solve (main-thread fallback), and `app.js` glue with debounced
  re-solve.
- Add the non-convergence affordance: keep last good view + a "won't settle" badge
  driven off the `converged` flag.
- Ship: `.github/workflows/pages.yml` and `sim/README.md`.

Out of scope (deferred — see `docs/sim_ui.md`): fault-injection UI is gated on the
fault engine (M8); R15's fault half is excluded here. Legacy-browser fallbacks,
accessibility (ARIA / reduced-motion / colourblindness), and scenario lifecycle
(reset / presets / persistence) are also deferred.

## Capabilities

### New Capabilities
- `sim-ui`: the browser UI for the simulator — the holistic SVG diagram of
  hydraulics and wiring, its hydraulic/electrical visualisation derived from the
  solved primitives, item-level controls and the inspection side sheet, live
  re-solve on any change, and the non-convergence affordance.

### Modified Capabilities
<!-- None: this change only adds the UI capability. R15's fault-injection half will
     be a MODIFIED Capabilities entry on the future M8 (fault engine) change. -->

## Impact

- Affected specs: `sim-ui` (new).
- Affected code: new `sim/index.html` and `sim/src/{geometry,scene,render,controls,
  app,quasitime,units}.js`; new `sim/README.md`; new `.github/workflows/pages.yml`.
- Consumes (does not modify) the existing engine: `solveSteady`, `solveElectrical`,
  `readings.js`, and the root `system.yaml`.
- One-time manual step for the user: repo Settings -> Pages -> Source: GitHub Actions.
