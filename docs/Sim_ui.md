**Layout & shell**

1. The UI is a single unified view with no mode switching, light theme only, mobile-first.
2. All flow values display in m³/h everywhere, with no unit toggle.

**Live schematic state**

3. Node and pipe pressure renders as a continuous red→green gradient — red at 0 bar, green anchored per node at its no-fault baseline: the current control state re-solved with every fault off (re-solved alongside the main solve, so it tracks command changes), clamped at green for pressures above baseline. Pipes interpolate their endpoint node pressures; a powered-but-hydraulically-dead pump renders amber; branches outside the solver's `reachable` set render desaturated grey instead.
4. Flow direction and magnitude show as droplet particles along links, speed/density proportional to flow.
5. Energized wire runs show particle traces overlaid on the schematic. Energized means carrying current on a closed circuit path — wires merely at potential stay unlit; the engine's `solveElectrical` returns the `energisedWires` set to drive this. Every wire renders as its own line, so a single broken wire reads dead while its neighbours stay lit.
6. Each head draws a fan wedge at its installed arc angle with radius scaled by its actual solved flow. The stream nozzle (Z5) draws a straight jet scaled by flow instead of a wedge; caps draw no discharge glyph.
7. Faults are visible in place: leaks and seal failures as animated symptom glyphs at their anchor junction annotated with leak flow — gush for structural breaks (the 6 mm orifice class), weep for seal/drip failures (the 2 mm class), geyser for a head discharging as an open orifice (flush plug left in); all other active faults as a warning badge that opens the component's sheet. A leak anchored at a head's junction folds into that head's discharge: its glyph renders without a flow figure and the head's wedge and values show the combined discharge.

**Interaction**

8. Tapping any component opens a bottom sheet that starts compact and expands to full screen on swipe-up.
9. The bottom sheet contains, in one scroll: live values (pressure, flow, valve state including commanded-but-not-opening), the component's capability range where the catalog defines one (a head's flow span over its nozzle table, the pump curve's head/flow span, the valve's loss-curve range) so live values read in context, that component's actions, and its fault toggles from `listFaults`. The sheet is organised into per-subpart sections: each subpart of the tapped component (from `graph.yaml`'s `kinds.*.parts` / circuit parts) gets its own section holding that subpart's actions (bleed screw, flow-control throttle, flo-stop, handle) and that subpart's fault toggles; component-level actions and subpart-less faults sit in a top section.
10. Actions are per component type: auto valves — bleed screw, throttle stepper; the manual valve — handle; heads — floStop; controller — MV and zone 1–4 commands; power plugs — grid/adapter on-off (`solveElectrical`'s `gridPower`/`adapterPower` commands, not the fault channel).
11. Faults are injected only by tapping a component, with no separate fault list or presets; clog severity in fixed steps of 25 / 50 / 75 / full (severity 1.0). Steps below a fault's acting threshold (e.g. pilot-port clogs under 50) and always-inert faults (e.g. a rotor's gear or check valve) are shown as inert rather than silently doing nothing, driven by the `threshold`/`inert` metadata on `listFaults` entries.
12. The solver runs in a worker and re-runs debounced on every state change; on failure (non-convergence, `valvesFrozen`, or a thrown solve) it keeps the last good state and shows a badge revealing solver internals on tap. The badge copy states that the rendered state predates the failed change, since the kept state may reflect a different control/fault configuration than the current toggles.

**Geometry**

13. Schematic geometry — hydraulic and electrical — comes from a hand-authored, checked-in coordinates module (`sim/src/geometry.js`): an x,y for every flow node, per-port pin positions for every circuit part, and route points for every wire. No auto-layout. A Node test fails when anything in `graph.yaml` lacks a position (or the geometry names something `graph.yaml` doesn't have).
14. The schematic draws everything in `graph.yaml`: all flow nodes, and the complete circuit — every part with its labelled terminals and drawn internals (controller terminal strip, adapter winding, relay coil + contact, the splice's 8 ports, pump motor, each valve's coil pin) and all 24 wires individually pin-to-pin. Only `kinds` subparts stay off the schematic; they live in the bottom sheet (§9).
15. Layout concept: a logical schematic fitted to a phone-portrait screen — wiring band on top, the manifold as a vertical bar with stacked ports, each zone as its own left-to-right row (valve → hoses/tees/swings → heads with their arc wedges), the Z5 manual row, the Z6 cap stub, and the supply chain (well → footvalve → suction hose → pump → trunk) at the bottom; low-voltage wires run in one channel beside the manifold, mains down the edge.

