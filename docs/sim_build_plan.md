# Build the Irrigation System Simulator

## Context

`docs/Sim_spec.md` (high-level) and `docs/sim_implementation_plan.md` (build spec) describe a
browser-based simulator of this homeowner's irrigation system — its hydraulics *and* its control
wiring. For any combination of commands and faults it must show where water sits, at what pressure,
and where/how much leaves. It is a **static page** (no backend), with water pressure/flow computed by
**EPANET** through our own layer that feeds it the network and reads results back.

Nothing of this simulator exists yet. The Python files in `tools/` are the **unrelated** diagnostic
scoring engine and are not touched. The simulator is a new `sim/` folder driven by the existing
root input `system.yaml` (the former `graph.yaml` + `catalog.yaml` + `context.yaml`, merged):
the graph sections (hydraulic `flow` network + electrical `circuit` + component `kinds`/`fail:`
lists), the catalog sections (pump curve `pump.jet_curves`, valve-loss table `valve.auto_loss`, rotor
`head.rotor/nozzle`, spray `head.spray/nozzle`),
and the context sections (labels).

**Decisions locked with the user:** dependencies loaded from **CDN** via importmap (no vendoring);
schematic geometry **hand-authored** in a checked-in coordinates module — **no auto-layout, no
elkjs**; UI is **vanilla JS + hand-rolled SVG/DOM** (no framework, no d3); solver runs in a
**Web Worker** per `docs/Sim_ui.md` §12, falling back to the main thread if CDN wasm inside the
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
exactly and is "our layer feeding EPANET and reading results back." The same loop decides auto-valve
open/closed (open iff energised-through-good-wiring **or** bleed open, **and** inlet ≥ `min_bar`
1.5, **and** no disabling fault); closed valves become closed links so dead branches stay stable.

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
    model.js            raw YAML -> normalized Model (flowNodes, kinds, curves, circuit), role per kind
    network.js          Model+state -> Topology (node/link classification, minor-loss folding)
    inp.js              Topology -> EPANET INP text
    epanet-runner.js    Hydraulics: epanet-js Workspace/Project lifecycle; open/solveH/read
    outlets.js          pressure->flow laws (rotor table, spray clamp@2.76, orifice, leak)
    solver.js           OUTER fixed-point loop  <- core
    electrical.js       continuity/energization solver over circuit.parts+wires
    faults.js           grouped (role x failtype) fault-effect model + specials
    states.js           qualitative state projection/evaluator (system.yaml `states:`) + cross-check
    geometry.js         hand-authored coordinates: every flow node, circuit-part port pin, wire route
    scene.js            model + geometry -> static scene graph (pipe/wire paths, glyph descriptors)
    render.js           data-join SVG update from a solved result (positions never move)
    controls.js         control + fault widgets, hold UI state
    quasitime.js        time-ordered command-states played along a timeline
    units.js            bar + m³/h formatting (no unit toggle)
    app.js              glue: load->model->hydraulics->geometry->controls; debounced re-solve
  test/
    harness.mjs         headless Node verification (npm test) — cases inline, not a separate cases.mjs
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

### Outer solver (`solver.js`) — `solveSteady(model, state, elec, hyd, faults) -> SteadyResult`
Loop (≤~60 iters), baseline = rebuild INP each iteration and re-`open()` (sub-ms):
1. **Actuate valves** from current pressure guess + `elec` + bleed/handle + faults; record
   `commandedNotOpening` when energised/bleed but inlet < 1.5 bar. Hysteresis (open 1.5 / stay 1.4) +
   freeze valve states for the last few iters to stop flapping.
2. **Set demands:** each reachable outlet `q = outletDemandAt(o, p_prev)`; unreachable (closed-valve /
   dead) → 0. Damp `q_set = q_prev + ALPHA·(q − q_prev)`, ALPHA≈0.5.
3. Render INP, `hyd.solve`, read pressures/flows.
4. Converge when max |Δp| and |Δq| over outlets below tolerance for 2 consecutive iters.
- **Regulated spray:** lookup pressure = `min(p_prev, 2.76)` (the `regulated_bar` value) → flat above clamp (fast contraction).
- **Idle / pump-off:** pump link CLOSED, all demands 0, whole downstream is a dead branch → display "—".
- **Dead branches:** zero demand + flag `filled=false`; override displayed pressure to "—" (never trust
  EPANET pressure on disconnected nodes). Mass-balance assert: Σ(outlet+leak flow) ≈ pump flow.

### Electrical (`electrical.js`) — `solveElectrical(circuit, commands, faults) -> ElecResult`
Graph of **ports** (intra-part `to:` + inter-part `wires`, bidirectional). `acts:` are control relations,
not continuity. Reusable `reachable(graph, from, to, blocked)`. Fixpoint (relay contact closes when its
coil loop energises): controller `mv`→relay coil loop→contact closes→`pumpPowered` via
grid→line_in→contact→load_out→pump→neutral. Each zone N: `zoneCmd[N]` AND continuity
`zone_N→signal_N→splice.sig_N→ZN.valve.coil→common_lead→com chain→common_return→controller`. The
**shared common return** means one break can disable several zones — falls out naturally. Per-wire
display state (superseding the earlier asked/powered/broken trichotomy, per `docs/Sim_ui.md` §5):
`solveElectrical` returns `energisedWires`, the set of wires on a closed current-carrying path —
wires merely at potential stay unlit.

### Faults (`faults.js`)
Toggle list = every `fail:` in `system.yaml` (`kinds.*.parts.*.fail` + `circuit.parts.*.*.fail`), keyed
`<node>.<subpart>:<failtype>`. A small **(role × failtype) dispatch table** (~15 cells) emits mutations:
`hydMutations` (addKMinor / closeLink / scalePumpHead / disableValve), `leaks` (orifice outlets),
`outletMods` (nozzle/arc override, flowScale, zeroFlow), `elecCuts` (ports → `blocked`). A `SPECIAL`
map overrides a handful (e.g. `bleed_screw:misconfigured`=stuck-open forces valve open;
`priming_cap:misconfigured`=pump loses prime; `nozzle/arc:misconfigured`=swap table row). Clogs take a
0..1 severity (partial→addK, full→closeLink); structural breaks default to a representative orifice.

### Qualitative state layer (`states.js`)
`system.yaml` declares, per component **kind**, named **states** with `needs`/`needs_any` preconditions:
`source.well` wet/dry, the live/dead wiring chain (`source.socket` → controller transformer/terminals →
`relay.pumpstart` coil/load → `valve.auto/solenoid/coil`), `pump.jet` primed/unprimed & pressurised/
unpressurised, every downstream component pressurised/unpressurised, `valve.auto`'s open/closed plus its
diaphragm / bonnet-chamber / pilot_seat / plunger mechanism, `valve.manual` open/closed, and `head.rotor`
watering/off. These are a **derived view, not solver inputs:** the EPANET solve + `solveElectrical` stay
the physics authority; `states.js` **projects** each component's label from the existing results, evaluates
the remaining qualitative rules, and **cross-checks** the two wherever both exist. Three buckets by origin:
- **Grounded by the solve (project, no new physics):** electrical `live/dead` = `solveElectrical`
  reachability (`energisedWires` / `pumpPowered` / per-zone coil energization); `valve.* open/closed` =
  solver `valveOpen` / `manualOpen` / `bleedOpen`; `*.pressurised` = EPANET node pressure over a threshold
  **and** `reachable`; `head.* watering` = outlet demand > 0.
- **New physics — suction wet/dry + prime:** the well is an EPANET RESERVOIR (always available), so wet/dry
  and pump prime are absent from the hydraulic solve. Add `source.well` wet/dry as an environment condition
  (toggle alongside faults), propagate wet/dry up the suction chain with the existing `reachable()` helper,
  and gate the pump (dry / unprimed → it cannot pressurise). `pump.jet = primed` iff suction water reaches
  `body/priming_chamber` **and** no `priming_cap:misconfigured` fault (the existing lost-prime SPECIAL).
- **Qualitative-only (rule-evaluate):** the intermediate valve mechanism (diaphragm up/down, bonnet/chamber,
  pilot_seat, plunger) that the numeric loop intentionally collapses — derived purely by evaluating the yaml
  `needs`/`needs_any` to a fixpoint from the grounded leaf + electrical + pressure states.

**Kind→instance resolution:** states are declared per kind but the graph has per-instance nodes
(`Z2_valve.auto`, `Z3_valve.auto`, …), so a bare reference (`"valve.auto = open"`,
`"pump.jet = pressurised"`) resolves **nearest-scope first**: (1) the *same component instance* for its
own sub-states (`diaphragm`, `bonnet/chamber`, `solenoid/coil`); (2) an instance sharing the referencing
node's prefix/scope — covers zone-local refs (`valve.auto`, the in-zone joints) and per-prefix duplicates
like `source.socket` (`S2_relay.pumpstart` → `S2_source.socket`, `O1_control.controller` →
`O1_source.socket`); (3) the **unique system-wide instance** for kinds that appear exactly once, which is
how cross-prefix references resolve — `S1_pump.jet` → `S2_relay.pumpstart`, `S2_relay.pumpstart` →
`O1_control.controller`, and every `Z*_valve.auto` → `O1_control.controller`. `states.js` owns that
resolver; a build-time check fails on any reference left ambiguous (multiple in-scope candidates) or
unresolved (none). Output is a per-instance **state vector**
consumed by `render.js` for labels and by the harness as cross-check assertions (rule-derived
`valve.auto = open` ⇔ solver `valveOpen`, etc.). `model.js` must stop dropping the `states:` blocks.

### Geometry + render (`geometry.js`, `scene.js`, `render.js`)
No auto-layout (decision superseding the earlier elkjs plan): `geometry.js` is a hand-authored,
checked-in coordinates module — an x,y for every flow node, per-port pin positions for every
circuit part, and route points for every wire — validated by a Node completeness test that fails
when anything in `system.yaml` lacks a position (or vice versa). The schematic draws **everything
in system.yaml** (per `docs/Sim_ui.md` §14): all flow nodes, every circuit part with labelled
terminals and drawn internals (controller terminal strip, adapter winding, relay coil + contact,
the splice's 8 ports, pump motor, valve coil pins), and all 24 wires individually pin-to-pin.
Layout concept per `docs/Sim_ui.md` §15: phone-portrait logical schematic — wiring band on top,
manifold as a vertical bar with stacked ports, each zone as its own left-to-right row ending in
its heads, Z1 manual row, Z6 cap stub, supply chain at the bottom. `scene.js` turns model +
geometry into static paths/glyphs once; `render.js` only updates stroke width (∝ |flow|), color
(red→green against the no-fault baseline, per `docs/Sim_ui.md` §3), idle=grey/dashed, every
outlet/leak labeled with flow (m³/h everywhere, no unit toggle, per `docs/Sim_ui.md` §2), wiring
particle-traced from `energisedWires`.

### Controls
`controls.js`: pump on/off; per-zone controller command; auto-valve flow-control throttle (0..1); rotor
flo-stop; valve bleed screw; Z1 manual handle; grid/adapter plug toggles; fault toggles. Any change →
debounced `electrical → compile faults → solveSteady → renderScene`. The quasi-time module
(`quasitime.js`) plays a time-ordered sequence of command-states along a timeline — each frame is a
fully settled `solveSteady` result, scrubbed **within** the single live view (a timeline scrubber, not
a separate mode, so it stays compatible with `docs/Sim_ui.md` §1's no-mode-switching rule).

## Execution status

The plan was originally written to land **M0 only** and grow from there. The physics core has since
been built and merged to `main`; the table below is the live state (✅ done / ⚠️ partial / ⬜ not started).
The UI (M5–M7, M9), the fault engine (M8), and the qualitative state layer (M10) remain to do.

| Milestone | Status | Evidence in `sim/` |
|---|---|---|
| **M0** Spike | ✅ | `test/m0-smoke.mjs` (`npm run smoke`) |
| **M1** model/network/inp/runner | ✅ | `src/model.js`, `network.js`, `inp.js`, `epanet-runner.js` |
| **M2** outlets + outer solver | ✅ | `src/outlets.js`, `solver.js`; harness cases *idle* + *pump+Z2* |
| **M3** Z1 manual zone | ⚠️ | engine support present (`valve-manual` TCV in `network.js`, `manualOpen` in `solver.js`, stream-orifice law `streamEmitterCoeff` in `outlets.js`); **no dedicated harness case yet** |
| **M4** electrical + actuation | ✅ | `src/electrical.js`; harness cases *broken shared return* + *cut controller feed* |
| **M5** geometry/scene/render | ⬜ | none of `geometry.js`/`scene.js`/`render.js` exist |
| **M6** controls + worker + app | ⬜ | none of `controls.js`/`app.js`/`index.html` exist |
| **M7** quasi-time | ⬜ | `quasitime.js` absent |
| **M8** faults | ⬜ | `src/faults.js` is a **stub** — `compileFaults` returns `emptyEffects()` only; the (role × failtype) table, `listFaults`, leaks, and SPECIALs are unbuilt |
| **M9** polish + Pages | ⬜ | no `.github/workflows/pages.yml`, no `sim/README.md` |
| **M10** qualitative state layer | ⬜ | `states.js` absent; `model.js` still drops the `states:` blocks |

Verify the current core with `cd sim && npm install && npm test` (full harness) or `npm run smoke` (M0 spike).

**M0 deliverable (done), for reference:** `sim/package.json` (`{"type":"module"}`, devDep `epanet-js`), and
`sim/test/m0-smoke.mjs` — a headless Node script that hand-writes a tiny INP (reservoir → pump → one
junction with a demand, D-W headloss, CMH units, a pump HEAD curve, and one GPV with a headloss curve),
runs it through epanet-js (`Workspace`/`Project`, `open`/`solveH`), reads back node pressure (→bar) and
link flow, and asserts they're finite/sane. Purpose: lock the epanet-js API surface (exact enum names,
CMH unit support, D-W, pump curve, GPV) before M1. Prints the results table and exits nonzero on failure.

## Build order (each milestone after M2 gated by the Node harness)
- **M0 Spike:** Node smoke test — hand-written 3-node INP (reservoir-pump-junction-demand); lock
  epanet-js enums (`NodeProperty.Pressure`, `LinkProperty.Flow`), CMH units, D-W, pump HEAD curve, GPV.
- **M1:** `model.js`, `network.js`, `inp.js`, `epanet-runner.js`; validate one healthy zone vs pump curve.
- **M2:** `outlets.js`, `solver.js`; idle + pump+Z2 converge with correct mass balance; `harness.mjs` cases 1–2.
  *States here:* the `pressurised/unpressurised` and head `watering/off` labels are a threshold over the
  converged EPANET pressures/demands — projected directly, no new solve (formalized in M10).
- **M3 (Z1 manual zone):** the manual hand-watering branch end-to-end — `valve.manual` TCV from `Kv`,
  `nozzle.stream` open-orifice discharge, manual-handle open/close in the state model; harness case
  (pump + Z5 open → orifice flow, mass balance). Mechanical only, no electrical dependency; the TCV,
  orifice law, and `manualOpen` plumbing already exist from M1–M2, so this is mostly verification + tuning.
- **M4:** `electrical.js` + valve actuation in the loop; harness case (broken wire / shared return).
  *States here:* the live/dead wiring states (`source.socket` → controller → relay coil/load →
  solenoid coil) and `valve.* open/closed` are the `solveElectrical` reachability + solver `valveOpen`
  results relabeled per the yaml nodes — projected in M10.
- **M5:** `geometry.js` (hand-authored coordinates + Node completeness test) + `scene.js` +
  `render.js` — static schematic with flow/pressure encoding, full system.yaml coverage
  (`docs/Sim_ui.md` §13–§15).
- **M6:** `controls.js` + bottom sheet (per-subpart sections, `docs/Sim_ui.md` §8–§11) +
  worker solver client (`docs/Sim_ui.md` §12) + `app.js` wiring (live update, m³/h fixed — no
  units toggle); pump, zones, Z1 manual handle, rotor flo-stop, valve flow-control, plug toggles.
- **M7 (quasi-time):** `quasitime.js` — a time-ordered sequence of settled command-states scrubbed
  along a timeline within the single live view; each frame re-uses the `solveSteady` path (a scrubber,
  not a mode switch).
- **M8 (faults):** `faults.js` grouped (role × failtype) table + specials; harness clog case + a leak
  case; fault toggle widgets wired into `controls.js`/`render.js`.
  *States here:* adds the suction-side physics the EPANET reservoir omits — `source.well` wet/dry as an
  injectable condition, wet/dry propagation up the suction chain via `reachable()`, and `pump.jet` prime
  gating (unprimed → no pressurise); `priming_cap:misconfigured` already supplies the lost-prime path.
- **M9:** polish — `energisedWires` trace styling, labels, `commandedNotOpening`,
  max-pressure warnings, the keep-last-good solver-failure badge (`docs/Sim_ui.md` §12);
  `.github/workflows/pages.yml` + `sim/README.md`.
- **M10 (qualitative state layer):** `states.js` — read the `system.yaml` `states:` blocks (`model.js`
  drops them today), the kind→instance reference resolver (nearest-scope first, global-singleton
fallback for cross-prefix refs), fixpoint evaluation of **every** declared
  state including the intermediate valve mechanism (diaphragm/bonnet-chamber/pilot_seat/plunger),
  projection from the M2/M4/M8 results, and the cross-check harness (rule-derived state ⇔ numeric solve
  wherever both exist). `render.js` surfaces each component's qualitative state. Depends on M2/M4/M5/M8.

## Requirement → milestone traceability

Requirements are the bullets of `docs/Sim_spec.md` (States / Logic / UI). The build steps in
`docs/sim_implementation_plan.md` are the *how*, not requirements.

| # | Requirement (Sim_spec.md) | Milestone |
|---|---|---|
| **States** | | |
| R1 | One state at a time = controller commands + position of every manual control + any faults | M2–M4 + M8 (input state); per-component qualitative states derived in M10 |
| R2 | Pump running/off; each valve & head outlet open/closed, in any combination | M2 + M3 (Z1 manual) + M4 |
| R3 | Electrical circuit to pump and each solenoid is intact or broken | M4 |
| R4 | Any element healthy or faulted — hydraulic (clog, leak, weak pump) or electrical (no signal, broken wire, dead solenoid) | M8 |
| **Logic** | | |
| R5 | For any state, compute physically realistic pressure & flow throughout the network | M1 + M2 |
| R6 | How much each open outlet releases depends on the pressure reaching it | M2 + M3 (Z5 orifice) |
| R7 | Valve opens when solenoid energised through healthy wiring or manual bleed opened; pump runs only when commanded through healthy wiring | M4 |
| R8 | Opening/closing valves redistributes pressure & flow across the whole system | M2 |
| R9 | A fault behaves realistically (clog restricts, leak escapes, weak pump less, electrical fault stops actuation) | M8 |
| R10 | Water leaves only through open outlets and leaks; total outflow = what the pump supplies | M2 (balance) + M8 (leaks) |
| **UI** | | |
| R11 | System shown as a diagram | M5 |
| R12 | Control wiring shown: commanded on / energised / where a path is broken | M5 (computed M4) |
| R13 | Pressure & flow shown wherever they occur; filled parts distinguished from empty | M5 |
| R14 | Every point where water leaves shown, with how much | M5 |
| R15 | User can command every control (pump, valves, head flo-stop, valve flow control) and inject faults | M6 (controls) + M8 (fault injection) |
| R16 | The view updates live as the state changes | M6 |

**Derived qualitative states (`system.yaml` `states:`).** Not Sim_spec requirements but a view computed on
top of the solve (see *Qualitative state layer* above). R1's "state" is the **input** triple (commands +
manual positions + faults); the `states:` blocks are **derived outputs** — a distinct concept. Coverage:

| State family | Source |
|---|---|
| Electrical live/dead chain | M4 — project from `solveElectrical` reachability |
| Valve open/closed + manual handle | M2 + M4 — solver `valveOpen` / `manualOpen` / `bleedOpen` |
| Pressurised/unpressurised (downstream) | M2 — threshold over EPANET pressure + `reachable` |
| Head watering/off | M2 — outlet demand > 0 |
| Suction wet/dry, pump primed/pressurised | M8 — new suction-side physics + prime gating |
| Intermediate valve mechanism (diaphragm/bonnet/pilot/plunger) | M10 — yaml `needs` fixpoint |
| Kind→instance resolver, projection, cross-check, display | M10 — `states.js` |

## Risks
- **CDN wasm locate:** if `epanet-js` can't find its `.wasm` via esm.sh in-browser, vendor just the
  `.wasm` (single file) and point the loader at it; keep CDN otherwise (M0 verifies in-browser too).
- **Fixed-point oscillation / valve flapping:** damping + hysteresis + freeze-near-convergence; fallback
  = toggle one valve per iter.
- **Dead-branch false pressures / EPANET disconnection warnings:** zero-demand + display override rule.
- **GPV headloss-curve units / minor-loss folding:** validate pump operating point against the curve in M1/M2.
- **Shared common-return semantics:** explicitly covered by harness case 4.

## Verification
- **Headless (primary):** `cd sim && npm install && npm test` runs `test/harness.mjs`. Cases as built
  today: (1) idle — all flows 0, every outlet unreachable; (2) pump+Z2 — pumpPowered, Z2 valve open,
  head flows match catalog within tolerance, Z3–Z5 = 0, mass balance < 1e-3 m³/h, operating point on the
  pump curve, MP sprays clamped at 2.76 bar; (3) broken shared return — Z2/Z3 de-energised (return current
  crosses the cut), Z4/Z5 stay lit, `commandedNotEnergised` = {Z2, Z3}, those valves stay closed;
  (4) cut controller feed — controller/pump/zone all off. Asserts: converged, no NaN/negative on filled
  nodes, mass balance, catalog fidelity, pump operating point. **Pending:** a dedicated M3 manual-zone case,
  and the M8 clog/leak cases (faults are still a stub). Exit nonzero on failure.
- **Browser:** serve with `python -m http.server` from repo root, open `/sim/`; exercise pump/zones,
  inject a clog/leak/broken wire from the component bottom sheets, confirm the single live schematic
  (flow widths, pressure colors, outlet labels in m³/h — no unit toggle, per-wire energised traces).
  Confirm Pages deploy after push.
