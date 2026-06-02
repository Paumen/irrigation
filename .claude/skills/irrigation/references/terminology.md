---
name: terminology
summary: House vocabulary for the irrigation skill — the canonical word to use when several mean the same thing, a one-line gloss per domain term, and the writing conventions that keep the docs consistent and jargon-light.
read_when: writing or editing any skill / knowledge / playbook prose, or when unsure which of two words to use.
---

# Terminology & house vocabulary

The canonical vocabulary for this skill and its knowledge files. `SKILL.md` *Audience and
language* is the short, enforced version; this is the long reference. Derived from a
word-frequency study of the skill + knowledge + `setup.yaml` files.

## Conventions
1. **Lead with the canonical term.** Mention an alias once in parentheses on first use only if
   it aids recognition, then stay canonical.
2. **Generic in prose; model only when identity is the point.** Use the role word ("valve",
   "controller") in prose; cite a specific model id (from `setup.yaml`) only in identify / replace
   contexts. Keep model and brand names out of this glossary.
3. **Metric only — no imperial units.** bar, m, L, °C, EUR; convert vendor figures to metric.
   Keep nominal **inch thread/pipe sizes** (1", ¾") and inch-based model names (I-20-04 = 4" body):
   those are standard product designations, not measurements. Where a vendor table's units are
   genuinely ambiguous, keep the provenance caveat rather than guess.
4. **Name failure modes by F-code** (`F<component>.<mode>.<instance>`; see `docs/fcode_spec.md`).
5. **Keep these near-homonyms distinct — never merge them:**
   - **pump-start relay** (PSR) vs **regulated spray body** (PRS) — a relay vs a head.
   - **fitting** (hose/pipe joiner) vs **splice** / wire connector (wire joiner).
   - **port** (mechanical opening) vs **terminal** (electrical post).
   - **thread** vs **barb** — alternative outlet types, not synonyms.
6. **No new jargon** unless it's added here.

## Glossary

### System & water path
- **irrigation** — the whole watering system: pump → valves → heads.
- **pump** — the well pump; the system's water + pressure source and its only shutoff. 230 V power → pro-only.
- **well** — the borehole the pump draws from (the water source).
- **manifold** — the fitting where the main hose fans out to the zone valves.
- **zone** — one valve + its lateral hose + heads; run one at a time.
- **hose** — the poly water line (main and laterals). Use **pipe** only for rigid PVC that a hose cannot replace (e.g. a rigid SCH80 riser nipple).
- **run** — to operate a zone, or one watering cycle.

### Fittings (hose/pipe joiners)
- **fitting** — a hose or pipe joiner; sub-types **fitting-manifold**, **fitting-tee**, **fitting-swing-joint**, **fitting-cap**.
- **inlet / outlet** — the upstream / downstream ports of a valve or fitting.
- **male thread / female thread** — the two mating thread genders.
- **barb** — a ribbed poly-hose outlet (an alternative to threads).
- **Teflon tape** — thread-seal tape on a male thread.

### Valve
- **valve** — automatic zone valve; opens / closes a zone.
- **valve-body** — the globe housing, inline inlet / outlet.
- **valve-bonnet** — the valve's top cover.
- **valve-diaphragm** — the rubber membrane that seals or opens the water path.
- **valve-solenoid** — the 24 VAC electromagnet that pilots the valve open.
- **solenoid-plunger** — the pin the solenoid lifts to release pressure above the diaphragm.
- **bleed screw** — manual valve-open for testing.
- **flow-control knob** — throttles a zone's flow at the valve.
- **exhaust port** — the opening in the bonnet that the solenoid-plunger uncovers to drain the upper chamber (the port itself, distinct from the plunger that covers it).

### Heads & spray
- **head** — the sprinkler that delivers water. Two types here ↓
- **heads-rotor** — gear-drive rotating head.
- **heads-rotor-turret** — the rotating nozzle-top of a rotor.
- **heads-rotor-popup** — the retractable stem that rises under pressure.
- **spray body** — a pop-up spray head (here, the pressure-regulated type).
- **nozzle** — the orifice that sets a head's flow and radius.
- **rotator** — a multi-stream nozzle type.
- **arc** — a head's sweep angle (degrees).
- **radius** — how far a head sprays.

### Pressure, flow & regulation
- **bar** — the pressure unit.
- **flow** — water volume per zone (m³/h).
- **regulator / regulation** — pressure control: at-head spray body, per-valve, or system tier.
- **low-head drainage** — low heads weep after shutoff when water above a failed check valve drains out.
- **drainage / drain** — water leaving the line.
- **leak** — water escaping where it shouldn't. A valve *weeps* (a slow leak when off) — keep "weep" where it names that specific symptom.
- **clog** — a blockage (debris / grit).
- **filter** — the screen / mesh that catches debris.

### Electrical & control
- **controller** — programmable timer; schedules zones, sends 24 VAC.
- **relay** — the pump start relay; its low-voltage coil switches the 230 V supply to the pump.
- **wire / wiring** — the 24 VAC low-voltage control cable.
- **conductor** — a single wire.
- **common** — the shared return wire (C).
- **ground** — the earth wire.
- **terminal** — an electrical screw post on the controller / relay.
- **voltage** — electrical potential (24 VAC control side, power supply on the pump side).
- **MV (P/MV)** — the controller's pump-start terminal.
- **signal** — the control pulse to a valve.
- **sensor** — a rain / wind / flow detector.
- **splice** — a waterproof wire joint (a wire connector).
- **coil** — the winding inside the solenoid or relay.

### Tools & measurement
- **multimeter** — meter for voltage / continuity / resistance.
- **probe** — a multimeter test lead.
- **gauge** — a pressure / flow dial.
- **resistance** — ohms, read on the multimeter.

### Diagnostics
- **failure mode** — a diagnosable root cause, formally an **F-code** (use this, not "cause").
- **fault / failure** — a broken state.
- **symptom** — the observable problem the homeowner reports.
- **suspect** — a likely failure mode under consideration (use this, not "candidate").

### Skill loop
- **question / answer / option** — the diagnostic Q&A loop.
- **effect / effects** — the weights an answer applies to the ranked failure modes.
- **step** — one instruction in a procedure.
- **playbook** — a skill task script (troubleshoot, identify, capacity, …).

## Canonical term map (use the left, not the right)
Safe substitutions — the right word should be avoided in prose:

| Use | Not |
|---|---|
| pump | engine |
| irrigation system | sprinkler system |
| head / rotor | sprinkler |
| well | (water) source |
| power supply | mains *(but "mains-voltage" is fine as a safety term)* |
| hose | tube, lateral, garden hose, **pipe** *(except rigid PVC)* |
| manual valve | ball valve |
| app | software |
| m / L / bar / °C | ft, gallon, psi |
| arc | angle |
| multimeter | meter |
| splice | wire connector |
| radius | throw |
| length | distance |
| Teflon tape | PTFE tape |
| failure mode | cause |
| suspect | candidate |

Words to **keep** because they carry specific meaning (don't collapse to a generic): **weep**
(valve leaking when off), **flush** (clearing a line), **clog**, **bleed**, **barb**, **diaphragm**.
