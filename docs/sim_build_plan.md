# Build the Irrigation System Simulator

## Context

`docs/sim_spec.md` is the **requirements** (the "what"). `docs/sim_state_model.md` is the
**authoritative engine model** — the state primitives (`live`/`pressure`/`flow`), the control +
surface, the world-edge boundary states, the readings, the local valve-actuation relation, and the fault model. This file
is **the plan** (milestones, file layout, build order, status, verification) and owns the milestone
numbering. It does **not** restate the state, control, or fault vocabulary — for those, read
`sim_state_model.md`. UX/visual decisions live in `docs/sim_ui.md`.

The simulator is a browser-based model of this homeowner's irrigation system — its hydraulics *and*
its control wiring. For any combination of commands and faults it must show where water sits, at what
pressure, and where/how much leaves. It is a **static page** (no backend), with water pressure/flow
computed by **EPANET** through our own layer that feeds it the network and reads results back.

It is driven by the existing root input `system.yaml` (the former `graph.yaml` + `catalog.yaml` +
`context.yaml`, merged): the graph sections (hydraulic `flow` network + electrical `circuit` +
component `kinds`), the catalog sections (pump curve `pump.jet_curves`, valve-loss table
`valve.auto_loss`, rotor `head.rotor/nozzle`, spray `head.spray/nozzle`), and the context sections
(labels). The Python files in `tools/` are the **unrelated** diagnostic scoring engine and are not
touched.

**Decisions locked with the user:** dependencies loaded from **CDN** via importmap (no vendoring);
schematic geometry **hand-authored** in a checked-in coordinates module — **no auto-layout, no
elkjs**; UI is **vanilla JS + hand-rolled SVG/DOM** (no framework, no d3); solver runs in a
**Web Worker** per `docs/sim_ui.md`, falling back to the main thread if CDN wasm inside the
worker proves broken; hosted on **GitHub Pages**; plain ES modules, **no bundler**.

## Approach

A static `sim/` page. The hydraulic/electrical/fault **core is plain ES modules** importable by both
the browser (CDN deps) and a headless **Node test harness** (npm devDeps, `node_modules` already
git-ignored) — so the physics is provably correct before any UI exists. EPANET runs as `epanet-js`
(EPANET 2.2 wasm) in both environments.

**Core mechanism — outer fixed-point loop around EPANET.** EPANET emitters allow only one global
exponent, but each outlet obeys a different pressure→flow law. So instead, each iteration sets every
pressure-dependent outlet as a fixed EPANET *demand* computed from its own catalog law at the previous
iteration's pressure, re-solves, damps, and repeats to convergence. This reproduces the catalog tables
exactly and is "our layer feeding EPANET and reading results back." The same loop decides each
auto-valve open/closed via the **local valve-actuation relation** (defined in `sim_state_model.md`);
closed valves become closed links so dead branches stay stable. There is **one truth: the solve** —
no qualitative rule engine runs alongside it.

### Hosting / deps
- `sim/index.html` uses an **importmap** → `epanet-js`, `js-yaml` from a CDN (esm.sh/jsdelivr).
- App fetches the **existing root YAML** via a relative path (`../system.yaml`) — single source of
  truth, no copies.
- `.github/workflows/pages.yml` deploys the **whole repo** as the Pages artifact (app entry
  `sim/index.html`, so `../*.yaml` resolve). One-time manual step the user must do: repo
  **Settings → Pages → Source: GitHub Actions**. Note this in `sim/README.md`.
- `sim/package.json` (`{"type":"module"}`) + devDeps `epanet-js`, `js-yaml` for the Node harness only;
  `npm test` runs the harness. Not a browser build step.

### File layout
```
sim/
  index.html            importmap, SVG container + control panel, <script type=module src=src/app.js>
  package.json          {type:module}, devDeps, "test" script
  README.md             how to run/deploy, Pages source note
  src/
    config.js           constants: M_PER_BAR=10.197, damping ALPHA, tolerances, MAX_ITERS
    yaml-load.js        browser fetch+parse (Node loader injected separately in harness)
    model.js            raw YAML -> normalized Model (flowNodes, kinds, curves, circuit); role decides
                        which primitive (live | pressure+flow) each component carries
    network.js          Model+state -> Topology (node/link classification, minor-loss folding)
    inp.js              Topology -> EPANET INP text
    epanet-runner.js    Hydraulics: epanet-js Workspace/Project lifecycle; open/solveH/read
    outlets.js          pressure->flow laws (rotor table, spray clamp@2.76, orifice, leak)
    solver.js           OUTER fixed-point loop + local valve relation  <- core
    electrical.js       continuity/energization solver over circuit.parts+wires -> per-component live
    readings.js         derived views over the solve: open, pressurised, primed, watering, starved
    geometry.js         hand-authored coordinates: every flow node, circuit-part port pin, wire route
    scene.js            model + geometry -> static scene graph (pipe/wire paths, glyph descriptors)
    render.js           data-join SVG update from a solved result (positions never move)
    controls.js         control + fault widgets, hold UI state
    quasitime.js        semi-realistic in-time transition between settled states on a state change
    units.js            bar + m³/h formatting (no unit toggle)
    app.js              glue: load->model->hydraulics->geometry->controls; debounced re-solve
  test/
    harness.mjs         headless Node verification (npm test) — scenario cases inline
    m0-smoke.mjs        M0 EPANET spike (npm run smoke)
    yaml-node.mjs       Node-side system.yaml loader injected into the core
```

### Network translation (`network.js`)
Classify each `flow` node by `kind`:
- **Links (2-port conduits):** `hose.*`→PIPE (D=`id_mm`, len=`l_m`, roughness=`roughness_mm`);
  `swing.*`→short PIPE (D=`bore_mm`, tiny length, its `k_minor` as minor loss); `valve.auto`→**GPV** when
  open using a headloss curve from the catalog `valve.auto_loss` table (loss_bar×10.197→m), STATUS CLOSED when
  shut; `valve.manual`→**TCV** from `Kv=6.0`; `pump.jet`→**PUMP** with HEAD curve from the catalog
  `pump.jet_curves` table.
- **Nodes:** `source.well`→**RESERVOIR** at head=`h_m` (instance value); `joint`/`tee`/`manifold`→JUNCTION;
  `head.*`/`nozzle.stream`→**outlet JUNCTION** (demand-driven, no downstream); `cap`→dead-end junction.
- **Edge-walk:** every link spans from its upstream node to `to[0]`; insert a synthetic junction if two
  links would touch directly (rare here). Tees/manifold = one junction with multiple outgoing links.
- **Minor-loss folding:** EPANET puts `K` on pipes, not nodes. Fold each fitting's `k_minor` onto its
  **downstream** pipe(s); for a tee/manifold add the full `k_minor` to *each* downstream pipe (each path
  sees the fitting once). Document the different-bore approximation.
- **Options:** `UNITS CMH` (matches catalog m³/h directly), `HEADLOSS D-W` (roughness in mm). Pressure m→bar ÷10.197.

### Outer solver (`solver.js`) — `solveSteady(model, controls, elec, hyd) -> SteadyResult`
Loop (≤~60 iters), baseline = rebuild INP each iteration and re-`open()` (sub-ms):
1. **Actuate valves** from the current pressure guess + `elec` + bleed/handle, via the local
   valve relation (`sim_state_model.md`); the lift/stay hysteresis is open 1.5 / stay 1.4 bar and
   `chamberBar` is the resulting diagnostic chamber pressure. Freeze valve states for the last few iters
   to stop flapping.
2. **Set demands:** each reachable outlet `q = outletDemandAt(o, p_prev)`; unreachable (closed-valve /
   dead) → 0. Damp `q_set = q_prev + ALPHA·(q − q_prev)`, ALPHA≈0.5.
3. Render INP, `hyd.solve`, read pressures/flows.
4. Converge when max |Δp| and |Δq| over outlets below tolerance for 2 consecutive iters.
- **Regulated spray:** lookup pressure = `min(p_prev, 2.76)` (the `regulated_bar` value) → flat above clamp (fast contraction).
- **Idle / pump-off:** pump link CLOSED, all demands 0, whole downstream is a dead branch → display "—".
- **Dead branches:** zero demand + `reachable=false`; override displayed pressure to "—" (never trust
  EPANET pressure on disconnected nodes). Mass-balance assert: Σ(outlet+leak flow) ≈ pump flow.

The solve produces each component's primitives (`pressure`/`flow` on hydraulic nodes via EPANET, plus
the local-relation `chamberBar` on each valve); `electrical.js` produces `live`. The named diagnostic
views (`open`, `pressurised`, `primed`, `watering`, `starved`) are pure functions of those primitives
in `readings.js` — see `sim_state_model.md` for the model.

### Electrical (`electrical.js`) — `solveElectrical(model, commands, blocked) -> { live }`
Graph of **ports** (intra-part `to:` + inter-part wiring, bidirectional). Reusable
`reachable(graph, from, to, blocked)`. The control surface is `commands.energize` — the set of
**controller output port nodes** the operator switches on (`O1_control.controller/{pump,z2…z5}`); the
controller has no pump/zone concept, the **wiring decides** what each port actuates. A two-terminal
coil energises iff some energised port closes a loop through it against the shared `common` return
(`loopClosed`, either polarity) and the controller itself is powered. Pump path: the controller's
`pump` port closes the relay coil loop → the contact closes → pump `live` via its separate 230V
socket. Each zone valve: its port closes the valve-coil loop
`port→signal→splice→Z{N}_valve.auto/solenoid/coil→common chain→controller common`. The **shared
common return** means one break can disable several zones — falls out naturally. The result is the
**`live`** primitive per node — every node on a closed current-carrying path reads `live`, a node
merely at potential stays dead, so a single broken wire reads dead while its neighbours stay lit.

### Faults
**Removed.** `faults.js` and every fault effect-seam (`closedLinks`, `linkK`, `pumpHeadScale`,
`valveLossScale`, `valveDisabled`, `valveForcedOpen`, `bleedForcedOpen`, `outletMods`, `leaks`,
`elecBlocked`) that were threaded through `solver.js`/`network.js` have been deleted; the engine
models the healthy system only. The three-verb fault model (`dead` / `clog`·`leak` / `stuck`) still
lives in `sim_state_model.md` as design intent, but M8 now re-introduces those hooks from scratch
rather than fleshing out a stub. (`solveElectrical`'s `blocked` param is **not** a fault seam — it is
the M4 broken-wire input the harness drives directly, and stays.)

### Geometry + render (`geometry.js`, `scene.js`, `render.js`)
No auto-layout (decision superseding the earlier elkjs plan): `geometry.js` is a hand-authored,
checked-in coordinates module — an x,y for every flow node, per-port pin positions for every
circuit part, and route points for every wire — validated by a Node completeness test that fails
when anything in `system.yaml` lacks a position (or vice versa). The schematic draws **everything
in system.yaml** (per `docs/sim_ui.md`): all flow nodes, every circuit part with labelled
terminals and drawn internals (controller terminal strip, adapter winding, relay coil + contact,
the splice's 8 ports, pump motor, valve coil pins), and all 24 wires individually pin-to-pin.
Layout concept per `docs/sim_ui.md`: phone-portrait logical schematic — wiring band on top,
manifold as a vertical bar with stacked ports, each zone as its own left-to-right row ending in
its heads, Z1 manual row, Z6 cap stub, supply chain at the bottom. `scene.js` turns model +
geometry into static paths/glyphs once; `render.js` only updates stroke width (∝ |flow|), color
(red→green against the no-fault baseline, per `docs/sim_ui.md`), idle=grey/dashed, every
outlet/leak labeled with flow (m³/h everywhere, no unit toggle, per `docs/sim_ui.md`). It surfaces
each component's **readings** (`sim_state_model.md`) as labels/status, and traces the wiring from
the per-component `live` primitive.

### Controls
`controls.js` exposes the eight controls defined in `sim_state_model.md` (controller port
energize, manual handle, throttle, bonnet bleed, solenoid bleed, head shut-off, nozzle/arc) — and
**nothing else the operator sets**: the world-edge states (mains, well, prime) are pinned to their
healthy default and are not control widgets (their loss is a fault, see M8). Any change → debounced
`electrical → solveSteady → renderScene`. The quasi-time module (`quasitime.js`) animates the change between states:
on a state change, flow (and possibly other quantities) transition semi-realistically over time from
the previous settled result to the new one, rather than snapping instantly. Both endpoints are full
`solveSteady` results and the transition is an in-view animation, not a separate mode (consistent
with `docs/sim_ui.md`'s no-mode-switching rule).

## Execution status

The physics core has been built and merged to `main`; the table below is the live state
(✅ done / ⚠️ partial / ⬜ not started). The healthy-system engine (M1–M4) and the readings facade
already follow `sim_state_model.md` (`live`/`pressure`/`flow` + readings, the local valve relation,
no qualitative rule layer). The geometry/UI (M5–M6), quasi-time (M7), the fault engine (M8), and polish (M9) remain to do.

| Milestone | Status | Evidence in `sim/` |
|---|---|---|
| **M0** Spike | ✅ | `test/m0-smoke.mjs` (`npm run smoke`) |
| **M1** model/network/inp/runner | ✅ | `src/model.js`, `network.js`, `inp.js`, `epanet-runner.js` |
| **M2** outlets + outer solver + readings | ✅ | `src/outlets.js`, `solver.js`, `readings.js`; harness cases *idle* + *pump+Z2* |
| **M3** Z1 manual zone | ⚠️ | engine support present (`valve-manual` TCV in `network.js`, `manualOpen` in `solver.js`, stream-orifice law `streamEmitterCoeff` in `outlets.js`); **no dedicated harness case yet** |
| **M4** electrical + actuation | ✅ | `src/electrical.js`; harness cases *broken shared return* + *cut controller feed* |
| **M5** geometry/scene/render | ⬜ | none of `geometry.js`/`scene.js`/`render.js` exist |
| **M6** controls + worker + app | ⬜ | none of `controls.js`/`app.js`/`index.html` exist |
| **M7** quasi-time | ⬜ | `quasitime.js` absent |
| **M8** faults | ⬜ | not started — `src/faults.js` and the solver/network fault seams were **removed**; M8 re-introduces the three-verb compiler and the hooks from scratch |
| **M9** polish + Pages | ⬜ | no `.github/workflows/pages.yml`, no `sim/README.md` |

Verify the current core with `cd sim && npm install && npm test` (full harness) or `npm run smoke` (M0 spike).

## Build order

Build in milestone order; each milestone after M2 is gated by the Node harness. Deliverables are
the design sections above + the file layout; the unique per-milestone notes:

- **M2** readings are pure functions over the converged solve (threshold/location over
  `pressure`/`flow`) — no separate solve, no stored state, no qualitative rule layer.
- **M3** is mostly verification + tuning: the `valve.manual` TCV, `nozzle.stream` orifice law, and
  `manualOpen` plumbing already exist from M1–M2; add a harness case (pump + Z1 → orifice flow, mass balance).
- **M8** also adds the suction-side world-edge states the EPANET reservoir omits — `source.well`
  `pressure` and pump priming-chamber `pressure`. These are **not** operator controls: they sit at
  their healthy default (wet, primed) and move only under a fault (dry-well, lost-prime), feeding the
  `primed` reading and gating the pump. *Required harness case — metering-port clog (stuck-open valve):*
  pump on, **all** solenoids de-energised, **bleed screw closed**; `clog(meteringPort)` raises
  `R_meter` so the chamber can't refill, the pilot stays vented (`rVent < rMeter`), and the valve
  passes flow uncommanded. Assert Z2 ~1.66 m³/h, rotor `watering`, mass balance holds, `chamberBar`
  tracks the low chamber pressure.
- **M9** polish: `live` wiring-trace styling, labels, the non-convergence affordance (keep-last-good +
  a "won't settle" badge off the `converged` flag, `docs/sim_ui.md`), max-pressure warnings;
  `.github/workflows/pages.yml` + `sim/README.md`.

## Requirement → milestone traceability

Requirements are the bullets of `docs/sim_spec.md` (States / Logic / UI). The build steps here and in
`sim_state_model.md` are the *how*, not requirements.

| # | Requirement (sim_spec.md) | Milestone |
|---|---|---|
| **States** | | |
| R1 | One state at a time = controller commands + position of every manual control + any faults | M2–M4 + M8 (input state); per-component primitives/readings derived from the solve |
| R2 | Pump running/off; each valve & head outlet open/closed, in any combination | M2 + M3 (Z1 manual) + M4 |
| R3 | Electrical circuit to pump and each solenoid is intact or broken | M4 |
| R4 | Any element healthy or faulted — hydraulic (clog, leak, weak pump) or electrical (no signal, broken wire, dead solenoid) | M8 |
| **Logic** | | |
| R5 | For any state, compute physically realistic pressure & flow throughout the network | M1 + M2 |
| R6 | How much each open outlet releases depends on the pressure reaching it | M2 + M3 (Z1 orifice) |
| R7 | Valve opens when solenoid energised through healthy wiring or manual bleed opened; pump runs only when commanded through healthy wiring | M4 |
| R8 | Opening/closing valves redistributes pressure & flow across the whole system | M2 |
| R9 | A fault behaves realistically (clog restricts, leak escapes, weak pump less, electrical fault stops actuation) | M8 |
| R10 | Water leaves only through open outlets and leaks; total outflow = what the pump supplies | M2 (balance) + M8 (leaks) |
| **UI** | | |
| R11 | System shown as a diagram | M5 |
| R12 | Control wiring shown: commanded on / energised / where a path is broken | M5 (from `live`, computed M4) |
| R13 | Pressure & flow shown wherever they occur; filled parts distinguished from empty | M5 |
| R14 | Every point where water leaves shown, with how much | M5 |
| R15 | User can command every control (pump, valves, head flo-stop, valve flow control) and inject faults | M6 (controls) + M8 (fault injection) |
| R16 | The view updates live as the state changes | M6 |

The per-component **readings** (`open`/`pressurised`/`primed`/`watering`/`starved`) the UI labels are
pure views over the solved primitives — defined in `sim_state_model.md`, not a separate requirement.

## Risks
- **CDN wasm locate:** if `epanet-js` can't find its `.wasm` via esm.sh in-browser, vendor just the
  `.wasm` (single file) and point the loader at it; keep CDN otherwise (M0 verifies in-browser too).
- **Fixed-point oscillation / valve flapping:** damping + hysteresis + freeze-near-convergence; fallback
  = toggle one valve per iter.
- **Dead-branch false pressures / EPANET disconnection warnings:** zero-demand + display override rule.
- **GPV headloss-curve units / minor-loss folding:** validate pump operating point against the curve in M1/M2.
- **Shared common-return semantics:** explicitly covered by the broken-shared-return harness case.

## Verification
- **Headless (primary):** `cd sim && npm install && npm test` runs `test/harness.mjs`, asserting the
  **solved primitives and readings** directly against hand-checked scenarios (one truth, nothing to
  reconcile). Cases built today: (1) *idle* — all flows 0, every outlet unreachable; (2) *pump+Z2* —
  pump `primed`, Z2 open, head flows match catalog and read `watering`+`pressurised`, Z3–Z5 = 0 (dead
  branch), mass balance < 1e-3 m³/h, operating point on the pump curve, MP clamped at 2.76 bar;
  (3) *broken shared return* — Z2/Z3 coils read dead so those valves stay closed, Z4/Z5 stay `live`;
  (4) *cut controller feed* — controller/pump/zones all dead. **Pending:** the M3 manual-zone case and
  the M8 clog/leak cases (incl. the metering-port-clog stuck-open case, specified under M8). Exit nonzero on failure.
- **Browser:** serve with `python -m http.server` from repo root, open `/sim/`; exercise pump/zones,
  inject a clog/leak/broken wire from the component bottom sheets, confirm the single live schematic
  (flow widths, pressure colors, outlet labels in m³/h, per-wire `live` traces). Confirm Pages deploy after push.
