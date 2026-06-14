# Irrigation System Simulator — Build Spec

**Inputs:** `system.yaml` (the former `graph.yaml` + `catalog.yaml` + `context.yaml`, merged into one document) — its graph sections (layout, wiring, and each part's possible failures), its catalog sections (pump/valve/nozzle tables), and its context sections (labels/background).

## 1. What to build

- An interactive page in a web browser, running fully in the browser — static page, no server.
- Water pressure and flow computed by **EPANET**, with our own layer feeding it the system and reading results back.
- Friction calculated by the Darcy–Weisbach method, using the per-hose smoothness value in `system.yaml`.
- Any individual part can be broken — the full part-by-part failure list from `system.yaml`.
- Shows the settled (steady-state) result instantly, and also a quasi-time mode that steps through a
  sequence of settled states.
- Pressures in bar and flows, with a litres-per-minute toggle.

## 2. Water behaviour to reproduce

The result must reflect:

- Hose friction.
- Height — the pump lifts water up to each head's elevation.
- The pump curve from `system.yaml`.
- Valve and fitting resistance — the automatic valve's loss from the `valve_loss` table in
  `system.yaml`; the hand valve from its `Kv` rating (it has no catalog loss curve).
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

- **Closed and dead zones** — A shut valve isolates a dead-end
  branch; handle it so the calculation stays stable (no false pressures on the isolated part) and that
  part simply reads as not flowing.
- **Valve won't open** — an automatic valve needs at least its `min_operating_bar` (1.5 bar) at the inlet
  to actually lift, even when energised; below that, report it as commanded-but-not-opening.

## 3. The electrical side

- A valve opens only if its solenoid gets power — the controller calling that zone **and** an unbroken
  wire path to the coil and back — or if its manual bleed is open.
- The pump runs only if it's called for **and** its relay gets the signal **and** mains power reaches it.
- The hand valve and the rotor flo-stops are purely mechanical.
- Track three states per wire/switch for display: **asked-for**, **powered**, **broken**.

## 4. What you can control

The pump; the valves; each auto-valve flow-control (throttle screw); each
rotor's flo-stop; each valve's bleed screw. The situation simulated is these settings plus any active faults.

## 5. Faults

The full part-by-part failure list from `system.yaml`.
Effects: a **clog** restricts flow (a full block stops it); a **break** either leaks or disables the part;
a **wrong setting** (eg  mis-set nozzle, mis-wiring) misbehaves
accordingly; an **electrical break** stops the valve or pump it feeds from switching on.

## 6. The picture

- A clean schematic layout. all equipment.
- Water shown visually: bolder lines where more is flowing, colour for pressure, working parts distinct
  from idle ones.
- Every place water leaves — each head or nozzle, any leak — marked with how much.
- The wiring shows asked-for / powered / broken.
- Controls and fault switches alongside.
