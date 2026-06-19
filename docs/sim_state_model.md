# Simulator state model

The **single authoritative model** for **controls**, **state**, **readings**, and **faults** in the
irrigation simulator — the engine vocabulary. Other docs reference it and must not restate these
decisions: `sim_spec.md` owns the requirements, `sim_ui.md` the UX, `sim_build_plan.md` the plan.

## Status — built vs. to-build

`sim_build_plan.md` owns the milestone status; in short:

- **Built: the healthy system.** `live`/`pressure`/`flow` + readings, the finer-grained
  topology (valve internals, controller output ports), and the local valve relation are in the
  engine and exercised by the harness.
- **Later: faults.** The three fault verbs are the *design intent*, not yet implemented.
  `system.yaml` has **no `fail:` entries**, and there is no fault code in the engine — it models the
  healthy system only. The finer-grained topology (every conductance and passage a real, named element
  a fault verb could target) is kept, so M8 can re-introduce the hooks, but it starts from zero.

## The core distinction

Every value in the simulator is exactly one of these, and never two:

- **Control** — an *input* you set (operator hardware, controller output). Depends on nothing.
- **State** — a component's physical condition, *computed* by the solvers from controls + topology.
- **Reading** — a *named view* derived from state, computed on demand, **never stored**.
- **Fault** *(later)* — an injected *modifier* on a component's transfer behaviour.

The test for any value: *"Can I set this directly, right now, with nothing else being true?"*
Yes → control. No → it is a state, a reading, or (later) a fault effect.

## State — three primitives, full stop

A component carries at most three state values:

| primitive | domain | meaning | type |
|---|---|---|---|
| `live` | electrical | electricity reaches it | bool |
| `pressure` | hydraulic | water potential present | number (absent = dry) |
| `flow` | hydraulic | water moving through / out of it | number |

That is the entire state vocabulary. Not energized/powered/reaching. Not
wet/charged/connected/pressurised/watering. **`live`, `pressure`, `flow`.**

`pressure` and `flow` are independent: a dead-headed branch has `pressure` with
`flow` ≈ 0; a freely venting line has `flow` with low `pressure`.

### Which primitive a component carries

Decided by the component's **role** (from the topology), never authored per instance:

- electrical components (wires, controller, relay, coils, sockets, pump supply) → `live`
- hydraulic components (source, pipes, joints, valves, chambers, heads) → `pressure` + `flow`

The internals of a component are themselves components and follow the same rule:
a solenoid coil carries `live`; the bonnet chamber and metering port carry `pressure`/`flow`.
They get the *same three words*, never a private dialect.

## Controls — the complete input surface

A control exists only where there is an actuator a hand or the controller can move:

```
controls = {
  energize{port},                   // controller output terminals (the only electrical control)
  handle{valve},                    // manual isolation valve
  throttle{valve},                  // flow-control screw, 0..1 (1 = factory-open)
  bonnetBleed{valve},               // bonnet bleed screw
  solenoidBleed{valve},             // solenoid manual bleed (distinct actuator)
  headShutoff{head},                // per-head flo-stop
  nozzle{head}, arc{head},          // head configuration
}
```

The controller has no "zone" or "pump" concept. It **energizes a port**; whether that
port lifts a zone valve or trips the pump relay is decided entirely by the **wiring**.
"Pump" and "zone" are roles the topology assigns, not control vocabulary.

The controller's output ports are authored as real nodes in the electrical graph
(`O1_control.controller/{pump,z2,z3,z4,z5,common}`), and `solveElectrical` takes `energize` — the
set of energized port nodes. For each coil (pump relay, each zone valve) the solver checks whether
an energized port closes a loop through it against the shared `common` return, so the wiring alone
decides what a port actuates.

## Boundaries — leaf state pinned to a healthy default

Three states sit at the edges of the system and are given, not propagated:

- **well** `pressure` — water available at the source (present = wet, absent = dry)
- **socket** `live` — mains present at the supply
- **pump priming chamber** `pressure` — water held in the pump body

A boundary is **not a control and not a separate category** — it is one of the same three
primitives at a leaf, whose rule is "the world says so" instead of "look upstream." Its value is
**pinned to the healthy default** (well wet, socket live, pump primed); the operator **cannot set
it**. The only way a boundary leaves its healthy default is **fault injection** — `dead(socket)`
(mains lost), `clog`/`leak` or a dry-well fault on the source, the lost-prime fault on the pump body.
There is no `env` toggle, no plug switch, no separate *environment* category, and no `mains` noun.

## Readings — derived views, never stored

Pure functions of the three primitives, computed when asked. The human-readable
diagnostic layer lives here, not in stored state. Each one *adds* something to the raw
primitive (a threshold, a location, a domain term) — none is a bare restatement:

| reading | definition |
|---|---|
| `open(valve)` | the valve passes `flow` |
| `pressurised(id)` | `pressure` ≥ working threshold |
| `primed(pump)` | pump-inlet `pressure` present |
| `watering(head)` | head `flow` > 0 |
| `starved(head)` | `pressure` present but `flow` ≈ 0 |

There is **no `commandedNotReaching` reading.** A coil is `live` or `dead`, full stop — if
you energize a port and the coil reads `dead`, that *is* the answer. "Commanded but not
reaching" is not a thing the model names; comparing a control to a primitive is an ad-hoc
question, not a stored or named status. (Likewise no `reaching` reading — "is it fed" is
just `pressure` present / `live`.)

## How state is produced — two scales of hydraulics

- **`live`** comes from the **electrical solve** (continuity from live sockets through closed
  contacts and energized coils — a reachability walk over the wiring).
- **`pressure` / `flow`** come from the **hydraulic solve**, which has two cleanly separated scales:

  1. **The delivery network → EPANET.** The mains, pipes, valves, and heads — the global,
     coupled flow problem EPANET exists for. Unchanged from today. It produces each valve's
     **inlet and outlet pressure**.
  2. **Each valve's actuation circuit → a local relation, *not* EPANET.** The metering port,
     bonnet chamber, pilot seat and bleed port are a tiny pressure-actuation circuit that is
     **local to the valve** — both its endpoints are the valve's own inlet and outlet, which
     EPANET already solved. Chamber pressure is a small resistor-divider between those two
     known pressures over the port conductances. It is computed directly, with no global
     matrix. (EPANET *could* represent it, but it is poorly suited: orifice-scale conductances
     next to the mains make a stiff, convergence-fragile system, and a sealed chamber is a
     zero-flow dead-end — EPANET's weak spots — for zero benefit, since the boundary pressures
     are already known.)

The two couple through the diaphragm, evaluated each pass of the **existing fixed-point valve
loop**: the valve opens when the pilot is **venting** — the vent conductance beats the metering
conductance (`rVent < rMeter`), so the chamber drains toward the outlet side — gated by the
inlet lift/stay hysteresis the loop already applies. The conductance test (rather than a raw
`inlet − chamber` pressure subtraction) is what keeps the decision stable when the valve is shut
and its outlet pressure is undefined; it captures both the pilot opening *and* a clogged metering
port (`rMeter` rises → still vented → stuck open). `chamberBar` is the resulting diagnostic
pressure. The comparison sets the valve's EPANET status for the next pass.

There is **one truth: the solve.** No qualitative rule engine runs alongside it — the local
valve relation is *physics* (a pressure divider over real conductances producing real
`pressure`/`flow`), not the symbolic rules of the old `states.js`.

### Validation

Deleting `states.js` removes its internal cross-check (today's ~83 reconciliations). With one
truth there is nothing to reconcile, but the regression net must be replaced, not just lost:
the rewritten harness asserts the **solved primitives and readings** against hand-checked
scenarios (idle, one zone running, a cut controller feed, a shared-return break, …) — the
same scenarios as today, asserting on `live`/`pressure`/`flow` and the readings directly
instead of on a qualitative projection.

## Worked example — the solenoid valve

The valve's internals are real components, each carrying only the three primitives:

| internal part | primitive | how set |
|---|---|---|
| coil | `live` | electrical solve |
| bonnet chamber | `pressure` | **local relation** (divider between inlet & outlet) |
| metering port | `flow` | **local relation** (`(inlet − chamber) / R_meter`) |
| pilot seat / bleed port | `flow` | **local relation** (vent path when open) |

Diaphragm position is a **reading** of (inlet `pressure` vs chamber `pressure`) — *no
`up`/`down`/`open`/`closed` states, no rule engine*. A later-phase `clog(meteringPort)` fault
(raise `R_meter`, the same verb as a clogged pipe) shows the chain that authoring real internals buys:

```
clog metering port → chamber can't refill → chamber pressure stays low
→ diaphragm stays lifted → valve passes flow even de-energized → stuck open / weeping
```

## Faults — three verbs (design intent, later phase)

A fault never invents a new state; it touches one of three things:

| verb | effect | examples |
|---|---|---|
| `dead(id)` | force `live = false` | pump motor failed, wire cut, coil open |
| `clog(id)` / `leak(id)` | change a component's hydraulic conductance | blocked nozzle, clogged metering port, pipe leak, weak pump |
| `stuck(id, open\|closed)` | force a passage's actuation | valve seized open, diaphragm jammed |

Every passage has a conductance, so any unexpected fault has a home without new vocabulary — which
is *why* the healthy-system phase keeps every conductance/passage a real, named element (see Status).
Not built: there is no fault code today — no fault module, no solver/network effect seams, no
fault-tuning constants in the engine. Building M8 means introducing those hooks from scratch: author
`system.yaml` `fail:` entries and compile each to a verb (`dead` forces `live=false`; `clog`/`leak`
change a conductance; `stuck` forces a passage's actuation) against the granular topology.
(`solveElectrical`'s `blocked` argument is the M4 broken-wire input, not a fault seam, and remains.)

## Summary

> **State = `live` + `pressure` + `flow`**, produced by one solve — EPANET for the delivery network,
> a local pressure relation for each valve's actuation circuit. Eight controls and nothing else the
> operator sets; world-edge states (mains, well, prime) sit at their healthy default and move only
> under a fault. Everything else is a reading. The old qualitative layer (`states.js` + the YAML
> `states:` blocks) is **deleted**; faults (`dead` / `clog`-`leak` / `stuck`) are the next phase.
