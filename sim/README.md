# Irrigation System Simulator

A static, browser-based simulator of this homeowner's irrigation system — its hydraulics and its
control wiring. See `docs/sim_build_plan.md` for the full design and milestones, and `docs/Sim_spec.md`
/ `docs/sim_implementation_plan.md` for the spec.

Water pressure and flow are computed by **EPANET** (via `epanet-js`, EPANET 2.2 compiled to wasm).
In the browser the dependencies load from a CDN; the same physics modules also run headless under Node,
so the engine is testable without a browser.

## Status

**M0–M4 — done.** The headless hydraulic **and** electrical core is built and verified; the UI (M5+) is
not yet built.

- **M0 (EPANET spike):** `test/m0-smoke.mjs` hand-writes a tiny INP (reservoir → pump → valve → demand)
  exercising every EPANET feature the build relies on — CMH flow units, Darcy–Weisbach headloss, a pump
  HEAD curve, and a GPV with a headloss curve — and asserts the results are finite and sane. It locked the
  `epanet-js` API surface before the real model code was written.
- **M1 (model → network → INP → solve):** `src/model.js` normalizes the root YAMLs; `src/network.js`
  performs the edge-walk that turns the flow graph into an EPANET node/link topology (synthetic connector
  pipes for direct node→node adjacencies like manifold→zone, minor-loss folding, GPV/TCV/pump curves);
  `src/inp.js` renders INP text; `src/epanet-runner.js` wraps the `epanet-js` lifecycle.
- **M2 (pressure-driven outlets + outer solver):** `src/outlets.js` holds the rotor/spray/orifice
  discharge laws (below the lowest catalog point a table law tapers √p toward zero instead of clamping
  flat); `src/solver.js` runs the outer fixed-point demand loop (pressure-driven outlets, damped,
  with auto-valve actuation, reachability-based dead-branch handling, and a mass-balance check).
  Auto-valve actuation is asymmetric like the real diaphragm: lifting needs `min_operating_bar` (from
  `graph.yaml`) at a **filled** inlet, but once lifted the valve stays open down to a much lower
  pressure — which is also what keeps heavy states (all four zones at once) from flapping. A valve
  energised without enough inlet pressure is reported `commandedNotOpening`; as a safety net the last
  loop iterations freeze valve states (`result.valvesFrozen`) so a pathological flap still settles.
- **M3 (Z5 manual zone):** the hand-watering branch end-to-end — the `valve.manual` TCV (from its `Kv`)
  and the `nozzle.stream` open hose end, opened by a manual handle (`state.manualOpen`). The open orifice
  is modelled as an **EPANET emitter** (`q = C·√h`, the default 0.5 exponent) rather than an outer-loop
  demand, because a free hose end settles at near-atmospheric pressure where the demand fixed point
  (`q ∝ √p`, `p → 0`) turns singular; EPANET resolves the emitter directly and stably.
- **M4 (electrical):** `src/electrical.js` solves continuity/energization over the `circuit` (parts +
  wires). Controller commands route through the real wiring to decide what is powered: the adapter feeds
  the controller, the controller's `mv` energises the relay coil which closes the contact to power the
  pump, and each zone energises only through an unbroken loop down its signal lead, through its solenoid
  coil, and back along the **shared common return** — so one break in the common can drop several zones.
  `src/solver.js` actuates auto-valves and the pump from this result (`elec.zoneEnergised` / `pumpPowered`)
  instead of raw command booleans; a valve also opens if its bleed screw is opened by hand. For the
  schematic (M5), the result also classifies every wire and port into the three display states —
  `asked` (on a commanded path with faults disabled), `powered` (on a live path in the faulted solve),
  `broken` (faulted itself, or the first dead gap on an asked-but-dead path) — as `elec.wires` /
  `elec.ports`.

The physics modules in `src/` are plain ES modules with no browser dependency, so they run unchanged under
Node. In the browser the same modules will load `epanet-js` from a CDN; the YAML is parsed at the edge
(`test/yaml-node.mjs` for Node, a fetch-based loader for the browser) and passed to `buildModel` already
parsed.

## Run the tests

```sh
cd sim
npm install      # installs epanet-js + js-yaml as dev dependencies (node_modules is git-ignored)
npm run smoke    # M0: node test/m0-smoke.mjs
npm test         # M1–M4: node test/harness.mjs
```

`npm test` loads the real root YAMLs, builds the model, and solves a set of settled states, each first run
through the electrical solve and then the hydraulic loop:

- **idle** (controller off) — everything dead, all flows zero;
- **pump on + Z1** — convergence, mass balance, catalog-fidelity of every Z1 outlet, spray-regulator
  clamping at 2.76 bar, dead-branch isolation of Z2–Z5, pump operating point on the catalog curve;
- **all four zones** — the heaviest healthy state settles without valve flapping, every head discharges,
  and per-head pressure drops monotonically vs the single-zone case;
- **zone commanded with pump off** — the energised valve cannot lift and is reported
  `commandedNotOpening`;
- **pump on + Z5 manual** — the hand nozzle streams a friction-limited flow at near-atmospheric pressure,
  with the emitter flow matching the orifice law;
- **broken shared common return** — all four zones drop while the pump stays powered;
- **broken signal_2** — only zone 2 drops;
- plus electrical-only continuity spot checks (broken mains, broken adapter supply, single broken lead)
  and wire/port display-state checks (asked / powered / broken, gap attribution).

It prints a per-case outlet table and exits non-zero on any failure.
