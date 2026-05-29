# Sources & routing

How to use this file: the engine returns root-cause **areas** (F1–F9). Resolve the area here to its
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

### F1 — App / control
- Local doc: none yet.
- Fallback: RainMachine app + support (https://support.rainmachine.com/), then web.

### F2 — Controller 
- Local doc: `knowledge/controller.md` — **partial** (voltage-at-terminals test only).
- Read when: checking the controller outputs 24–28 VAC on a station; isolating controller vs downstream.
- Fallback: RainMachine support (https://support.rainmachine.com/), then web. No local PDF.

### F3 — Field wiring (24 V low-voltage)
- Local doc: `knowledge/wiring.md` — **partial** (wire-distance table, connectors, isolation tests).
- Read when: a conductor/splice/common is suspected; excluding wire length; isolating wiring vs valve vs controller.
- Fallback: Hunter support (https://www.hunterindustries.com/support), then web.

### F4 — Pump start relay 
- Local doc: `knowledge/relay.md`.
- Read when: pump won't start while the controller calls; relay chatters/buzzes; rewiring the relay.
- Fallback: `media/PSR52.pdf`, then Hunter support (https://www.hunterindustries.com/support).

### F5 — Pump 
- Local doc: none yet.
- Fallback: DAB product documentation (web), then IrrigationTutorials.com (pump/hydraulics), then Hunter support.

### F6 — Main line 
- Local doc: none yet.
- Fallback: IrrigationTutorials.com (hydraulics, common-failure patterns), then web.
- Design context: Hunter's "Controlling High Pressure" article (residential rotors) describes
  whole-system pressure regulation as the coarsest of three tiers (system-wide → per-valve →
  at-the-head). Not fitted on this system; the regulation that exists is at the head, via the
  PRS40 bodies. See `knowledge/valve.md` *Per-valve pressure regulation (Accusync)* for the
  tier comparison.

### F7 — Zone valve
- Local docs: `knowledge/valve.md` (whole-valve, entry point) → deeper: `knowledge/valve-internals.md`, `knowledge/valve-solenoid.md`.
- Read when: engine points at the valve area; install/replace; "how does it work"; any valve symptom — then go deeper to internals (diaphragm/spring/seat/metering) or solenoid (coil/plunger/ports) as the symptom narrows.
- Fallback: `media/PGV101G.pdf`, then Hunter support (https://www.hunterindustries.com/support).

### F8 — Zone laterals 
- Local doc: `knowledge/laterals.md` — **partial** (broken-lateral signature, field-diagnosis
  steps, dead-end winterization rule, cap-off/shorten-lateral procedure).
- Read when: a whole zone is weak with no fault visible at the heads; one or more heads on a
  zone won't pop up while siblings on the same zone are fine; a persistent wet patch or soft
  ground along a known lateral run; you're removing a head or restructuring a zone and a stub
  will be left behind; you suspect recent garden / fence / driveway work damaged a pipe.
- Fallback: IrrigationTutorials.com, then web. Hunter's "Rotor Not Fully Popping Up" article
  has the textbook broken-lateral signature ("look for new trees and shrub plantings, new or
  repaired fences"); that material is already folded into `laterals.md`.

### F9 — Heads 
- Local doc: `knowledge/heads.md` — entry point covering all three head-side components for this system
  (rotors, regulated bodies, MP nozzles), with the MP ↔ PRS40 pairing and low-head drainage diagnosis.
- Read when: engine points at the heads area (F9); rotor won't pop up / won't rotate / wrong arc; misting at
  a head; low-head drainage suspected at the lowest head; replacing a nozzle or a body.
- Fallback: `media/I20.pdf`, `media/ProSpraytm PRS40.pdf`, `media/Standard MP Rotator Nozzle.pdf`,
  `media/RC-219-MP820-...pdf` (MP Rotator written specs — has the bar/kPa conversions, materials, mesh
  sizes), then Hunter support. The `.doc` equivalents for I-20 and Pro-Spray are **older but richer**
  than the current `.pdf` spec sheets (regulator-activation differential, FloGuard diagnostic, full body
  dimensions, cap markings) — worth reading when the PDFs don't answer.

## Web sources 

- **RainMachine HD-16 TOUCH controller** — https://support.rainmachine.com/
- **Hunter Industries support** — https://www.hunterindustries.com/support — vendor-authored
  troubleshooting for valves, rotors, controllers, sensors.
- **IrrigationTutorials.com** — articles by Jess Stryker (irrigation engineer); strong on design,
  hydraulics, and common-failure patterns.
- **DAB** — manufacturer documentation for the well pump (F5).

## What not to cite

- Search results older than ~10 years.
- PSR-B booster material — not fitted on this system; out of scope.
