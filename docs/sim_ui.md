
## Purpose
A scenario explorer — set controls, watch the system respond.

Requirements carry stable `U` IDs so milestones can cite them (`sim_build_plan.md`).
An ID is permanent once assigned; the "Ideas to reach outcome" lists under a
requirement are non-binding menus (apply none, one, or several), not requirements.

## Style
- **U1** — Light theme.
- **U2** — Mobile-first, phone portrait.
- **U3** — Very compact.
  - Ideas to reach outcome (apply none, one, or several):
    - minimal whitespace/padding
    - limited or no titles/headers
    - minimal text
    - progressive disclosure
    - dense/tabular number layout
    - icon-only controls
- **U4** — Units:
  - flow: m³/h
  - pressure: bar
  - length / distance / height / throw: m
  - arc: degrees
  - precipitation rate: mm/h
- **U5** — Assume latest Chromium; latest/modern HTML elements and CSS features can be
  used (legacy fallbacks are a non-goal, see Deferred).
  - Ideas to reach outcome (apply none, one, or several):
    - @property
    - anchor positioning
    - offset Path/Distance
    - dialog
    - command/commandfor
    - colormix
    - meter

## Diagram
- **U6** — Holistic hydraulics and electrical.
- **U7** — Comprehensible in one view; nothing hidden behind a mode.
- **U8** — Diagram mostly visual; most text and numbers live in a panel beside the diagram,
  which stays the main view.
- **U9** — Each item carries status indicator(s) — the per-item readings in
  `sim_state_model.md`, mapped by item type:
    - valve → `open`
    - head → `watering` / `starved`
    - pump → `primed`
    - source, pipes, joints, chambers → `pressurised`
    - electrical items → `live`
- **U10** — Every connection traceable end to end.
- **U11** — No ambiguous crossing or dangling connection.
  - Ideas to reach outcome for U10–U11 (apply none, one, or several):
    - orthogonal routing
    - per-terminal colour-coding
    - lane spacing for parallel runs
    - junction dots on real connections
    - hops where lines merely cross.

### Hydraulic visualization
- **U12** — Flow clear at a glance — where it goes and roughly how much.
  - Ideas to reach outcome (apply none, one, or several):
    - colour gradient along hoses scaling with flow
    - droplet/dash density scaling with flow
    - droplet/dash speed scaling with flow
    - line thickness scaling with flow.
    - paced droplets
    - pulsing lines
- **U13** — Pressurised items obvious at a glance, including roughly how hard.
  - Ideas to reach outcome (apply none, one, or several):
    - hose fill/saturation scaling with pressure
    - a pressure number/badge on pressurised items
    - line weight or glow scaling with pressure
    - gauge glyphs at key nodes.
- **U14** — Each head shows its coverage.
  - Ideas to reach outcome (apply none, one, or several):
    - fan wedge at the installed arc, radius scaled to throw against the head's max range
    - drag the wedge edges to set the arc
    - a throw-distance label
    - an output-flow label
    - a nozzle/rotor type icon.
- **U15** — Each head shows its precipitation rate (mm/h).

### Electrical visualization
- **U16** — A component is drawn live when it carries the `live` primitive
  (`sim_state_model.md`).
  - Ideas to reach outcome (apply none, one, or several):
    - wire dashes
    - energised full colour vs de-energised desaturated
    - a live badge on energised segments
    - broken segments drawn dashed/red.

## Interaction
- **U17** — Control and inspect from the panel: controls, states, inputs/outputs, numbers.
- **U18** — Tapping an item shows its live values and controls, read against what it can
  actually do — catalog context (head flow span, pump curve, valve loss range).
- **U19** — Controls live at item level. The canonical surface is the eight controls in
  `sim_state_model.md`.
- **U20** — Change any control and the whole system updates at once — every derived value
  and animation follows.
- **U21** — When the system can't settle on a stable answer — it never balances out — the
  view says so plainly rather than showing numbers that look real but aren't.
- **U22** — Each property has one home: where it is both shown and set, that visual is its
  control (arc is the wedge), never a duplicate widget.

## Deferred
- **fault injection** — fault injection and any fault-related UI are deferred until the
  fault engine lands (`sim_build_plan.md` M8).
- HTML and CSS legacy browser fallbacks.
- Accessibility functionalities like ARIA, reduced motion, colorblindness.
- Scenario lifecycle — reset, presets, persistence.
