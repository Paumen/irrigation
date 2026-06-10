# Irrigation System Simulator

A static, browser-based simulator of this homeowner's irrigation system — its hydraulics and its
control wiring. See `docs/sim_build_plan.md` for the full design and milestones, and `docs/Sim_spec.md`
/ `docs/sim_implementation_plan.md` for the spec.

Water pressure and flow are computed by **EPANET** (via `epanet-js`, EPANET 2.2 compiled to wasm).
In the browser the dependencies load from a CDN; the same physics modules also run headless under Node,
so the engine is testable without a browser.

## Status

**M0–M8 — done.** The headless hydraulic **and** electrical core is built and verified, the schematic
renders in the browser, a live control panel drives it, a quasi-time footer steps through sequences of
settled states (M7), and every part-by-part failure from `graph.yaml` can be injected (M8); M9 (polish
+ Pages workflow refinements) remains.

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
  `elkjs`) and render the solved state; `renderState()` is the synchronous solve-and-paint entry point.
- **M6 (controls + live updates):** `src/controls.js` builds the control panel — every user-commandable
  control of spec R15 except M8's fault toggles: pump + per-zone controller commands, the Z5 manual
  handle, a **flow-control screw** (0–100% slider) and **bleed screw** per auto valve, a **flo-stop**
  per rotor head, and the m³/h ↔ L/min display toggle (always visible in the header). The panel is
  **per-equipment**: clicking a part in the schematic (pump, valve, head, nozzle glyphs — padded
  invisible hit areas for touch — or the controller / pump / valve boxes in the wiring band)
  highlights it and slides up a **bottom sheet** with just that part's controls (full-width on phones,
  a docked card on wide screens; ✕, a click on empty schematic, or Escape dismisses it); parts without
  controls get an info line. `panelFor()` (which widgets a clicked part
  exposes, each addressing its UI-state slot by path), `controlSpec()` (which controls exist), and the
  UI state (`initialUiState()`, which **is** the solver input shape `{ commands, state, lmin }`) are
  pure and harness-gated; only the DOM half is browser-only. Any
  change re-solves after a short debounce (slider drags coalesce into one solve) and repaints via the
  M5 data-join (R16); the units toggle only repaints the cached result. Two controls grew physics in
  the core: a closed **flo-stop** (`state.floStop`) zeroes that head's discharge while the branch stays
  filled (pressure still displays), and the **flow-control** screw (`state.throttle`, opening fraction
  t) scales the valve's effective Kv to t·Kv — `network.js` emits a per-valve GPV curve with the
  catalog loss scaled by 1/t², and a seated screw (t ≤ `THROTTLE_MIN`) holds the valve shut
  mechanically (reported `commandedNotOpening` when energised). The status line summarises each solve
  (pump flow → outlet flow, iterations, any valve commanded-but-not-opening).
- **M7 (quasi-time):** `src/quasitime.js` — a **time-ordered sequence of command-states**, each solved
  as a settled steady state. The pure half (time-sorted transitions, one per timestamp, `entryIndexAt`,
  deep `snapshotUi` copies of the solver inputs) is harness-gated; the DOM half is a footer strip with
  a time cursor: **every control change is recorded automatically as the transition at the cursor's
  time** (consecutive changes at one position collapse into the final state — no capture button).
  Drag the cursor and change controls to place transitions; scrub / step (⏮ ⏭) / play (▶) shows the
  settled state in effect at each time (solved once, cached; before the first transition the initial
  idle state shows) and **checks it out into the live controls**, so edits made while scrubbed back
  build on that state. Time is the user's axis: turning the pump on, dragging to t=5 s and opening a
  zone reproduces the controller's pump lead without hard-coding it.
- **M8 (faults):** `src/faults.js` — the toggle list is **every `fail:` entry in `graph.yaml`**
  (simple kinds per node, compound kinds per sub-part, circuit parts per port; ~400 faults), surfaced
  in each equipment's panel and in a master **"⚠ faults"** sheet (header button, grouped by part).
  A grouped **(role × failtype)** dispatch table compiles the active set into solver/network
  mutations — clogs carry a 0–1 severity (partial → sharp-orifice minor loss `K=(1/a²−1)²`, full →
  sealed link / dead pump; a clogged valve **seat** instead scales the valve's loss curve by 1/a²,
  because EPANET ignores minor losses on GPVs, and a fully packed seat reports
  commanded-but-not-opening), structural breaks become representative **leak emitters** at the nearest
  real junction (a suction-side break instead costs the pump its prime), pump-path clogs scale the
  head curve, valve faults pin the diaphragm open (torn diaphragm, vented chamber, clogged metering
  port) or shut (jammed pilot, seated flow-control), a broken coil becomes an electrical cut, and
  outlet faults rewrite the discharge law (wrong nozzle = swapped catalog row, broken spray regulator
  = no 2.76 bar clamp, flush plug = open orifice) — plus a `SPECIAL` map for the handful of
  part-specific cases. Circuit faults block their port in the electrical solve and display through the
  existing asked/powered/broken wire states; hydraulic faults wear a red **✕** on the schematic and
  active leaks show a red drop labelled with the escaping flow (counted in the mass balance). Starved
  table outlets (e.g. behind a nearly-sealed clog) hand off to an EPANET emitter below their lowest
  catalog point — the demand fixed point is singular as p → 0 — and all fed-back quantities use
  per-quantity adaptive damping (step halves on each sign flip), so even extreme severities settle.

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
npm test         # M1–M8: node test/harness.mjs
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
- **Z1 with a rotor flo-stop closed** — the head stays filled (pressure displays) but discharges
  nothing, the rest of the zone re-balances;
- **Z1 with the valve flow control at 40% / fully seated** — throttled: every head still discharges at
  lower pressure and the valve's headloss matches the catalog law scaled by 1/t²; seated: the valve is
  held shut and reported `commandedNotOpening`;
- plus electrical-only continuity spot checks (broken mains, broken adapter supply, single broken lead)
  and wire/port display-state checks (asked / powered / broken, gap attribution);
- **M5 layout** — every flow node placed in-canvas, hoses routed as polylines, left-to-right ordering,
  zone clustering, the circuit band below the hydraulics, deterministic coordinates;
- **M5 scene** — color/width scale pins, idle = all grey/dashed with "—" labels, pump+Z1 = bold colored
  Z1 pipes with catalog-matching labels and the closed-valve half-edge dead, wiring states
  (broken `signal_2` shown broken, the rest powered), and geometry identical across states (positions
  never move; only visual attributes change);
- **M6 control spec** — the pure half of the control panel: one flow-control + bleed per auto valve,
  zones derived from the valves, the Z5 handle, a flo-stop per rotor head, the initial UI state
  (everything off, flow controls factory-open, every fault healthy) feeding the solvers directly and
  settling to idle, and the per-equipment panels (controller / pump / valves / heads) with every
  widget path addressing a slot the initial UI state created;
- **M8 fault cases** — a fully clogged hose seals its branch (heads dry, still converges), an 80% clog
  restricts (everything discharges less), a 60% valve-seat clog throttles progressively (headloss
  matches the catalog curve scaled by 1/a²) while a fully packed seat shows commanded-but-not-opening
  with the branch dry, a burst hose leaks at its downstream junction (heads keep
  running at lower pressure, leak counted in the mass balance and total outflow), a broken solenoid
  coil drops exactly its zone, a stuck-open bleed screw runs the zone with no controller command, a
  half-clogged impeller weakens the whole system, a broken pump motor stops everything despite healthy
  wiring, and a broken spray regulator follows the raw nozzle table above 2.76 bar;
- **M8 fault model (pure)** — the fault list enumerates every `fail:` entry uniquely (the pump motor,
  defined on both the hydraulic and circuit sides, is one fault), clogs carry severities, and the
  dispatch table emits the right effects (sealed vs restricted links, leaks at the right junction,
  lost prime from suction-side breaks, electrical cuts, nozzle-row swaps, unknown keys throw);
- **M8 scene** — faulted elements wear an ✕ (nodes and hose polylines), active leaks are marked with
  their flow, healthy scenes carry neither;
- **M7 quasi-time** — transitions stay time-sorted (recording at an existing time replaces that
  transition), `entryIndexAt` picks the state in effect, snapshots are deep copies, and a pump-lead
  sequence (pump at t=0, zone 1 at t=5, all-off at t=300) shows the pump dead-heading at shutoff
  pressure between transitions, the zone watering once its transition takes effect, and idle after
  the shutdown.

It prints a per-case outlet table and exits non-zero on any failure.
