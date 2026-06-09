# Irrigation System Simulator — Build Spec

**Inputs (read as-is):** `graph.yaml` (layout, wiring, and each part's possible failures), `catalog.yaml` (pump/valve/nozzle tables), `context.yaml` (labels/background).
**Out of scope:** linking this to the existing troubleshooting tool.

## 1. What to build

- An interactive page in a web browser, running fully in the browser — static page, no server.
- Water pressure and flow computed by **EPANET** (a proven water-network calculator with a browser
  version), with our own layer feeding it the system and reading results back.
- Friction calculated by the Darcy–Weisbach method, using the per-hose smoothness value in `graph.yaml`.
- Any individual part can be broken — the full part-by-part failure list from `graph.yaml`, plus a
  generic "leak somewhere along a pipe" option.
- Shows the settled (steady-state) result instantly, and also a quasi-time mode that steps through a
  sequence of settled states (e.g. a watering program, or a series of changes) — not full transient
  simulation.
- Pressures in bar and flows in m³/h (matching the manufacturer tables), with a litres-per-minute toggle.

## 2. Water behaviour to reproduce

The result must reflect:

- Pipe friction (faster flow, and longer/narrower pipes, cost more pressure).
- Height — the pump lifts water up to each head's elevation.
- The pump curve (pushing harder moves less water), from `catalog.yaml`.
- Valve and fitting resistance — the automatic valve's loss from the `valve_loss` table in
  `catalog.yaml`; the hand valve from its `Kv` rating (it has no catalog loss curve). Use one source per
  valve, not both.
- Outlet discharge depends on the pressure reaching each outlet, and the two head types differ:
  - **Rotors** (`head.rotor`, I-20) are unregulated — discharge follows the `nozzle_i20` table for the
    fitted nozzle size, rising with pressure.
  - **Spray heads** (`head.spray`, MP rotators) have a built-in regulator (`regulated_bar` 2.76): clamp
    the nozzle inlet to min(supply, 2.76 bar), then read the `nozzle_mp` table for the fitted nozzle+arc.
    The table is the nozzle's raw pressure-vs-flow, *not* the regulated behaviour — the regulator is what
    holds it steady.
  - **The hand-zone nozzle** (`nozzle.stream`) is an open orifice — discharge from its bore and Cd, not a
    table.
- Leaks releasing water wherever present.
- Mass balance: total water out = what the pump supplies; opening or closing anything re-balances the
  whole system.

The calculator works from demands, so every pressure-dependent outlet (each head, the hand nozzle, and
any leak) has to be set up as a pressure-driven discharge fitted from the figures above — flow falling as
pressure drops and rising as it climbs, rather than a fixed amount. This is the core mechanism; get it
right first.

Three things are linked and must be settled together:

- **Automatic valves open themselves by pressure.** Water takes two routes through one at once — the
  main way through, and a side route to a control chamber on the diaphragm. Energising the solenoid (or
  opening the manual bleed) drains that chamber, so the supply pressure lifts the valve open. Several
  faults live in that control circuit.
- **The wiring is a loop** — out to a solenoid and back along a shared return.
- **Everything affects everything** — one pump and pressure-dependent spray mean no branch can be worked
  out on its own.

The everyday states must stay stable, not just a single running zone:

- **Closed and dead zones** — normally three of the four zones are shut. A shut valve isolates a dead-end
  branch; handle it so the calculation stays stable (no false pressures on the isolated part) and that
  part simply reads as not flowing.
- **Pump off** — define the resting state (no flow; static or drained) so "where the water sits" shows
  correctly rather than as an error.
- **Valve won't open** — an automatic valve needs at least its `min_operating_bar` (1.5 bar) at the inlet
  to actually lift, even when energised; below that, report it as commanded-but-not-opening (this drives
  the §6 warning).

## 3. The electrical side

- A valve opens only if its solenoid gets power — the controller calling that zone **and** an unbroken
  wire path to the coil and back — or if its manual bleed is open.
- The pump runs only if it's called for **and** its relay gets the signal **and** mains power reaches it.
- The hand valve and the rotor flo-stops are purely mechanical.
- Track three states per wire/switch for display: **asked-for**, **powered**, **broken**.

## 4. What you can control

The pump; the four automatic zones; the hand-zone valve; each valve's flow-control (throttle screw); each
rotor's flo-stop; each valve's bleed screw. The situation simulated is these settings plus any active faults.

## 5. Faults

The full part-by-part failure list from `graph.yaml`, plus a generic "leak somewhere along a pipe" option.
Effects: a **clog** restricts flow (a full block stops it); a **break** either leaks or disables the part;
a **wrong setting** (throttled flow-control, bleed left open, mis-set nozzle, mis-wiring) misbehaves
accordingly; an **electrical break** stops the valve or pump it feeds from switching on; a **weak pump**
pushes less.

## 6. The picture

- A clean schematic layout (legible, not to scale) — well, pump, main run, valve box, four zones, hand
  zone — with the wiring drawn as a layer over the top (use the icons we already have).
- Water shown visually: bolder lines where more is flowing, colour for pressure, working parts distinct
  from idle ones.
- Every place water leaves — each head, the hand-zone nozzle, any leak — marked with how much, plus a
  running total.
- The wiring shows asked-for / powered / broken.
- Controls and fault switches alongside; updates instantly; a short note when something's off (pump asked
  for more than it can give, or a valve that won't open because pressure's too low).
- Ready-made example situations (all off, one zone running, classic faults).

## 7. Build order

Read and check the files → turn the manufacturer tables into usable numbers (flag anything out of range) →
work out the electrical side (what's on, what's broken) → describe the system to EPANET and confirm a
simple case matches the tables → apply controls and faults, run it, turn results into the picture →
sanity-check (totals balance, height and multi-zone effects behave) → build the page → update the project
docs.

## 8. Decisions (settled)

- **Faults:** full part-by-part list from `graph.yaml`, plus a generic "leak somewhere along a pipe"
  option. (A few part-by-part faults may be awkward to represent inside EPANET — those few are the only
  ones that might need special handling.)
- **Valve detail:** start simple — each automatic valve is open/shut/throttled, with the self-opening
  mechanism shown only as a diagram label and pilot-side faults mapped to a setting or small leak. Fuller
  modelling of the inner workings can come later.
- **Diagram style:** clean schematic, legible and not to scale.
- **Liveness:** steady-state ("set it up, see the settled result") plus a quasi-time mode that steps
  through a sequence of settled states; not full transient simulation.
- **Units:** bar and m³/h (matching the manufacturer tables), with a litres-per-minute toggle.
