
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
- A component is drawn live when it carries the `live` primitive (`sim_state_model.md`) — on a closed current-carrying path, not merely sitting at voltage — so a broken wire reads dead while neighbours stay lit.
  - Ideas to reach outcome (apply none, one, or several):
    - wire dashes
    - energised full colour vs de-energised desaturated
    - a live badge on energised segments
    - broken segments drawn dashed/red.

## Interaction
- Control and inspect from a side sheet: controls, states, inputs/outputs, numbers.
- Tapping an item shows its live values and controls, read against what it can actually do — catalog context (head flow span, pump curve, valve loss range).
- Controls live at item level. The canonical surface is the eight controls in
  `sim_state_model.md` (controller port energize, manual handle, throttle, bonnet bleed, solenoid
  bleed, head shut-off, nozzle/arc) — this file does not restate it. The operator sets **nothing
  else**: the world-edge states (mains, well, prime) have no control widget — they sit at their
  healthy default and move only under fault injection. UI-specific affordance: render the throttle as
  five discrete stops (0, 0.25, 0.5, 0.75, 1). A valve's open/closed is **not** a control — it is a
  reading of the solve.
- Change any control and the whole system updates at once — every derived value and animation follows.
- When the system can't settle on a stable answer — it never balances out — the view says so plainly rather than showing numbers that look real but aren't.

## Prerequisites
- **Item status vocabulary** — the per-item statuses the diagram and side sheet share are the
  **readings** over the state primitives (`open`/`pressurised`/`primed`/`watering`/`starved`), defined
  in `sim_state_model.md`. Both the diagram and the side sheet read from that one taxonomy.

### Deferred
- **fault injection** — the engine runs a no-fault baseline today (`faults.js` is a stub), so fault injection and any fault-related UI are deferred until the fault engine lands.

