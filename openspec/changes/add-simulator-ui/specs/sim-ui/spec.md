## ADDED Requirements

### Requirement: System shown as one holistic diagram

The UI SHALL render the full hydraulic and electrical system as a single SVG
diagram comprehensible in one view, with nothing hidden behind a mode and every
connection traceable end to end without ambiguous crossings or dangling ends.

#### Scenario: Every system.yaml element is drawn

- **WHEN** the app loads `system.yaml`
- **THEN** every flow node, every circuit part with labelled terminals, and all
  wires are drawn, and the geometry completeness test fails if any element lacks a
  position or any position lacks an element

### Requirement: Flow is legible at a glance

The UI SHALL convey, for every hose, where water flows and roughly how much,
derived from the solved `flow` primitive, and label every outlet with its flow in
m³/h.

#### Scenario: Pump plus Z2 shows flow on the live path only

- **WHEN** the pump is on and Z2 is open
- **THEN** the Z2 supply path renders flow proportional to its solved magnitude,
  the idle Z3-Z5 branches render as idle with no flow, and each open outlet is
  labelled with its flow in m³/h

### Requirement: Pressurised items distinguished from empty

The UI SHALL distinguish pressurised from unpressurised parts and indicate roughly
how hard, derived from the solved `pressure` primitive.

#### Scenario: Dead branch reads empty

- **WHEN** a branch is downstream of a closed valve and is therefore unreachable
- **THEN** it renders as empty/idle and displays `—` rather than an EPANET pressure

### Requirement: Live wiring shown, broken paths included

The UI SHALL draw a component as live only when it carries the `live` primitive (on
a closed current-carrying path), so a broken segment reads dead while its
neighbours stay lit.

#### Scenario: Broken shared return darkens only affected zones

- **WHEN** the shared common return is broken such that the Z2 and Z3 coils read
  dead
- **THEN** the Z2 and Z3 wiring renders de-energised while the Z4 and Z5 wiring
  renders live

### Requirement: Inspect and control from a side sheet

The UI SHALL let the user tap any item to see its live values and that item's
controls from the eight controls in `docs/sim_state_model.md`, read against the
item's catalog context.

#### Scenario: Tapping a head shows values against catalog

- **WHEN** the user taps a watering rotor head
- **THEN** the side sheet shows its flow, pressure, and throw read against the
  catalog flow span, and exposes that head's controls (shut-off, nozzle/arc)

### Requirement: View updates live on any control change

The UI SHALL re-solve and update the whole view on any control change, via a
debounced `solveElectrical -> solveSteady -> render` pass run on a Web Worker, with
a main-thread fallback if the CDN wasm cannot load in the worker.

#### Scenario: Toggling a zone updates everything at once

- **WHEN** the user energises a controller zone port
- **THEN** every derived value, label, and flow indication updates to the new
  settled solve

### Requirement: Non-convergence stated plainly

The UI SHALL, when the solve fails to converge, keep the last good view and show a
"won't settle" badge rather than display numbers that look real but are not.

#### Scenario: Unsettleable state is flagged

- **WHEN** `solveSteady` returns `converged = false`
- **THEN** the last good render is retained and a "won't settle" badge is shown
