**Layout & shell**

1. The UI is a single unified view with no mode switching, light theme only, mobile-first.
2. All flow values display in m³/h everywhere, with no unit toggle.

**Live schematic state**

3. Node and pipe pressure renders as a continuous red→green gradient; branches outside the solver's `reachable` set render desaturated grey instead.
4. Flow direction and magnitude show as droplet particles along links, speed/density proportional to flow.
5. Energized electrical paths have particles as wire traces overlaid alongside the hydraulic schematic.
6. Each head draws a fan wedge at its installed arc angle with radius scaled by its actual solved flow.
7. Faults are visible in place: leaks and seal failures as animated symptom glyphs (gush, weep, geyser) at their anchor junction annotated with leak flow; all other active faults as a warning badge that opens the component's sheet.

**Interaction**

8. Tapping any component opens a bottom sheet that starts compact and expands to full screen on swipe-up.
9. The bottom sheet contains, in one scroll: live values (pressure, flow, valve state including commanded-but-not-opening), min/max, that component's actions, and its fault toggles from `listFaults`.
10. Actions are per component type: valves — bleed screw, throttle stepper, manual handle, floStop; controller — MV and zone 1–4 commands; power plugs — grid/adapter on-off.
11. Faults are injected only by tapping a component, with no separate fault list or presets; clog severity in fixed steps of 25 / 50 / 75 / full.
12. The solver re-runs debounced on every state change; on failure (non-convergence, `valvesFrozen`) it keeps the last good state and shows a badge revealing solver internals on tap.

