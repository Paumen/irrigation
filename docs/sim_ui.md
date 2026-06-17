
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
  - length / distance / height: m
  - arc: degrees

## Diagram
- Holistic — hydraulics, electrical, and state.
- Comprehensible in one view; nothing hidden behind a mode.
- Diagram mostly visual, most text and numbers live in side panel.
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

### Hydraulic view
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
    - a pressure number/badge on pressurised segments
    - line weight or glow scaling with pressure
    - gauge glyphs at key nodes.
- Each head shows its coverage
  - Ideas to reach outcome (apply none, one, or several):
    - fan wedge at the installed arc with radius scaled by solved flow
    - a throw-distance label
    - an output-flow label
    - a nozzle/rotor type icon.

### Electrical view
- "Energised" means carrying current on a closed path, not merely sitting at voltage, so a broken wire reads dead while neighbours stay lit.
  - Ideas to reach outcome (apply none, one, or several):
    - wire dashes
    - energised full colour vs de-energised desaturated
    - a live badge on energised segments
    - broken segments drawn dashed/red.

## Interaction
- Control and inspect from a side panel: controls, states, inputs/outputs, numbers.
- Tapping an item shows its live values and controls, read against what it can actually do — catalog context (head flow span, pump curve, valve loss range).
- Controls live at item level: 
  - pump on bool
  - auto valves
  - manual valve handle bool
  - grid power bool
  - adapter power bool
  - flow-control (0, 0.25, 0.5, 0.75, 1)
  - bleed screw bool
  - solenoid bleed bool (turning the solenoid a quarter turn opens the pilot/solenoid port)
  - well wet/dry
  - Flo-stop bool
  - arc
  - nozzle
- Change any control and the whole system updates at once — every derived value and animation follows.
