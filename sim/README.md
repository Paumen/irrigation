# Irrigation System Simulator (headless)

A headless physics engine for this homeowner's irrigation system — its hydraulics, its control
wiring, and every part-by-part failure mode. It runs under **Node** only: plain ES modules, no
browser, no UI. See `docs/Sim_spec.md` / `docs/sim_implementation_plan.md` for the original spec and
`docs/sim_build_plan.md` for the design history.

Water pressure and flow are computed by **EPANET** (via `epanet-js`, EPANET 2.2 compiled to wasm),
wrapped by our own outer fixed-point demand loop. The inputs are the three repo-root YAMLs —
`graph.yaml` (hydraulic network + electrical circuit + per-part failure lists), `catalog.yaml`
(pump curve, valve-loss and nozzle tables), `context.yaml` (labels) — single source of truth, no
copies.

## What it computes

Given a command/state tuple —

- `commands` `{ mv, zones: {1..4} }` — what the controller asks for, routed through the **real
  wiring** by `electrical.js` (a broken wire or a shared-common-return break de-energises zones);
- `state` `{ manualOpen, bleedOpen, floStop, throttle }` — every mechanical input: the Z5 hand
  valve, per-valve bleed screws and flow-control screws (0..1 opening; the catalog GPV loss curve
  scales by 1/t², a seated screw holds the valve shut), rotor flo-stops;
- `faults` `{ faultKey: true | 0..1 }` — any combination of the ~400 `fail:` entries in
  `graph.yaml`, compiled by `faults.js` into solver/network mutations: clogs carry a 0–1 severity
  (partial → sharp-orifice minor loss `K=(1/a²−1)²`, full → sealed link / dead pump; valve-seat
  clogs scale the valve's loss curve since EPANET ignores GPV minor losses), breaks become leak
  emitters at the nearest real junction (suction-side breaks cost the pump its prime), pump-path
  clogs scale the head curve, valve faults pin the diaphragm open or shut, electrical faults block
  circuit ports, and outlet faults rewrite the discharge law (wrong nozzle, lost regulator clamp,
  flush plug as open orifice)

— `solveSteady()` returns the settled steady state: pressure and flow everywhere, each outlet's
discharge from its own catalog law (I-20 rotor table, regulator-clamped MP spray table, open-orifice
laws for the hand nozzle and leaks), valve open/closed states with `commandedNotOpening` reporting,
reachability (which branches are actually filled), leak flows, and a mass balance.

Numerical robustness: auto-valves actuate with physical lift/stay hysteresis; every fed-back
quantity uses per-quantity adaptive damping (the step halves on each sign flip); starved table
outlets hand off to EPANET emitters below their lowest catalog point (where the demand fixed point
is singular); emitters fade out near zero pressure rather than drawing water in. Extreme states —
all four zones at once, 98 %-sealed clogs, dead-heading — settle.

## Modules (`src/`)

| module | role |
|---|---|
| `config.js` | physical constants and solver tunables |
| `model.js` | raw YAML → normalized Model (flow nodes, roles, catalog curves, circuit) |
| `network.js` | Model + state → EPANET topology (links, junctions, minor-loss folding, curves) |
| `inp.js` | topology → INP text |
| `epanet-runner.js` | epanet-js lifecycle: write INP, solve, read results |
| `outlets.js` | pressure→flow laws: rotor/spray tables, orifices, emitter coefficients |
| `solver.js` | the outer fixed-point loop: demands, emitters, valve actuation, reachability |
| `electrical.js` | continuity/energization over the circuit (parts + wires, blocked ports) |
| `faults.js` | `fail:` enumeration + (role × failtype) dispatch → FaultEffects |
| `units.js` | bar/metres/flow conversions and formatting |

## Run the tests

```sh
cd sim
npm install      # epanet-js + js-yaml (dev dependencies; node_modules is git-ignored)
npm run smoke    # M0 spike: locks the epanet-js API surface on a hand-written INP
npm test         # the full harness: node test/harness.mjs
```

`npm test` loads the real root YAMLs and solves a set of settled cases, asserting convergence, mass
balance and catalog fidelity throughout:

- **idle** — everything dead, all flows zero;
- **pump + Z1** — outlet discharges match the catalog laws, the spray regulator clamps at 2.76 bar,
  dead branches isolate, the pump lands on its curve;
- **all four zones** — the heaviest healthy state settles without valve flapping, per-head pressure
  drops monotonically vs the single-zone case;
- **zone commanded with pump off** — the valve cannot lift and reports `commandedNotOpening`;
- **pump + Z5 manual** — the hand nozzle streams at near-atmospheric pressure, matching the orifice
  law;
- **broken shared common return / broken signal wire** — the right zones drop while the pump stays
  powered;
- **flo-stop closed / flow-control at 40 % / fully seated** — the head stays filled but stops
  discharging; the valve's headloss matches the catalog law scaled by 1/t²; a seated screw holds the
  valve shut;
- **faults** — a fully clogged hose seals its branch; an 80 % clog restricts; a 60 % valve-seat clog
  throttles through the scaled loss curve while a fully packed seat reports commanded-but-not-
  opening; a burst hose leaks at its downstream junction and the leak is part of the mass balance; a
  broken solenoid coil drops exactly its zone; a stuck-open bleed screw runs the zone uncommanded; a
  half-clogged impeller weakens everything; a broken motor stops the pump despite healthy wiring; a
  broken spray regulator follows the raw nozzle table;
- plus electrical-only continuity spot checks and pure fault-model checks (unique enumeration of
  every `fail:` entry, severity semantics, dispatch effects, unknown keys throw).

It prints a per-case outlet table and exits non-zero on any failure.
