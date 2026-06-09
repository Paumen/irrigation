# Irrigation System Simulator

A static, browser-based simulator of this homeowner's irrigation system — its hydraulics and its
control wiring. See `docs/sim_build_plan.md` for the full design and milestones, and `docs/Sim_spec.md`
/ `docs/sim_implementation_plan.md` for the spec.

Water pressure and flow are computed by **EPANET** (via `epanet-js`, EPANET 2.2 compiled to wasm).
In the browser the dependencies load from a CDN; the same physics modules also run headless under Node,
so the engine is testable without a browser.

## Status

**M0 (EPANET spike) — done.** Everything else (M1–M8) is planned but not yet built.

`test/m0-smoke.mjs` is the M0 deliverable: it hand-writes a tiny INP (reservoir → pump → valve → demand)
that exercises every EPANET feature the build relies on — CMH flow units, Darcy–Weisbach headloss, a pump
HEAD curve (the catalog pump curve), and a GPV with a headloss curve (the catalog `valve_loss` curve) —
solves it, and asserts the results are finite and physically sane. Its purpose is to lock the `epanet-js`
API surface (enum names, units, curve handling) before the real model code is written.

## Run the M0 smoke test

```sh
cd sim
npm install      # installs epanet-js as a dev dependency (node_modules is git-ignored)
npm run smoke    # node test/m0-smoke.mjs
```

It prints node pressures (bar) and link flows (m³/h) and exits non-zero on any failed assertion.
