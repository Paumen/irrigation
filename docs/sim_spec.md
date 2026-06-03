# Fault-simulation engine spec

`tools/simulate.py` predicts what the system does under a **fault set + commanded zones**: per-head
behaviour (full / weak / won't-pop / dead), where water leaks, which valves the controller actually
energised, and whether the pump runs. It is distinct from `tools/hydraulics.py`, which is a
healthy-system calculator that assumes a fault-free **tree** over `setup.yaml`.

## The one rule

**Connectivity in `graph.yaml` IS the propagation.** Every consequence falls out of (graph
structure) + (the physical meaning of a condition on a node). There are no per-fault symptom tables
and no F-codes. The *only* place a physical meaning is written down is the `_effect(kind, cond)`
table in `simulate.py` — a small, explicit map from `(part kind, condition)` to a structural effect
(`sever` / `leak` / `add_loss` / `hw_c` / `deregulate` / `scale`), keyed to each kind's role in the
graph. It is deliberately auditable: a wrong claim there contradicts the graph rather than hiding in
prose. If a known-true consequence can't be derived from connectivity, **fix `graph.yaml`** — do not
add a special case.

## Inputs

- **`graph.yaml`** (repo root) — three graphs: `kinds` (per-component sub-part connectivity), `flow`
  (water DAG), `circuit` (electrical netlist); `fail_axis: [broken, clogged, misconfigured]`. Parts
  with a manual control also carry an **`ops:`** axis (the first value is the normal position): a
  valve `bleed_screw` `[closed, open]`, `coil` `[auto, bleed]` (solenoid twist), `flow_control`
  `[open, throttled, shut]`, the manual `handle` `[closed, open]`, and a rotor head `flow_control`
  `[open, throttled, shut]` (per-head shutoff). `faults.py` ignores `ops`; the simulator reads it.
- **Operations vs faults.** `commanded_zones` are CONTROLLER stations (Z1–Z4, solenoid). Z5 is a
  **manual** valve — not commanded; it runs from `settings={"Z5.valve.handle":"open"}`. Operations
  (a `settings` map) are deliberate positions, distinct from the fault `conditions`: opening a bleed
  screw, twisting a solenoid, screwing a flow-control shut, or closing one head are *operations*, not
  failures. Their effects fall out of the same pilot-loop / discharge logic — only the input is new.
- **`tools/faults.py`** — `expand(graph)` → 285-node flat set (every component **and** sub-part) with
  a validated `condition` per node. `simulate.py` consumes this; it does not re-derive the node set.
- A run request: `{commanded_zones, conditions, concurrent_zones}`.

## Reused physics (from `hydraulics.py`)

Pump curves (`pump_head_m`), nozzle charts (`i20_flow_m3h`, `mp_flow_m3h`, `free_discharge_m3h`), the
3.5-bar MP regulation cutoff, Hazen-Williams friction, valve loss, and the coupled pressure↔flow
fixed-point idea. The tree-only graph walk (`build_graph` / `subtree_flows` / `_propagate`) is **not**
reused — it asserts a single parent and `is_leaf ⇒ nozzle`, both false here.

## The four pieces

1. **Electrical pass** (`_resolve_electrical`) — pure reachability over `circuit`. A node is *live*
   iff an intact, un-gated path runs `mains → … → node → … → return(ctrl.psu)`. Zone taps `ctrl.trN`
   conduct only when zone N is commanded. The pump/master-valve tap `ctrl.trpmv` is its **own**
   controller output: by default it follows the schedule (on when a zone is called), but `pump_on`
   drives it explicitly — `True` runs the pump with every valve shut (a dead-head / pump test),
   `False` holds it off while a zone is called. Because `cond.common` is the shared return for all
   four `splice.Z*c`, `cond.common broken` removes the return for all four coils at once → all four
   auto valves fail shut. This falls out of the netlist; it is not special-cased. Output: per-coil
   energised + pump-running.

2. **Valve pilot loop** (`_resolve_valves`) — each automatic valve is resolved to `{open, shut,
   weeping}` by reachability over its *own* sub-parts plus coil energisation, not a fault table:
   `fill_ok` = `inlet→metering_port→chamber` passable; `bleed_open` = (coil + intact solenoid path)
   or a stuck bleed screw; the diaphragm seats (valve shut) only when the chamber holds pressure and
   the diaphragm/seat are intact. Metering-port-clogged ⇒ no fill ⇒ never seats ⇒ **won't shut off**;
   coil/plunger broken ⇒ can't bleed ⇒ **stuck shut**; diaphragm/bleed-screw broken ⇒ **open**;
   seat broken ⇒ **weeping** when shut.

3. **Non-tree flow solve** (`Flow` + `_solve_hydraulic`) — each valve is collapsed to a single
   `inlet→outlet` edge (this removes the pilot loop and `valve.outlet`'s two parents, which are
   internal to the valve); broken conduits/seals/caps become internal **leak sinks**; a weeping valve
   becomes a small trickle sink off its live inlet. The remaining graph is a single-parent
   tree-with-internal-sinks (asserted at build time). Flow is accumulated in reverse-topological order
   (`edge_flow = local sink + Σ children`, no `is_leaf` assumption), pressures propagate from the pump
   discharge, and discharges are recomputed from local pressure in an under-relaxed Picard loop;
   free-discharge sinks (streams + leaks) are solved by monotonic bisection (their `q∝√p` response
   oscillates under plain fixed-point). All branches share the pump curve and main line, so a leak or
   stuck-open valve on **any** branch — including the valveless Z5 — draws the shared supply down and
   weakens *other* commanded zones. Symptom zone ≠ fault zone.

   The report also includes a **`wetted`** set (`_wetted`) — the flow parts that actually hold water
   in the current state, as reachability from the well over `to`-edges, blocked only where a seal is
   closed (a `seat` whose valve is shut, a `plunger` whose coil is de-energised, a snapped thread, a
   clogged control orifice). It is derived from the *same* valve/coil state the solve uses — one
   source of truth, not a second computation — so it re-derives for any fault (e.g. a clogged
   metering port leaves the bonnet chamber dry, which is *why* that valve won't shut).

4. **Grading** (`_grade`) — each head is graded against its own **healthy-baseline flow** (a second
   engine solve of the same commanded set with no faults), so cross-zone draw-down reads as "weak vs
   healthy" and open-end streams grade on flow rather than nozzle pressure. Rotors below the 1.7-bar
   pop pressure read "won't-pop"; a zone running while not commanded is flagged.

## Surfaces

- Library + stdin/stdout CLI: `echo '{"commanded_zones":[1,2],"conditions":{"Z1.hose1":"broken"}}' |
  python3 tools/simulate.py`.
- MCP tool `simulate_irrigation(commanded_zones, conditions, concurrent_zones)` in
  `tools/mcp_server.py`.
- UI `tools/sim_ui.py` (+ `sim_ui.html`): a stdlib HTTP server that serves a static vanilla-JS/SVG
  page and runs the real engine on every knob change. The page owns no physics — every painted result
  is a `/solve` response. Run `python3 tools/sim_ui.py`, open `http://127.0.0.1:8765/`.

## Tests

`python3 tools/test_simulate.py` — cross-validates the no-fault single-zone solve against
`hydraulics.py`, then drives the electrical, valve, hydraulic-coupling, and grading scenarios
(`E*`, `V*`, `H*`, `G*`/`C*`), asserting reasons, not just booleans.
