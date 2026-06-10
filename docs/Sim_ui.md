**Layout & shell**

1. The UI is a single unified view with no mode switching, light theme only, mobile-first.
2. All flow values display in m³/h everywhere, with no unit toggle.

**Live schematic state**

3. Node and pipe pressure renders as a continuous red→green gradient — red at 0 bar, green anchored at the system's normal operating pressure, pipes interpolating their endpoint node pressures; a powered-but-hydraulically-dead pump renders amber; branches outside the solver's `reachable` set render desaturated grey instead.
4. Flow direction and magnitude show as droplet particles along links, speed/density proportional to flow.
5. Energized wire runs show particle traces overlaid on the schematic. Energized means carrying current on a closed circuit path — wires merely at potential stay unlit; the engine exposes per-wire energization to drive this.
6. Each head draws a fan wedge at its installed arc angle with radius scaled by its actual solved flow.
7. Faults are visible in place: leaks and seal failures as animated symptom glyphs (gush, weep, geyser) at their anchor junction annotated with leak flow; all other active faults as a warning badge that opens the component's sheet. A leak anchored at a head's junction folds into that head's discharge: its glyph renders without a flow figure and the head's wedge and values show the combined discharge.

**Interaction**

8. Tapping any component opens a bottom sheet that starts compact and expands to full screen on swipe-up.
9. The bottom sheet contains, in one scroll: live values (pressure, flow, valve state including commanded-but-not-opening), session min/max of those values since load, that component's actions, and its fault toggles from `listFaults`.
10. Actions are per component type: valves — bleed screw, throttle stepper, manual handle, floStop; controller — MV and zone 1–4 commands; power plugs — grid/adapter on-off (engine commands, not the fault channel).
11. Faults are injected only by tapping a component, with no separate fault list or presets; clog severity in fixed steps of 25 / 50 / 75 / full (severity 1.0). A step below a fault's acting threshold (e.g. pilot-port clogs under 50) is shown as inert rather than silently doing nothing.
12. The solver runs in a worker and re-runs debounced on every state change; on failure (non-convergence, `valvesFrozen`, or a thrown solve) it keeps the last good state and shows a badge revealing solver internals on tap.

**Geometry**

13. Schematic geometry — hydraulic and electrical — is auto-laid-out from `graph.yaml` at load; no hand-authored coordinates.

