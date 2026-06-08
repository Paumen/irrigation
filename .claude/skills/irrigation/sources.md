# Sources & routing

How to use this file: the engine returns failure-mode **areas** (F1–F9). Resolve the area here to its
subject doc and read that first — `knowledge/` docs are normalized to EU units and the skill's
vocabulary. If the local doc doesn't cover the symptom, fall back down the ladder: **local
`knowledge/` doc → raw vendor PDF in `media/` → web**. Consult this at *confirm* time (the engine has
named an area) as well as at a dead-end, not only when stuck.

Each subject doc carries its own `summary` / `read_when` / `contents` front-matter — that's the same
signal living with the file, so grep and retrieval-tool reads resolve without this table. This table
is the explicit path map for whole-file / by-path reads.

Paths (`knowledge/…`, `media/…`) are relative to this skill folder — both directories live here,
next to this file — matching how the agent resolves files at runtime.

## Routing by failure-mode area

### F1 — App / control
- Local doc: `knowledge/app.md` — **partial** (control paths, weather-adaptive programs, zone
  properties + master-valve toggle, manual run / valve testing, restrictions, sensor software setup,
  the zone-won't-turn-on software path, remote access).
- Read when: a program / restriction / zone property / sensor *software* setting; assigning a zone as
  master valve in the app; a zone runs manually but not on schedule (logic, not hardware).
- Fallback: RainMachine app + support (https://support.rainmachine.com/), then web.

### F2 — Controller 
- Local doc: `knowledge/controller.md` — **partial** (terminal block & power, master-valve/pump and
  rain/flow sensor *wiring*, Wi-Fi setup/recovery, the zone-won't-run hardware path, voltage-at-terminals
  test). Software/scheduling is in `knowledge/app.md` (F1).
- Read when: wiring the controller; checking it outputs 24–28 VAC on a station; isolating controller vs
  downstream; Wi-Fi won't connect / "WiFi Settings Error".
- Fallback: RainMachine support (https://support.rainmachine.com/), then web. No local PDF.

### F3 — Field wiring (24 V low-voltage)
- Local doc: `knowledge/wiring.md` — **partial** (wire-length table, connectors, isolation tests).
- Read when: a conductor/splice/common is suspected; excluding wire length; isolating wiring vs valve vs controller.
- Fallback: Hunter support (https://www.hunterindustries.com/support), then web.

### F4 — Pump start relay 
- Local doc: `knowledge/relay.md`.
- Read when: pump won't start while the controller calls; relay chatters/buzzes; rewiring the relay.
- Fallback: Hunter support (https://www.hunterindustries.com/support), then web.

### F5 — Pump 
- Local doc: `knowledge/pump.md` — DAB AquaJet / AquaJet-INOX booster set (this system's pump is the AquaJet 132 M): technical/electrical data per model, head-vs-flow curves, install, start-up & priming, maintenance, cable replacement, pressure-switch & tank pre-charge setup, full troubleshooting table.
- Read when: engine points at the pump (F5); pump won't start / hums / won't prime / won't build pressure; short-cycling or won't stop; setting pressure-switch cut-in/cut-out or tank pre-charge; replacing the power cable; sizing/choosing an AquaJet model; winterising the pump.
- Fallback: DAB product documentation (web), then IrrigationTutorials.com (pump/hydraulics), then Hunter support.

### F6 — Main hose 
- Local doc: none yet.
- Fallback: IrrigationTutorials.com (hydraulics, common-failure patterns), then web.
- Design context: Hunter's "Controlling High Pressure" article (residential rotors) describes
  whole-system pressure regulation as the coarsest of three tiers (system-wide → per-valve →
  at-the-head). Not fitted on this system; the regulation that exists is at the head, via the
  PRS40 bodies. See `knowledge/valve.md` *Per-valve pressure regulation (Accusync)* for the
  tier comparison.

### F7 — Zone valve
- Local docs: `knowledge/valve.md` (whole-valve, entry point) → deeper: `knowledge/valve-internals.md`, `knowledge/valve-solenoid.md`; for choosing a replacement model, `knowledge/valve-replacement.md` (PGV/ICV drop-in table).
- Read when: engine points at the valve area; install/replace; "how does it work"; any valve symptom — then go deeper to internals (diaphragm/spring/seat/metering) or solenoid (coil/plunger/ports) as the symptom narrows; sourcing a replacement valve → `valve-replacement.md`.
- Fallback: Hunter support (https://www.hunterindustries.com/support), then web.

### F8 — Zone hoses 
- Local doc: `knowledge/hoses.md` — **partial** (broken-hose signature, field-diagnosis
  steps, dead-end winterization rule, cap-off/shorten-hose procedure).
- Read when: a whole zone is weak with no fault visible at the heads; one or more heads on a
  zone won't pop up while siblings on the same zone are fine; a persistent wet patch or soft
  ground along a known hose run; you're removing a head or restructuring a zone and a stub
  will be left behind; you suspect recent garden / fence / driveway work damaged a hose.
- Fallback: IrrigationTutorials.com, then web. Hunter's "Rotor Not Fully Popping Up" article
  has the textbook broken-hose signature ("look for new trees and shrub plantings, new or
  repaired fences"); that material is already folded into `hoses.md`.

### F9 — Heads 
- Local docs: `knowledge/heads.md` (entry — I-20 rotors + the head overview + low-head drainage) →
  deeper: `knowledge/heads-spray.md` (Pro-Spray PRS40 bodies, MP Rotator nozzles, MP ↔ PRS40 pairing).
- Read when: engine points at the heads area (F9). Rotor won't pop up / won't rotate / wrong arc, or
  low-head drainage at the lowest head → `heads.md`; misting at a head, MP won't rotate, regulator, or
  replacing a body/nozzle → `heads-spray.md`.
- Fallback: Hunter support (https://www.hunterindustries.com/support), then web.

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
