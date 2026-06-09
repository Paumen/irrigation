# Irrigation System Simulator — Design & Implementation Plan

**Status:** draft for review (spec only — no implementation in this round)
**Companion to:** `docs/spec.md` (diagnostic engine), `docs/fcode_spec.md` (fault taxonomy)
**Models the system in:** `graph.yaml` (topology + circuit), `context.yaml` (metadata), `catalog.yaml` (curves)

---

## 1. Goal

A simulator of this homeowner's irrigation system's **hydraulics and control wiring**: for
any combination of commands and faults, compute where water sits, at what pressure, and where
and how much leaves — and present it as a **live, interactive diagram**.

This is a *what-if explorer*, distinct from the diagnostic engine. The diagnostic engine
(`tools/engine.py`) ranks failure modes from a homeowner Q&A; the simulator runs the physics
forward from a chosen state. They share one vocabulary — the per-part fail modes in
`graph.yaml` and the F-codes in `fcode_spec.md` — and the simulator can later serve as the
ground-truth generator for the diagnostic side, but that integration is out of scope here.

## 2. Decisions (from spec review)

| Decision | Choice | Notes |
|---|---|---|
| Deliverable this round | **Plan + this design doc only** | No code yet. |
| UI form | **Standalone interactive web app** | Explicitly chosen over an MCP-tool/rendered-image approach; departs from the "no web app" line in `CLAUDE.md`, which should be updated when this lands. |
| Hydraulics fidelity | **Full steady-state network solver** | Real Hazen-Williams + minor + elevation losses, pump Q–H curve, valve loss curves, nozzle flow-vs-pressure charts; mass-conserving (outflow = pump supply). |
| Fault vocabulary | **Per-part fail modes from `graph.yaml`** | *To be reviewed* — see §8. Aligns 1:1 with the F-code taxonomy. |
| Stack | **Recommended: client-side TS, solver ported to TS** | See §3 for the trade-off and the fallback. |

## 3. Stack recommendation

**Recommendation: a single static client-side app (TypeScript), solver ported to TS, with
`graph.yaml`/`catalog.yaml`/`context.yaml` baked in as JSON at build time.**

Rationale:
- "Standalone" is best served by an artifact that runs anywhere with no server — open the page,
  it works. The model data is static and small; there is no persistence or auth need.
- The container these sessions run in is ephemeral; a static build avoids a process to keep alive.
- The hydraulic solver is a self-contained numeric routine (curve interpolation + a fixed-point
  loop over a tree, §5). Porting it to TS is bounded and testable.

**Trade-off / fallback.** The cost is maintaining the solver in TS rather than reusing Python.
If we later want one solver shared with the diagnostic engine, the fallback is **Python solver +
thin HTTP/WebSocket API + browser front-end**: keeps the numerics in `tools/`, but needs a
running server, so it is no longer a static artifact. A middle path is to keep the canonical
solver in Python, generate a golden set of solved states as fixtures, and assert the TS port
matches them in CI — this lets the app stay static while pinning both implementations together.

Proposed tooling: Vite + TypeScript, SVG for the diagram (DOM-addressable nodes/edges for cheap
live restyle), no heavy framework required (vanilla + a small reactive state store is enough).

## 4. Data model & sources

The solver consumes the existing files unchanged:

- **`graph.yaml` → `flow:`** — the system-level hydraulic network: ~70 placed nodes
  (`well`, `pump`, `hose*`, `joint*`, `manifold`, `Z1..Z6` zone trees) each with a `kind`, a
  `to:` adjacency list, an elevation `h_m`, and per-node params (`length_m`, `nozzle`, `arc`).
- **`graph.yaml` → `kinds:`** — the hydraulic element model per `kind` (bore, Hazen-Williams C,
  `k_minor`, `bends`, valve `Kv`, pump `max_output_bar`, head regulation) **and** the
  injectable `fail:` list per sub-part. The simulator reads element params here and derives its
  fault catalog from the `fail:` lists.
- **`graph.yaml` → `circuit:`** — `parts:` (controller, adapter, relay, pump, splice, solenoid
  coils) and `wires:`. Drives the electrical resolver (§6).
- **`catalog.yaml`** — `pump_curves` (pump Q–H), `valve_loss` (valve loss), `nozzle_i20`
  and `nozzle_mp` flow-vs-pressure tables. The physical curves the solver interpolates.
- **`context.yaml`** — non-physical metadata (locations, install dates); used for labels/tooltips.

The **pipe routing** from the source out to the heads is acyclic: a single source (`well`) →
`pump` → main line → `manifold`, which fans out into zone subtrees (`Z1`–`Z4` automatic, `Z5`
manual, `Z6` a cap); tees branch but nothing reconverges. Terminal discharges are heads
(`head.rotor`/`head.spray`), the `Z5` stream nozzle, and any injected leak (a leak is an extra
discharge terminal on an interior node).

But the model as a whole is **not loop-free**, so the solver must not assume a pure tree
traversal:

- **Pilot-operated valves.** Inside each `valve.auto`, `inlet` reaches `outlet` by two parallel
  paths — the main `inlet→diaphragm→seat→outlet` and the pilot
  `inlet→metering_port→chamber→solenoid_entry→plunger→solenoid_exhaust→outlet`. That is a
  genuine hydraulic loop, and a feedback one: the chamber pressure the pilot path sets up
  controls whether the diaphragm lifts. This is the actuation mechanism the simulator must show,
  and several faults live in it (clogged metering port, weeping seat, bleed left open).
- **Electrical circuit.** The `circuit:` graph has cycles by construction — current returns
  along the shared common chain (`com_1→…→com_4→c_2`). It is solved for continuity, not as a
  tree (§6).
- **Global hydraulic coupling.** Even on the acyclic pipe routing, the single pump curve plus
  pressure-dependent discharge at every open head couple all branches; they cannot be solved
  independently branch-by-branch.

The tree structure of the pipe routing is still useful — as a natural node ordering and a good
initial guess — but the solve is a general nodal one (§5.2), not a recursive tree pass.

## 5. Hydraulic solver

### 5.1 Elements (head loss / discharge laws)

- **Pipe (`hose.*`)** — Hazen-Williams friction:
  `h_f = 10.67 · L · Q^1.852 / (C^1.852 · d^4.87)` (SI, Q in m³/s, d in m), plus minor losses
  `h_m = k_minor · v²/2g` for fittings (`joint`, `tee`, `swing`, `manifold`, `bends`).
- **Pump (`pump.well`)** — head from the pump Q–H curve in `catalog.yaml`, interpolated
  at the operating flow; the solve finds the curve/system intersection (§5.2).
- **Automatic valve (`valve.auto`)** — pilot-operated (§4): the diaphragm lifts when the pilot
  path bleeds the chamber (solenoid energised or bleed open), then the open valve's loss comes
  from the `valve_loss` curve (interpolated on flow); a seated diaphragm passes only any pilot/
  weep flow. `min_operating_bar` (1.5) flags valves that won't reliably actuate below that inlet
  pressure — so actuation is pressure-dependent, part of the coupled solve, not a fixed switch.
- **Manual valve (`valve.manual`, Z5)** — `Kv`-based loss; open/closed by its handle.
- **Heads** —
  - *Rotor* (`head.rotor`): discharge from `nozzle_i20` flow-vs-pressure for the fitted
    nozzle code (e.g. "4.0 blue" → "4.0"); a closed flo-stop sets discharge to 0.
  - *Spray* (`head.spray`, MP rotators): pressure-regulated to `regulated_bar` (2.76);
    discharge from `nozzle_mp` flow-vs-pressure-by-arc for the fitted nozzle+arc, clamped to the
    regulated point above the regulator's threshold.
  - *Stream nozzle* (`nozzle.stream`, Z5): orifice discharge `q = Cd·A·√(2ΔP/ρ)` from `bore_mm`/`cd`.
- **Elevation** — each node's `h_m` contributes static head relative to the well water level
  (`well.h_m` minus the foot-valve depth); the pump must lift water to each head's elevation in
  addition to overcoming friction.

### 5.2 Solve method (general nodal)

Solve for the **head `H` at every node** subject to mass balance, treating each element's flow
as a function of the head difference across it (pipe friction, minor losses, valve loss, pilot
path, nozzle discharge) and the pump as a head source on the `Q` through it. This formulation
handles the pilot loops, parallel leak paths, and the global pump coupling uniformly — it does
not depend on the network being a tree.

1. **Build the active element graph.** Resolve actuation first (§6): which valves are open and
   whether the pump runs. Include closed valves as their leak/pilot state rather than deleting
   them (a closed valve can still weep; a bleed-open valve passes flow with no signal). Add leak
   terminals where injected.
2. **Assemble nodal equations.** At each interior node, Σ(element flows in) = Σ(element flows
   out); elevation enters as static head per node `h_m`. Terminal nodes discharge to atmosphere
   by their element law (§5.1). The pump contributes `H(Q)` from the curve.
3. **Solve the nonlinear system** by Newton–Raphson on nodal heads (Jacobian from the element
   `dq/dH` slopes), with under-relaxation and a globalisation safeguard (line search / trust
   region) for the strongly nonlinear nozzle and pilot terms. The acyclic pipe routing gives a
   cheap, good initial guess (a single down-pass from an assumed pump head) and a natural
   ordering, but is not relied on for the solve.
4. Iterate to convergence (‖residual‖ < ε on the mass balances).

Mass is conserved by the balance equations (total outflow = pump `Q` at convergence), yielding
the pump-curve / system-curve intersection. Non-convergence, pump-curve-exceeded, or a valve
below `min_operating_bar` are reported as solver status, not silently clamped. (For a network
this small the dominant cost is curve interpolation, not the linear solves.)

### 5.3 Outputs (state schema)

The solver returns a pure data structure (the renderer is a separate concern):

```
{
  solver:   { converged, iterations, residual, warnings[] },
  pump:     { running, flow_m3h, head_m, outlet_bar },
  nodes:    { <id>: { pressure_bar, elevation_m, filled: bool } },
  edges:    { <id>: { flow_m3h, velocity_ms, head_loss_m, direction } },
  outlets:  [ { id, kind, flow_m3h, type: "nozzle"|"leak"|"open_end" } ],
  totals:   { supplied_m3h, discharged_m3h, leaked_m3h },
  circuit:  <see §6>,
}
```

`filled` distinguishes pressurised/wetted parts from empty/idle ones for the diagram.

## 6. Electrical / control model

A separate **continuity resolver** over `circuit:` decides what actuates, *before* the
hydraulics run:

- **Energisation** = an intact conductive path exists from supply through the relevant control
  contact to the load and back along the common/return, with no `broken`/`misconfigured` part or
  wire on the path.
- **Pump runs** iff commanded (controller `mv` / pump program) **and** the relay coil energises
  (signal path intact + grid power) **and** the relay→pump power wiring is intact. The relay
  (`coil_energized_closes: contact`) gates mains to the pump.
- **Automatic valve opens** iff its solenoid coil energises (controller zone output → `signal_N`
  → `splice.sig_N` → `coil` → common chain → `c_2` return, all intact) **or** its `bleed_screw`
  is manually opened. A `dead solenoid` (coil `broken`), a `broken wire`, or a `no signal`
  (controller output `broken`/`misconfigured`) leaves it shut despite the command.
- **Manual valve (Z5)** and **rotor flo-stop** are purely mechanical positions, no circuit.

Circuit output for the diagram: per part/wire — `commanded`, `energised`, `broken` — so the UI
can show "commanded on but not energised, path broken here."

## 7. Controls (commandable state)

The user can set, per the spec:

- **Pump** — on/off command (subject to the relay/wiring resolving to actually running).
- **Zone valves Z1–Z4** — controller zone command on/off (subject to solenoid energising).
- **Z5 manual valve** — handle open/closed.
- **Valve flow control** — the valve `flow_control` position (throttles/closes the diaphragm).
- **Rotor flo-stop** — per-rotor open/closed.
- **Valve bleed screw** — manual open (opens valve without the solenoid).

State = these commands + every manual position + the injected fault set.

## 8. Fault vocabulary (per-part — *to review*)

Faults are injected per part, drawn from each kind's `fail:` list in `graph.yaml`. This is rich
and maps 1:1 to the F-code taxonomy, but the surface area is large — **flagged for your review**
(you marked this "to be reviewed"). Each fail mode maps to a physical effect:

| Fail mode | Where it appears | Solver effect |
|---|---|---|
| `clogged` | supply, hoses, pump suction/impeller/diffuser, valve seat/metering/solenoid, nozzles, filters, gears | added/▲ resistance on that element (↓ effective bore / ↑ loss); a fully clogged terminal stops discharging |
| `broken` (hydraulic) | hoses, caps, swing joints, valve body/diaphragm/seat, manifold body/seals, head body/riser | a leak (new discharge terminal) or a stuck/failed element depending on part |
| `broken` (electrical) | grid/socket pins, adapter, controller outputs, relay coil/contact, solenoid coil, splice, wires | breaks the circuit path → pump/valve fails to actuate |
| `misconfigured` | nozzle/arc, flow-control, bleed-screw, handle, controller logic/outputs, wiring | wrong setting: e.g. flow-control throttled, bleed left open, signal mis-wired |
| weak pump | pump impeller/diffuser/seal/motor/capacitor | scaled-down Q–H curve (degraded head at given flow) |

**Review questions for you (§11):** expose the full per-part set in the UI from day one, or
phase it (model everything; surface the common ones first)? And do we want a synthetic "leak
anywhere on this segment" control in addition to the part-specific `broken` modes?

## 9. UI / UX spec

- **Diagram (SVG).** The full system laid out roughly to its real geography (well → pump in
  shed/well → main run → valve box manifold → four zone trees + Z5/Z6), with the control wiring
  drawn as a second, overlaid layer (controller → relay → pump; controller → splice → solenoids).
  Components use the existing media icons where available (`media/pump-icon.png`,
  `valve-icon.png`, `head-rotor-icon.png`).
- **Visual encodings.**
  - *Water:* edge thickness/colour ∝ flow; node tint ∝ pressure; filled vs empty parts visually
    distinct (saturated vs greyed).
  - *Outlets:* every discharge point (each head's nozzle, the Z5 nozzle, any leak) annotated with
    its flow (m³/h or L/min) and a spray glyph; total supplied/discharged/leaked shown.
  - *Wiring:* commanded-on vs energised vs broken paths distinguished (e.g. solid-green energised,
    dashed-amber commanded-not-energised, red break marker at the failed part).
- **Control panel.** Toggles for pump, Z1–Z4, Z5 handle, per-rotor flo-stop, per-valve
  flow-control and bleed; a fault palette to inject/clear per-part faults.
- **Live update.** Any control or fault change re-runs the resolver+solver and restyles the
  diagram in place (sub-100 ms target — the solve is small). A status line surfaces solver
  warnings (non-convergence, pump curve exceeded, valve below `min_operating_bar`).
- **Presets.** A few canned scenarios (all-off, single zone running, classic faults: clogged
  nozzle, broken zone hose, dead solenoid, weak pump) for quick exploration.

## 10. Implementation plan (when approved)

1. **Data layer** — YAML→JSON build step; typed model loader; validate `flow:`/`circuit:`
   adjacency and that every `kind`/`nozzle`/`model` referenced resolves to params/curves.
2. **Curve utilities** — interpolation for pump, valve-loss, and nozzle tables, with loud
   validation/exceptions for out-of-range queries rather than fallback null/0.0 values.
   (Note: some nozzle tables carry genuine below-operating-range `null` data points, which the
   loader must represent as "no flow below threshold" rather than treat as an error.)
3. **Electrical resolver** (§6) — continuity over `circuit:` → energised/commanded/broken per
   element; pump-runs and per-valve-open booleans.
4. **Hydraulic solver** (§5) — element laws, active-subgraph pruning, tree fixed-point, state
   schema (§5.3). Unit-test each element law against `catalog.yaml` points first.
5. **Validation** — sanity scenarios (single zone at known nozzle/pressure ≈ catalog flow;
   mass balance; elevation effect); if we keep a Python reference, golden-fixture parity in CI.
6. **Web app** — SVG layout, state store, control panel, fault palette, live restyle, presets.
7. **Docs** — update `CLAUDE.md` (the app changes the "no web app" premise) and add a short
   usage note; wire a build/serve script.

Phases 1–4 are the load-bearing core (the physics); 6 is the largest surface but low-risk once
the solver returns a clean state object.

## 11. Open questions / to confirm before build

1. **Fault granularity** (§8) — full per-part palette vs a curated/phased subset; add a generic
   "leak on segment" injector?
2. **Stack** (§3) — confirm client-side TS port, or prefer the Python-backend / shared-solver
   fallback (which keeps one solver but needs a server)?
3. **Solved-state parity** — do you want a Python reference solver kept in `tools/` for CI parity
   with the TS port, or TS as the single implementation?
4. **Diagram layout** — schematic (clean, legible) vs geographic (true-to-site)? Affects layout
   effort; schematic recommended for a first cut.
5. **Units** — pressure in bar, flow in m³/h to match `catalog.yaml`, or L/min for homeowner
   readability (or both, toggle)?
6. **Scope of "live"** — single-state explorer (set state → solve → view), or also time-stepped
   animation of fill/drain transients? Spec reads as steady-state per state; recommend that.
```
