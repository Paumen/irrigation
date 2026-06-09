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
| Hydraulics solver | **EPANET (global gradient algorithm) + wrapper** | Reuse the standard solver rather than hand-rolling; Darcy–Weisbach + minor + elevation, pump Q–H curve, PRV/TCV valves, pressure-dependent emitters; mass-conserving. See §5. |
| Fault vocabulary | **Per-part fail modes from `graph.yaml`** | *To be reviewed* — see §8. Aligns 1:1 with the F-code taxonomy. Each maps to an EPANET primitive (§5.1, §8). |
| Stack | **Client-side: `epanet-js` (WASM) + TypeScript** | EPANET runs in the browser; wrapper + UI in TS. See §3. |

## 3. Stack recommendation

**Recommendation: a single static client-side app — `epanet-js` (the EPANET toolkit compiled to
WASM) for the hydraulic solve, TypeScript for the wrapper, model generation, and UI, with
`graph.yaml`/`catalog.yaml`/`context.yaml` baked in as JSON at build time.**

Rationale:
- "Standalone" is best served by an artifact that runs anywhere with no server — open the page,
  it works. The model data is static and small; there is no persistence or auth need.
- The container these sessions run in is ephemeral; a static build avoids a process to keep alive.
- EPANET runs entirely in the browser via WASM, so the robust standard solver is available with
  no backend; we write only the wrapper (model gen, fault translation, result read-back) and UI.

**Trade-off / fallback.** EPANET also has a Python toolkit (`epyt` / OWA-EPANET, and WNTR), so if
we later want the solve shared server-side with the diagnostic engine, the same `.inp` model can
run under Python behind a thin API — no second solver implementation. The dependency cost is the
WASM bundle (a few hundred KB), acceptable for this app.

Proposed tooling: Vite + TypeScript, SVG for the diagram (DOM-addressable nodes/edges for cheap
live restyle), no heavy framework required (vanilla + a small reactive state store is enough).

## 4. Data model & sources

The solver consumes the existing files unchanged:

- **`graph.yaml` → `flow:`** — the system-level hydraulic network: ~70 placed nodes
  (`well`, `pump`, `hose*`, `joint*`, `manifold`, `Z1..Z6` zone trees) each with a `kind`, a
  `to:` adjacency list, an elevation `h_m`, and per-node params (`length_m`, `nozzle`, `arc`).
- **`graph.yaml` → `kinds:`** — the hydraulic element model per `kind` (bore, roughness `ε`
  (`roughness_mm`) for Darcy–Weisbach plus `hazen_williams_c` for cross-check,
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

## 5. Hydraulic solver (EPANET + wrapper)

The hydraulic core is **EPANET**, embedded client-side via **`epanet-js`** (the official toolkit
compiled to WASM, §3). EPANET's global gradient algorithm is exactly the nodal mass-balance solve
this needs, hardened on the awkward cases (zero-flow branches, closed links, check valves, pump
shutoff-head exceeded). Our **wrapper** owns everything EPANET doesn't: generating the EPANET
network from `graph.yaml`, injecting actuation from the electrical resolver (§6), translating
per-part faults (§8) into EPANET primitives, and reading EPANET's results back into the state
schema (§5.3). EPANET is handed a *resolved* hydraulic state — it never sees the 24 V circuit.

### 5.1 Element → EPANET mapping

| Our element | EPANET representation | Source data |
|---|---|---|
| Pipe (`hose.*`) | pipe link, **Darcy–Weisbach** headloss; roughness `ε = roughness_mm` (0.0015 mm, LDPE) | `inner_diameter_mm`, `length_m`, `roughness_mm` |
| Fitting (`joint`/`tee`/`swing`/`manifold`) | minor-loss coefficient on the adjoining link | `k_minor`, `bends` |
| Pump (`pump.well`) | pump link with a head (Q–H) curve | `catalog.yaml` `pump_curves` |
| Automatic valve (`valve.auto`) | link status open/closed set by §6; open-loss as a TCV setting / minor loss fitted to the loss curve | `catalog.yaml` `valve_loss` + §6 actuation |
| Manual valve (`valve.manual`, Z5) | TCV / open-closed link from the handle | `Kv` |
| Spray regulator (`head.spray`, MP) | **PRV** set to `regulated_bar` (2.76) ahead of the head emitter | `catalog.yaml` `nozzle_mp` |
| Head discharge (rotor / spray / stream) | **emitter** `q = C·pᵞ`, `C`,`γ` fitted to the nozzle flow-vs-pressure chart; stream nozzle via orifice `q = Cd·A·√(2ΔP/ρ)` | `nozzle_i20` / `nozzle_mp` / `bore_mm`,`cd` |
| Injected leak | emitter at the affected node | §8 |
| Elevation | node elevation | `h_m` (relative to well water level minus foot-valve depth) |

Notes:
- **Darcy–Weisbach** is the default headloss formula (the velocity-range argument that drove this
  choice still holds); **Hazen-Williams** stays selectable via EPANET's headloss-formula option,
  using `hazen_williams_c`, for cross-check.
- The **pilot operation** of `valve.auto` is *not* simulated internally — EPANET sees a link
  whose open/closed/throttle state the resolver sets. Pilot-side faults (clogged metering port,
  weep, bleed-open) map to a valve setting or a small emitter; the "chamber bleeds → diaphragm
  lifts" mechanism is a diagram-level annotation (§4), not part of the solve. `min_operating_bar`
  (1.5) is checked post-solve from the valve's inlet pressure and flagged, not enforced as a gate.
- A closed rotor flo-stop → emitter coefficient 0 (no discharge).

### 5.2 Solve & wrapper responsibilities

EPANET's global gradient algorithm performs the actual nodal mass-balance solve — solving for the
head at every node with each link's flow a function of the head difference across it, the pump as
a head source, and emitters as pressure-dependent discharges. This conserves mass and finds the
pump-curve / system-curve intersection by construction, and handles loops, closed links, and
zero-flow subnetworks directly. Per state, the **wrapper**:

1. **Resolves actuation first** (§6): which valves open, whether the pump runs — EPANET receives
   the outcome, not the circuit. A closed valve is a closed link (still pressurised upstream); a
   weeping or bleed-open valve is a throttled link / small emitter so it can pass flow with no
   signal.
2. **Builds or patches the EPANET model:** link statuses, PRV/TCV settings, emitter coefficients,
   pump curve (scaled down for a weak-pump fault), and any fault-derived minor losses / emitters
   (§8).
3. **Runs the single-period steady-state hydraulic solve** via the toolkit.
4. **Reads results back** — node pressures, link flows/velocities, emitter outflows — into the
   state schema (§5.3), computing the totals and `filled` flags.
5. **Surfaces solver status:** EPANET warnings/errors (non-convergence, negative pressure,
   disconnected node, pump beyond curve) plus our own flags (valve inlet below
   `min_operating_bar`), never silently clamped.

### 5.3 Outputs (state schema)

The wrapper returns a pure data structure, assembled from EPANET's node/link results (the
renderer is a separate concern):

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
4. **EPANET model generator** (§5.1) — emit a base EPANET network (`.inp` / toolkit calls) from
   `graph.yaml`: junctions with `h_m`, Darcy–Weisbach pipes with `ε`, minor losses, the pump
   curve, PRVs for the MP regulators, and emitter coefficients fitted from the nozzle charts.
   Validate every referenced `kind`/`nozzle`/`model` resolves; verify a baseline solve matches
   catalog points (single zone ≈ catalog flow).
5. **Wrapper + fault translation** (§5.2, §8) — apply actuation from (3) and the fault catalog to
   the model (statuses, settings, emitters, scaled pump curve), run `epanet-js`, read results
   into the state schema (§5.3), surface solver status.
6. **Validation** — sanity scenarios (mass balance; elevation effect; multi-zone interaction);
   confirm the WASM and Python (`epyt`) toolkits agree on the same `.inp` as a parity check.
7. **Web app** — SVG layout, state store, control panel, fault palette, live restyle, presets.
8. **Docs** — update `CLAUDE.md` (the app changes the "no web app" premise) and add a short
   usage note; wire a build/serve script.

Phases 3–5 are the load-bearing core (resolver + model + faults); 7 is the largest surface but
low-risk once the wrapper returns a clean state object.

## 11. Open questions / to confirm before build

1. **Fault granularity** (§8) — full per-part palette vs a curated/phased subset; add a generic
   "leak on segment" injector? And: are any per-part fail modes **not** cleanly expressible as an
   EPANET primitive (link status/setting, minor loss, emitter, scaled curve)? Any that aren't are
   the cases that would need bespoke handling around EPANET.
2. **Pilot-valve faithfulness** — is modelling `valve.auto` as an EPANET link with a resolver-set
   status/throttle (pilot detail shown only as a diagram annotation) sufficient, or do you want
   the chamber/diaphragm pilot loop represented more explicitly?
4. **Diagram layout** — schematic (clean, legible) vs geographic (true-to-site)? Affects layout
   effort; schematic recommended for a first cut.
5. **Units** — pressure in bar, flow in m³/h to match `catalog.yaml`, or L/min for homeowner
   readability (or both, toggle)?
6. **Scope of "live"** — single-state explorer (set state → solve → view), or also time-stepped
   animation of fill/drain transients? Spec reads as steady-state per state; recommend that.
```
