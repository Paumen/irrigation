# Build the Irrigation System Simulator

## Context

`docs/Sim_spec.md` (high-level) and `docs/sim_implementation_plan.md` (build spec) describe a
browser-based simulator of this homeowner's irrigation system — its hydraulics *and* its control
wiring. For any combination of commands and faults it must show where water sits, at what pressure,
and where/how much leaves. It is a **static page** (no backend), with water pressure/flow computed by
**EPANET** through our own layer that feeds it the network and reads results back.

Nothing of this simulator exists yet. The Python files in `tools/` are the **unrelated** diagnostic
scoring engine and are not touched. The simulator is a new `sim/` folder driven by the three existing
root inputs: `graph.yaml` (hydraulic `flow` network + electrical `circuit` + component `kinds`/`fail:`
lists), `catalog.yaml` (pump curve, valve-loss table, rotor `nozzle_i20`, spray `nozzle_mp`),
`context.yaml` (labels).

**Decisions locked with the user:** dependencies loaded from **CDN** via importmap (no vendoring);
schematic via **elkjs** auto-layout; hosted on **GitHub Pages**; plain ES modules, **no bundler**.

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
open/closed (open iff energised-through-good-wiring **or** bleed open, **and** inlet ≥ `min_operating_bar`
1.5, **and** no disabling fault); closed valves become closed links so dead branches stay stable.

### Hosting / deps
- `sim/index.html` uses an **importmap** → `epanet-js`, `js-yaml`, `elkjs` from a CDN (esm.sh/jsdelivr).
- App fetches the **existing root YAMLs** via relative paths (`../graph.yaml`, `../catalog.yaml`,
  `../context.yaml`) — single source of truth, no copies.
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
    layout.js           elkjs auto-layout -> node/part coordinates (computed once)
    render.js           data-join SVG update from a solved result (positions never move)
    controls.js         control + fault widgets, hold UI state
    quasitime.js        stepped sequence of settled states
    units.js            bar<->L/min<->m3h conversions + formatting
    app.js              glue: load->model->hydraulics->layout->controls; debounced re-solve
  test/
    harness.mjs         headless Node verification (node test/harness.mjs)
    cases.mjs           idle / pump+Z1 / clogged hose / broken wire
```

### Network translation (`network.js`)
Classify each `flow` node by `kind`:
- **Links (2-port conduits):** `hose.*`→PIPE (D=`inner_diameter_mm`, len=`length_m`, roughness=`roughness_mm`);
  `swing.*`→short PIPE (D=`bore_mm`, tiny length, its `k_minor` as minor loss); `valve.auto`→**GPV** when
  open using a headloss curve from `catalog.valve_loss[PGV-101G]` (loss_bar×10.197→m), STATUS CLOSED when
  shut; `valve.manual`→**TCV** from `Kv=6.0`; `pump.well`→**PUMP** with HEAD curve from
  `pump_curves[AQUAJET 132 M]`.
- **Nodes:** `well`(water.level)→**RESERVOIR** at head=`h_m`; `joint`/`tee`/`manifold`→JUNCTION;
  `head.*`/`nozzle.stream`→**outlet JUNCTION** (demand-driven, no downstream); `cap`→dead-end junction.
- **Edge-walk:** every link spans from its upstream node to `to[0]`; insert a synthetic junction if two
  links would touch directly (rare here). Tees/manifold = one junction with multiple outgoing links.
- **Minor-loss folding:** EPANET puts `K` on pipes, not nodes. Fold each fitting's `k_minor` onto its
  **downstream** pipe(s); for a tee/manifold add the full `k_minor` to *each* downstream pipe (each path
  sees the fitting once). Document the different-bore approximation.
- **Options:** `UNITS CMH` (matches catalog m³/h directly), `HEADLOSS D-W` (roughness in mm). Pressure m→bar ÷10.197.

### Outer solver (`solver.js`) — `solveSteady(model, state, elec, faults, hyd) -> SteadyResult`
Loop (≤~60 iters), baseline = rebuild INP each iteration and re-`open()` (sub-ms):
1. **Actuate valves** from current pressure guess + `elec` + bleed/handle + faults; record
   `commandedNotOpening` when energised/bleed but inlet < 1.5 bar. Hysteresis (open 1.5 / stay 1.4) +
   freeze valve states for the last few iters to stop flapping.
2. **Set demands:** each reachable outlet `q = outletDemandAt(o, p_prev)`; unreachable (closed-valve /
   dead) → 0. Damp `q_set = q_prev + ALPHA·(q − q_prev)`, ALPHA≈0.5.
3. Render INP, `hyd.solve`, read pressures/flows.
4. Converge when max |Δp| and |Δq| over outlets below tolerance for 2 consecutive iters.
- **Regulated spray:** lookup pressure = `min(p_prev, 2.76)` → flat above clamp (fast contraction).
- **Idle / pump-off:** pump link CLOSED, all demands 0, whole downstream is a dead branch → display "—".
- **Dead branches:** zero demand + flag `filled=false`; override displayed pressure to "—" (never trust
  EPANET pressure on disconnected nodes). Mass-balance assert: Σ(outlet+leak flow) ≈ pump flow.

### Electrical (`electrical.js`) — `solveElectrical(circuit, commands, faults) -> ElecResult`
Graph of **ports** (intra-part `to:` + inter-part `wires`, bidirectional). `acts:` are control relations,
not continuity. Reusable `reachable(graph, from, to, blocked)`. Fixpoint (relay contact closes when its
coil loop energises): controller `mv`→relay coil loop→contact closes→`pumpPowered` via
grid→line_in→contact→load_out→pump→neutral. Each zone N: `zoneCmd[N]` AND continuity
`zone_N→signal_N→splice.sig_N→ZN.valve.coil→common_lead→com chain→common_return→controller`. The
**shared common return** means one break can disable several zones — falls out naturally. Three display
states per wire/part: **asked-for** (path with faults disabled), **powered** (real solve with
`blocked=electrical faults`), **broken** (faulted, or first asked-but-dead gap).

### Faults (`faults.js`)
Toggle list = every `fail:` in `graph.yaml` (`kinds.*.parts.*.fail` + `circuit.parts.*.*.fail`), keyed
`<node>.<subpart>:<failtype>`. A small **(role × failtype) dispatch table** (~15 cells) emits mutations:
`hydMutations` (addKMinor / closeLink / scalePumpHead / disableValve), `leaks` (orifice outlets),
`outletMods` (nozzle/arc override, flowScale, zeroFlow), `elecCuts` (ports → `blocked`). A `SPECIAL`
map overrides a handful (e.g. `bleed_screw:misconfigured`=stuck-open forces valve open;
`priming_cap:misconfigured`=pump loses prime; `nozzle/arc:misconfigured`=swap table row). Clogs take a
0..1 severity (partial→addK, full→closeLink); structural breaks default to a representative orifice.

### Layout + render (`layout.js`, `render.js`)
elkjs `layered`, `direction=RIGHT`, zones clustered by `Zn.` prefix; separate ELK graph for the circuit
in a reserved band. Coordinates computed **once** at startup (depend only on the static graph) and
reused every frame. `render.js` only updates stroke width (∝ |flow|), color (∝ pressure, blue→green→red),
idle=grey/dashed, every outlet/leak labeled with flow (bar↔L/min toggle), wiring colored
asked/powered/broken. Optional small `layout.overrides` map for awkward anchors (pump/well/manifold).

### Controls + quasi-time
`controls.js`: pump on/off; per-zone controller command; auto-valve flow-control throttle (0..1); rotor
flo-stop; valve bleed screw; Z5 manual handle; fault toggles. Any change → debounced
`electrical → compile faults → solveSteady → renderScene`. `quasitime.js`: a **time-ordered** sequence of
command-states (time is the axis of this mode — each entry has a timestamp; the user places/plays/steps
along the timeline), each entry solved as a settled state and rendered. The controller's specific
`pump_lead_s` value is **not** hard-coded as a modelled lead — but the timeline itself is real: the user
drives the progression and can order pump-on before a zone, etc.

## Execution scope (this round)

Save this plan to `docs/` and execute **M0 only** — the EPANET spike. M1–M8 are documented here but
NOT built this round. After M0: commit/push to `claude/sim-build-uiwft2` and open a draft PR.

**M0 deliverable concretely:** `sim/package.json` (`{"type":"module"}`, devDep `epanet-js`), and
`sim/test/m0-smoke.mjs` — a headless Node script that hand-writes a tiny INP (reservoir → pump → one
junction with a demand, D-W headloss, CMH units, a pump HEAD curve, and one GPV with a headloss curve),
runs it through epanet-js (`Workspace`/`Project`, `open`/`solveH`), reads back node pressure (→bar) and
link flow, and asserts they're finite/sane. Purpose: lock the epanet-js API surface (exact enum names,
CMH unit support, D-W, pump curve, GPV) before M1. Prints the results table and exits nonzero on failure.

## Build order (each milestone after M2 gated by the Node harness)
- **M0 Spike:** Node smoke test — hand-written 3-node INP (reservoir-pump-junction-demand); lock
  epanet-js enums (`NodeProperty.Pressure`, `LinkProperty.Flow`), CMH units, D-W, pump HEAD curve, GPV.
- **M1:** `model.js`, `network.js`, `inp.js`, `epanet-runner.js`; validate one healthy zone vs pump curve.
- **M2:** `outlets.js`, `solver.js`; idle + pump+Z1 converge with correct mass balance; `harness.mjs` cases 1–2.
- **M3:** `electrical.js` + valve actuation in the loop; harness case 4 (broken wire / shared return).
- **M4:** `faults.js` grouped table + specials; harness case 3 (clog) + a leak case.
- **M5:** `layout.js` (elkjs) + `render.js` — static schematic with flow/pressure encoding.
- **M6:** `controls.js` + `app.js` wiring + units toggle (live update).
- **M7:** `quasitime.js` (step through a sequence of settled command-states).
- **M8:** polish — wiring asked/powered/broken styling, labels, Z5 manual, `commandedNotOpening`,
  max-pressure warnings; `.github/workflows/pages.yml` + `sim/README.md`.

## Requirement → milestone traceability

Requirements are the bullets of `docs/Sim_spec.md` (States / Logic / UI). The build steps in
`docs/sim_implementation_plan.md` are the *how*, not requirements.

| # | Requirement (Sim_spec.md) | Milestone |
|---|---|---|
| **States** | | |
| R1 | One state at a time = controller commands + position of every manual control + any faults | M2–M4 (state model) |
| R2 | Pump running/off; each valve & head outlet open/closed, in any combination | M2 + M3 |
| R3 | Electrical circuit to pump and each solenoid is intact or broken | M3 |
| R4 | Any element healthy or faulted — hydraulic (clog, leak, weak pump) or electrical (no signal, broken wire, dead solenoid) | M4 |
| **Logic** | | |
| R5 | For any state, compute physically realistic pressure & flow throughout the network | M1 + M2 |
| R6 | How much each open outlet releases depends on the pressure reaching it | M2 |
| R7 | Valve opens when solenoid energised through healthy wiring or manual bleed opened; pump runs only when commanded through healthy wiring | M3 |
| R8 | Opening/closing valves redistributes pressure & flow across the whole system | M2 |
| R9 | A fault behaves realistically (clog restricts, leak escapes, weak pump less, electrical fault stops actuation) | M4 |
| R10 | Water leaves only through open outlets and leaks; total outflow = what the pump supplies | M2 (balance) + M4 (leaks) |
| **UI** | | |
| R11 | System shown as a diagram | M5 |
| R12 | Control wiring shown: commanded on / energised / where a path is broken | M5 (computed M3) |
| R13 | Pressure & flow shown wherever they occur; filled parts distinguished from empty | M5 |
| R14 | Every point where water leaves shown, with how much | M5 |
| R15 | User can command every control (pump, valves, head flo-stop, valve flow control) and inject faults | M6 |
| R16 | The view updates live as the state changes | M6 |

## Risks
- **CDN wasm locate:** if `epanet-js` can't find its `.wasm` via esm.sh in-browser, vendor just the
  `.wasm` (single file) and point the loader at it; keep CDN otherwise (M0 verifies in-browser too).
- **Fixed-point oscillation / valve flapping:** damping + hysteresis + freeze-near-convergence; fallback
  = toggle one valve per iter.
- **Dead-branch false pressures / EPANET disconnection warnings:** zero-demand + display override rule.
- **GPV headloss-curve units / minor-loss folding:** validate pump operating point against the curve in M1/M2.
- **Shared common-return semantics:** explicitly covered by harness case 4.

## Verification
- **Headless (primary):** `cd sim && npm install && npm test` runs `test/harness.mjs` over: (1) idle —
  all flows 0, downstream `filled=false`; (2) pump+Z1 — pumpPowered, Z1 valve open, head flows match
  catalog within tolerance, Z2–Z4 = 0, mass balance < 1e-3 m³/h, operating point on the AQUAJET curve,
  MP sprays clamped at 2.76 bar; (3) clogged hose — branch heads → 0, no NaN, still converges;
  (4) broken wire — zone de-energised, valve stays closed, `commandedNotOpening` set, shared-return break
  disables the intended set. Asserts: converged, no NaN/negative on filled nodes, mass balance, catalog
  fidelity, monotonicity (second zone open → per-head pressure drops). Exit nonzero on failure.
- **Browser:** serve with `python -m http.server` from repo root, open `/sim/`; exercise pump/zones,
  inject a clog/leak/broken wire, confirm live schematic (flow widths, pressure colors, outlet labels,
  wiring asked/powered/broken), bar↔L/min toggle, and quasi-time stepping. Confirm Pages deploy after push.
