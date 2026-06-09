# Irrigation System Simulator — Build Spec

**Inputs (read as-is):** `graph.yaml` (layout, wiring, and each part's possible failures), `catalog.yaml` (pump/valve/nozzle tables), `context.yaml` (labels/background).
**Out of scope:** linking this to the existing troubleshooting tool.

## 1. What to build

- An interactive page in a web browser, running fully in the browser — static page, no server.
- Water pressure and flow computed by **EPANET** (a proven water-network calculator with a browser
  version), with our own layer feeding it the system and reading results back.
- Friction calculated by the Darcy–Weisbach method, using the per-hose smoothness value in `graph.yaml`.
- Any individual part can be broken, per the failure list in `graph.yaml` (scope to confirm — §5).

## 2. Water behaviour to reproduce

The result must reflect:

- Pipe friction (faster flow, and longer/narrower pipes, cost more pressure).
- Height — the pump lifts water up to each head's elevation.
- The pump curve (pushing harder moves less water), from `catalog.yaml`.
- Valve and fitting resistance.
- Heads spraying more at higher pressure, per the nozzle tables; spray heads self-regulate to ~2.76 bar.
- Leaks releasing water wherever present.
- Mass balance: total water out = what the pump supplies; opening or closing anything re-balances the
  whole system.

Three things are linked and must be settled together:

- **Automatic valves open themselves by pressure.** Water takes two routes through one at once — the
  main way through, and a side route to a control chamber on the diaphragm. Energising the solenoid (or
  opening the manual bleed) drains that chamber, so the supply pressure lifts the valve open. Several
  faults live in that control circuit.
- **The wiring is a loop** — out to a solenoid and back along a shared return.
- **Everything affects everything** — one pump and pressure-dependent spray mean no branch can be worked
  out on its own.

## 3. The electrical side

- A valve opens only if its solenoid gets power — the controller calling that zone **and** an unbroken
  wire path to the coil and back — or if its manual bleed is open.
- The pump runs only if it's called for **and** its relay gets the signal **and** mains power reaches it.
- The hand valve and the rotor flo-stops are purely mechanical.
- Track three states per wire/switch for display: **asked-for**, **powered**, **broken**.

## 4. What you can control

The pump; the four automatic zones; the hand-zone valve; each valve's flow-control (throttle screw); each
rotor's flo-stop; each valve's bleed screw. The situation simulated is these settings plus any active faults.

## 5. Faults (scope to confirm)

Per-part, from `graph.yaml`. Effects: a **clog** restricts flow (a full block stops it); a **break** either
leaks or disables the part; a **wrong setting** (throttled flow-control, bleed left open, mis-set nozzle,
mis-wiring) misbehaves accordingly; an **electrical break** stops the valve or pump it feeds from switching
on; a **weak pump** pushes less.

## 6. The picture

- Layout roughly as in real life — well, pump, main run, valve box, four zones, hand zone — with the
  wiring drawn as a layer over the top (use the icons we already have).
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

## 8. Decisions needed before building

1. **Faults** — full part-by-part list, or a common short set first? Add a simple "leak somewhere along
   this pipe" option? (A few part-by-part faults may be awkward to represent inside EPANET — those few are
   the only ones that might need special handling.)
2. **Valve detail** — treat each automatic valve as just open/shut/throttled (self-opening shown only as a
   label), or model its inner workings more fully?
3. **Diagram style** — clean schematic, or true-to-the-garden layout?
4. **Units** — bar and m³/h (matching the tables), litres-per-minute, or a switch?
5. **How "live"** — just set-it-up-and-see-the-result, or also animate filling and draining over time?
