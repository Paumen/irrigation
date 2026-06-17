
## Purpose
A scenario explorer — set controls, watch the system respond.

## Look and feel
- Light theme.
- Mobile-first, phone portrait.
- Very compact
  - Ideas to reach outcome (apply none, one, or several):
    - minimal whitespace/padding
    - limited or no titles/headers
    - minimal text
    - progressive disclosure
    - dense/tabular number layout
    - icon-only controls
- Units:
  - flow: m³/h
  - pressure: bar
  - length / distance / height / throw: m
  - arc: degrees
  - application rate (precip): mm/h

## Diagram
- Holistic — hydraulics, electrical, and state.
- Comprehensible in one view; nothing hidden behind a mode.
- Diagram mostly visual, most text and numbers live in a side sheet.
- Item carries a status indicator.
- Every connection traceable end to end, nothing crossing or dangling 
  - Ideas to reach outcome (apply none, one, or several):
    - orthogonal routing
    - per-terminal colour-coding
    - lane spacing for parallel runs
    - junction dots on real connections 
    - hops where lines merely cross.
- Active items are obviously alive, idle ones recede
  - Ideas to reach outcome (apply none, one, or several):
    - watering heads animate while idle ones grey out
    - full vs reduced opacity
    - full colour vs muted/outline-only
    - subtle pulse on active status indicators.
    - icons representing state

### Hydraulic visualization
- Flow clear at a glance — where it goes and roughly how much.
  - Ideas to reach outcome (apply none, one, or several):
    - colour gradient along hoses scaling with flow
    - droplet/dash density scaling with flow
    - droplet/dash speed scaling with flow
    - line thickness scaling with flow.
    - paced droplets 
    - pulsing lines

 
- Pressurised items obvious at a glance, including roughly how hard
  - Ideas to reach outcome (apply none, one, or several):
    - hose fill/saturation scaling with pressure
    - a pressure number/badge on pressurised items
    - line weight or glow scaling with pressure
    - gauge glyphs at key nodes.
- Each head shows its coverage
  - Ideas to reach outcome (apply none, one, or several):
    - fan wedge at the installed arc, sized to how far the head actually throws
    - a throw-distance label
    - an output-flow label
    - a nozzle/rotor type icon.

### Electrical visualization
- "Energised" means carrying current on a closed path, not merely sitting at voltage, so a broken wire reads dead while neighbours stay lit.
  - Ideas to reach outcome (apply none, one, or several):
    - wire dashes
    - energised full colour vs de-energised desaturated
    - a live badge on energised segments
    - broken segments drawn dashed/red.

## Interaction
- Control and inspect from a side sheet: controls, states, inputs/outputs, numbers.
- Tapping an item shows its live values and controls, read against what it can actually do — catalog context (head flow span, pump curve, valve loss range).
- Controls live at item level: 
  - pump on bool
  - auto valve open bool (the controller's zone command; a broken wire can leave it commanded but not energised)
  - manual valve handle bool
  - grid power bool
  - adapter power bool
  - flow-control (0, 0.25, 0.5, 0.75, 1)
  - bleed screw bool
  - solenoid bleed bool (turning the solenoid a quarter turn opens the pilot/solenoid port)
  - Flo-stop bool
  - arc
  - nozzle
- Change any control and the whole system updates at once — every derived value and animation follows.
- When the system can't settle on a stable answer — it never balances out — the view says so plainly rather than showing numbers that look real but aren't.

## Prerequisites

### Available
The engine now accepts these as live commands on the `state` object (`state.nozzle` / `state.arc` / `state.solenoidBleed` / `state.floStop`), so the UI can expose them.
- **arc / nozzle as controls** — accepted at runtime; the catalog constrains the valid choices (rotor nozzle sizes vs. spray family/arc combinations) via `validOutletOptions` / `validateOutletOverrides` in `sim/src/outlets.js`. Rotor arc is geometry-only (precip); spray arc is a flow-table key. The catalog carries the full I-20 nozzle set (blue/grey/black/green) and all MP arcs.
- **solenoid bleed** — a manual quarter-turn override lifts the plunger / opens the pilot seat even with a dead coil, opening the valve once inlet pressure is available.
- **Flo-stop as a control** — engaging it now shuts the head's outlet off in the hydraulic solve (zero flow and throw), not just the qualitative state badge.

### Deferred
The UI can't expose these until the engine lands them; this UI commands controls only.
- **fault injection** — the engine runs a no-fault baseline today (`faults.js` is an M9 stub), so fault injection and any fault-related UI are deferred until the fault engine lands.
- **Item status vocabulary** — the set of per-item statuses the diagram shows must be defined and shared with the side sheet (e.g. active, idle, commanded-but-not-acting, faulted, dead), so both read from one taxonomy.
