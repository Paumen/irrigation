# Sources & routing

How to use this file: the engine returns root-cause **areas** (R1–R9). Resolve the area here to its
subject doc and read that first — `knowledge/` docs are normalized to EU units and the skill's
vocabulary. If the local doc doesn't cover the symptom, fall back down the ladder: **local
`knowledge/` doc → raw vendor PDF in `media/` → web**. Consult this at *confirm* time (the engine has
named an area) as well as at a dead-end, not only when stuck.

Each subject doc carries its own `summary` / `read_when` / `contents` front-matter — that's the same
signal living with the file, so grep and retrieval-tool reads resolve without this table. This table
is the explicit path map for whole-file / by-path reads.

Paths are project-root-relative (`knowledge/…`, `media/…`), matching how the agent resolves files at
runtime.

## Routing by root-cause area

### R1 — App / control (schedule, cloud, app)
- Local doc: none yet.
- Fallback: RainMachine app + support (https://support.rainmachine.com/), then web.

### R2 — Controller (RainMachine HD-16 TOUCH)
- Local doc: `knowledge/controller.md` — **partial** (voltage-at-terminals test only).
- Read when: checking the controller outputs 24–28 VAC on a station; isolating controller vs downstream.
- Fallback: RainMachine support (https://support.rainmachine.com/), then web. No local PDF.

### R3 — Pump start relay (Hunter PSR-52)
- Local doc: `knowledge/relay.md`.
- Read when: pump won't start while the controller calls; relay chatters/buzzes; rewiring the relay.
- Fallback: `media/PSR52.pdf`, then Hunter support (https://www.hunterindustries.com/support).

### R4 — Pump (DAB well pump)
- Local doc: none yet.
- Fallback: DAB product documentation (web), then IrrigationTutorials.com (pump/hydraulics), then Hunter support.

### R5 — Main line (32 mm, pump → valve box)
- Local doc: none yet.
- Fallback: IrrigationTutorials.com (hydraulics, common-failure patterns), then web.

### R6 — Field wiring (24 V low-voltage)
- Local doc: `knowledge/wiring.md` — **partial** (wire-distance table, connectors, isolation tests).
- Read when: a conductor/splice/common is suspected; excluding wire length; isolating wiring vs valve vs controller.
- Fallback: Hunter support (https://www.hunterindustries.com/support), then web.

### R7 — Zone valve (Hunter PGV-101G)
- Local docs: `knowledge/valve.md` (whole-valve, entry point) → deeper: `knowledge/valve-internals.md`, `knowledge/valve-solenoid.md`.
- Read when: engine points at the valve area; install/replace; "how does it work"; any valve symptom — then go deeper to internals (diaphragm/spring/seat/metering) or solenoid (coil/plunger/ports) as the symptom narrows.
- Fallback: `media/PGV101G.pdf`, then Hunter support (https://www.hunterindustries.com/support).

### R8 — Zone laterals (25 mm)
- Local doc: none yet.
- Fallback: IrrigationTutorials.com, then web.

### R9 — Heads (Hunter I-20 rotors, Pro-Spray PRS40, MP Rotator nozzles)
- Local doc: none yet.
- Fallback: `media/I20.pdf` (rotors), `media/ProSpraytm PRS40.pdf` (spray bodies),
  `media/Standard MP Rotator Nozzle.pdf` (nozzles); then Hunter support.
  (`.doc` equivalents exist for I-20 and Pro-Spray; prefer the `.pdf`.)

## Web sources (use when the area's local doc and PDF don't cover the symptom)

- **RainMachine HD-16 TOUCH controller** — https://support.rainmachine.com/
- **Hunter Industries support** — https://www.hunterindustries.com/support — vendor-authored
  troubleshooting for valves, rotors, controllers, sensors.
- **IrrigationTutorials.com** — articles by Jess Stryker (irrigation engineer); strong on design,
  hydraulics, and common-failure patterns.
- **DAB** — manufacturer documentation for the well pump (R4).

## What not to cite

- Search results older than ~10 years.
- PSR-B booster material — not fitted on this system; out of scope.
