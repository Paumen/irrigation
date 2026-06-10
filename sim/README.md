# Irrigation System Simulator

A static, browser-based simulator of this homeowner's irrigation system — its hydraulics and its
control wiring. See `docs/sim_build_plan.md` for the full design and milestones, and `docs/Sim_spec.md`
/ `docs/sim_implementation_plan.md` for the spec.

Water pressure and flow are computed by **EPANET** (via `epanet-js`, EPANET 2.2 compiled to wasm).
In the browser the dependencies load from a CDN; the same physics modules also run headless under Node,
so the engine is testable without a browser.

## Status

**M0–M5 — done.** The headless hydraulic **and** electrical core is built and verified, and the static
schematic renders in the browser; controls/live updates (M6+) are not yet built.

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
- **M5 (static schematic):** `src/layout.js` lays the hydraulics out with **elkjs** (layered,
  left-to-right, each `Zn.` zone clustered in its own frame) — computed **once** at startup, since
  coordinates depend only on the static graph. Hoses and swing joints become the drawn edges whose
  stroke encodes flow; pump and valves (EPANET *links*) are drawn as glyphs because they carry
  displayable state. The control circuit is **not** auto-laid-out: `src/circuit-layout.js` is a fixed,
  hand-drawn wiring diagram (mains row Grid socket → Relay → Pump, the 24 VAC adapter feeding the
  controller, zone runs through **field-splice dots** to the solenoids, the shared common chained down
  a bus back to C2), validated loudly against `graph.yaml`'s wires at startup so the model and the
  drawing cannot drift apart. Conductors are colored by **function** (230 V live / neutral / earth /
  24 VAC) with the live state layered on top (solid = powered, faded = off, dashed = asked-but-dead,
  red dashed = broken). `src/scene.js` is the pure half of rendering: solved results + layout →
  primitives with every visual attribute computed (stroke width ∝ |flow|, color ∝ pressure
  blue→green→red, unfilled branches grey/dashed with pressures shown as "—", every outlet labeled with
  its discharge in m³/h or L/min) — this half is what the Node harness gates. `src/render.js` applies
  a scene to SVG with a vanilla keyed data-join: geometry is set once, updates only touch visual
  attributes. `index.html` + `src/app.js` boot the page (CDN importmap → `epanet-js`, `js-yaml`,
  `elkjs`) and render one representative state (pump on + zone 1); `renderState()` is the hook M6's
  controls will drive.

The physics modules in `src/` are plain ES modules with no browser dependency, so they run unchanged under
Node. In the browser the same modules load `epanet-js` from a CDN; the YAML is parsed at the edge
(`test/yaml-node.mjs` for Node, `src/yaml-load.js` fetches the repo-root YAMLs in the browser) and passed
to `buildModel` already parsed.

## Run it

Headless tests:

```sh
cd sim
npm install      # installs epanet-js + js-yaml + elkjs as dev dependencies (node_modules is git-ignored)
npm run smoke    # M0: node test/m0-smoke.mjs
npm test         # M1–M5: node test/harness.mjs
```

Browser (the page fetches `../graph.yaml` etc., so serve from the **repo root**):

```sh
python3 -m http.server 8000   # from the repo root
# open http://localhost:8000/sim/
```

## Deploy (GitHub Pages)

`.github/workflows/pages.yml` deploys the **whole repo** as the Pages artifact on every push to
`main` (so `sim/index.html` can fetch the root YAMLs at `../graph.yaml` etc.). The sim is then at
`https://paumen.github.io/irrigation/sim/`. Requires repo **Settings → Pages → Source: GitHub
Actions** — a one-time manual step, already enabled on this repo.

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
  and wire/port display-state checks (asked / powered / broken, gap attribution);
- **M5 layout** — every flow node placed in-canvas, hoses routed as polylines, left-to-right ordering,
  zone clustering, the circuit band below the hydraulics, deterministic coordinates;
- **M5 scene** — color/width scale pins, idle = all grey/dashed with "—" labels, pump+Z1 = bold colored
  Z1 pipes with catalog-matching labels and the closed-valve half-edge dead, wiring states
  (broken `signal_2` shown broken, the rest powered), and geometry identical across states (positions
  never move; only visual attributes change).

It prints a per-case outlet table and exits non-zero on any failure.
