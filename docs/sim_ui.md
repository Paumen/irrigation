
## Purpose
A scenario explorer — set controls, watch the system respond.

Requirements carry stable `U` IDs so milestones can cite them (`sim_build_plan.md`).
An ID is permanent once assigned; the "Ideas to reach outcome" lists under a
requirement are non-binding menus (apply none, one, or several), not requirements.

## Review status
Tracks which requirements are settled vs. still being worked. Locked = wording agreed,
treat as ground. Open = unresolved question noted below; not final.

- **Locked (final):** U1, U2, U4, U5
- **Open / to improve:**
  - **U3** — degree of "very compact" unresolved: "tight, professional-dense" vs.
    "ultra-minimal, hide-until-tapped". Deferred — too much to settle now.
  - **U6** — "holistic" is fuzzy: both domains in one picture vs. complete/nothing-omitted
    vs. coupling-made-legible (likely all three). Also clarify the U6/U7 split (what's
    depicted vs. how it's presented).

## Style
- **U1** — Light theme.
- **U2** — Mobile-first, phone portrait is the primary target; on wider screens the layout scales
  up to a comfortable bounded width (neither a thin phone-width strip nor full-bleed).
- **U3** — Very compact.
  - Ideas to reach outcome (apply none, one, or several):
    - minimal whitespace/padding
    - limited or no titles/headers
    - minimal text
    - progressive disclosure
    - dense/tabular number layout
    - icon-only controls
- **U4** — Units (with display precision):
  - flow: m³/h — 2 decimals
  - pressure: bar — 1 decimal
  - length / distance / height / throw: m — 1 decimal
  - arc: degrees — 0 decimals
  - precipitation rate: mm/h — 1 decimal
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
- **U8** — Diagram stays the main view; most text and numbers live in the panel (U25), not on
  the diagram.
- **U23** — Only two kinds of number appear on the diagram itself — pump pressure and each
  head's flow rate; every other number lives in the panel.
- **U9** — Each item carries status indicator(s) — the per-item readings in
  `sim_state_model.md` (plus the `live` state primitive for electrical items, which is not a
  reading), mapped by item type:
    - valve → `open`
    - head → `watering` / `starved`
    - pump → `primed`
    - source, pipes, joints, chambers → `pressurised`, shown graduated by pressure magnitude (U13)
    - electrical items → `live`
- **U24** — Every indicator also has a resting form, shown when its active reading is absent and
  never left blank: head idle (no `pressure`/`flow`, neither `watering` nor `starved`), valve
  closed (not `open`), hydraulic item dry (not `pressurised`), pump unprimed (not `primed`),
  electrical item de-energised (not `live`).
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
- **U13** — Pressurised items obvious at a glance, including roughly how hard — the indicator is
  graduated by pressure magnitude, not just on/off.
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
- **U21** — When the solve does not converge — the fixed-point valve loop never settles on
  stable `pressure`/`flow` — the view says so plainly rather than showing numbers that look real
  but aren't.
- **U22** — A property is set in exactly one place, the panel; where the same property also
  appears on the diagram (e.g. the arc as a wedge) that is a read-only reflection, not a second
  control.
- **U25** — The panel is a card/sheet that slides in from the right when an item is selected on
  the diagram, partially overlaying the diagram (which stays the main view, U8).

## Deferred
- **fault injection** — fault injection and any fault-related UI are deferred until the
  fault engine lands (`sim_build_plan.md` M8).
- HTML and CSS legacy browser fallbacks.
- Accessibility functionalities like ARIA, reduced motion, colorblindness.
- Scenario lifecycle — reset, presets, persistence.
