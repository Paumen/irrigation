---
subject: Valve internals (diaphragm assembly)
root_cause_area: F7
serves: [troubleshooting, replace, clean, maintain, how-it-works]
parent: valve
summary: The diaphragm-assembly interior — failure modes, internal hydraulics, and the disassembly/inspection procedure.
read_when: narrowed to the valve but can't isolate the cause; conflicting valve feedback; diaphragm, spring, seat, or metering port suspected; cleaning or replacing internals.
contents:
  - components (support ring, diaphragm, spring, metering port)
  - how the internals govern open/close
  - diaphragm failure (tear, wrinkle, perforation, metering clog)
  - seat and seal inspection
  - debris in body (well water / new install)
  - disassembly & inspection procedure (safety-gated)
  - metering-port vs exhaust-port clog
---

# Valve internals — diaphragm assembly

The dense interior of the PGV-101G, split out from `valve.md` because most valve causes are
confirmed or excluded in here, and "read everything about the internals" is a tractable,
high-yield read when feedback about the valve is conflicting. If you have narrowed to the
valve but cannot nail it, read this whole file — the metering behaviour, the failure modes,
and the hydraulics together often shift the reasoning more than any single fact.

## Components

![Internal components — support ring, diaphragm, spring](media/valves-internal-components_0.gif)

- **Diaphragm support ring** — seats and aligns the diaphragm in the body.
- **Diaphragm** — the flexible rubber disc with a plastic centre. The plastic centre carries
  the **metering port(s)**: small holes that restrict (meter) how much water reaches the upper
  chamber above the diaphragm.
- **Diaphragm spring** — holds the diaphragm against its seat; should compress and bounce back.

## How the internals govern open/close

A small orifice/metering port in the diaphragm lets water bleed up into the upper chamber. Because
the area above the diaphragm exceeds the area below, the chamber pressure holds the valve shut.
Opening the valve (solenoid or bleed) releases that upper-chamber pressure faster than the metering
port can refill it, the diaphragm lifts, and water flows. The metering port is therefore the choke
point: too clogged and the chamber cannot drain or refill correctly, and the valve closes very
slowly or stays open indefinitely.

## Diaphragm failure

![Tear in the diaphragm](media/valve_tear_in_diaphragm.jpg)

A tear, wrinkle, or perforation in the diaphragm stops the valve from closing — the pressure
balance can no longer hold it on the seat. Inspect for:
- tears, splits, or perforations in the rubber
- wrinkles or distortion
- a clogged metering port in the plastic centre (debris, Teflon shreds, grit) → slow close / stays open

Fix: replace the diaphragm assembly if there is any visible damage or a metering-port clog that
will not rinse clean.

## Seat and seal

The seal seat (in the body, under the diaphragm) must be clean and free of nicks, grooves, or
abrasions. A damaged seat lets water past even with a good diaphragm. Inspect whenever the valve
is open.

## Debris in the body

Examine the valve body and remove any debris, pebbles, or dirty water. New installations without
proper flushing, recent main-line repair, or well water all push debris into the valve where it
lodges between the diaphragm and the seat. This system runs on a well — treat debris as a
first-class suspect, not an edge case.

## Disassembly and inspection (procedure)

> **Safety:** shut off the main water supply first. Opening a valve under pressure is dangerous
> and can injure you.

1. Shut off the main water supply.
2. Unscrew the solenoid (counter-clockwise) and check the plunger is clean and moves freely.
   You can test the solenoid by running that station from the controller and watching whether the
   plunger retracts when energised. (Full solenoid detail: `valve-solenoid.md`.)
3. Unscrew the bonnet screws (or jar top, depending on model). Pull the bonnet away from the body
   **carefully** so you do not lose the diaphragm or spring.
4. The diaphragm may stay in the body or come away captured in the bonnet. Remove the diaphragm and
   spring. **Note the orientation of the diaphragm** so it goes back exactly as it came out.
5. Inspect: the diaphragm should be clean, with no wrinkles, tears, or perforations. The seal should
   be clean, with no nicks, dents, or abrasions. Wash the diaphragm in clean fresh water to clear any
   deposited debris.
6. Check the spring: intact, springs back when compressed.
7. Inspect the body and seat; remove any debris, pebbles, or dirty water; confirm the seat is clean
   and unscored.
8. Reassemble in the same orientation. Replace the diaphragm assembly if anything is visibly damaged.

## Metering-port clog vs. exhaust-port clog

Both cause "won't open / won't close" symptoms but live in different parts:
- **Metering port** (here, in the diaphragm centre) — clog → slow close / stays open. Fix: replace
  diaphragm assembly.
- **Solenoid exhaust/entry ports** (in `valve-solenoid.md`) — clog → may not open or not open fully.
  Fix: flush the port.
A clean coil resistance reading does **not** rule out either port clog — keep both on the table.

## See also
- `valve.md` — operation, install, leak modes, specs, filter/mesh.
- `valve-solenoid.md` — solenoid ports, plunger, voltage/resistance tests.
