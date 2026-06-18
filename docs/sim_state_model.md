# Simulator state model

The authoritative model for **controls** and **states** in the irrigation simulator.
Written from the domain, not the current code. This is the target the code moves toward;
the migration map at the end says what each existing symbol becomes.

## The core distinction

Every value in the simulator is exactly one of these, and never two:

- **Control** — an *input* you set (operator hardware, controller output). Depends on nothing.
- **State** — a component's physical condition, *computed* by the solvers from controls + faults + topology.
- **Reading** — a *named view* derived from state, computed on demand, **never stored**.
- **Fault** — an injected *modifier* on a component's transfer behaviour.

The test for any value: *"Can I set this directly, right now, with nothing else being true?"*
Yes → control. No → it is a state, a reading, or a fault effect.

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

A control exists only where there is an actuator a hand or the controller can move.
That is three component homes:

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

## Boundaries — state fixed by the world

Three states sit at the edges of the system and are given, not propagated:

- **well** `pressure` — water available at the source (present = wet, absent = dry)
- **socket** `live` — mains present at the supply
- **pump priming chamber** `pressure` — water held in the pump body (you prime it once)

A boundary is just a state whose rule is "the world says so" instead of "look upstream."
There is no separate *environment* category and no `mains` noun.

## Faults — three verbs

A fault never invents a new state. It touches one of three things:

| verb | effect | examples |
|---|---|---|
| `dead(id)` | force `live = false` | pump motor failed, wire cut, coil open |
| `clog(id)` / `leak(id)` | change a component's hydraulic conductance | blocked nozzle, clogged metering port, pipe leak, weak pump |
| `stuck(id, open\|closed)` | force a passage's actuation | valve seized open, diaphragm jammed |

Every passage has a conductance, so there is always a home for an unexpected fault
without new vocabulary. A clog is a clog whether it sits in a pipe, a nozzle, or a
metering port (see the worked example below).

## Readings — derived views, never stored

Pure functions of the three primitives, computed when asked. The human-readable
diagnostic layer lives here, not in stored state:

| reading | definition |
|---|---|
| `reaching(id)` | `pressure` (hydraulic) or `live` (electrical) actually arrives |
| `open(valve)` | the valve passes `flow` |
| `pressurised(id)` | `pressure` ≥ working threshold |
| `primed(pump)` | pump-inlet `pressure` present |
| `watering(head)` | head `flow` > 0 |
| `starved(head)` | `pressure` present but `flow` ≈ 0 |
| `commandedNotReaching(id)` | a control says on, but the resulting `live`/`open` says off |

`commandedNotReaching` replaces every "commanded but not energized / not opening" field:
it is the control compared to the resulting state at read time, stored nowhere.

## How state is produced

- `live` comes from the **electrical solve** (continuity from live sockets through closed
  contacts and energized coils — a reachability walk over the wiring).
- `pressure` and `flow` come from the **hydraulic solve** (EPANET + the demand loop:
  the source/pump drive potential through open passages; conductances set the drops).

The hydraulic network is **extended to include valve internals**: the bonnet chamber is a
real node and the metering port / pilot seat are real links, spliced from topology the same
way the builder already splices swing joints and connectors. This is what lets the valve
mechanism live in the one graph instead of a parallel rule layer (see the worked example).
The pressure-actuated diaphragm — which EPANET does not model natively — rides the existing
fixed-point valve loop in the solver (the loop that already toggles valves from inlet
pressure each iteration), now keyed on `inlet − chamber` pressure.

There is **one truth: the solve.** There is no qualitative rule engine running alongside
it and no cross-check, because there is nothing to reconcile — readings are functions of
the one solved state.

## Worked example — the solenoid valve, including a clogged metering port

The valve is a subsystem of internal components spliced into the hydraulic graph, each
carrying only the three primitives:

| internal part | primitive | how set |
|---|---|---|
| coil | `live` | electrical solve |
| bonnet chamber | `pressure` | hydraulic solve (real node) |
| metering port | `flow` | hydraulic solve (real link — conductance into the chamber) |
| pilot seat | `flow` | hydraulic solve (real link — vents the chamber when the plunger lifts) |

Because the chamber and ports are real nodes/links, the mechanism *is* the solve — *no
`up`/`down`/`open`/`closed` states, and no separate rule engine*:

- the valve passes flow ⟸ `(coil live OR solenoidBleed OR bonnetBleed) AND throttle > 0 AND inlet pressure − chamber pressure ≥ lift`
- diaphragm position is a **reading** of (inlet `pressure` vs chamber `pressure`)

**Metering port clogged** = `clog(meteringPort)`, the same verb as a clogged pipe:

```
clog metering port → chamber can't refill → chamber pressure stays low
→ diaphragm stays lifted → valve passes flow even de-energized → stuck open / weeping
```

Every step is one of the three primitives; the fault is one parameter on one component;
the diagnosis is tracing that chain. No stored "metering-port state" was needed.

## Migration map — what each existing symbol becomes

Legend: KILL (gone) · BECOMES (re-homed) · KEEP (engine/physics, not state-vocab).

### Controls (current input fields)
- `manualOpen` BECOMES `handle{}` · `bleedOpen` BECOMES `bonnetBleed{}` · `solenoidBleed`/`throttle`/`nozzle`/`arc` KEEP · `floStop` BECOMES `headShutoff{}`
- `pumpStart`/`mv`, `zones` KILL → `energize{port}` (role moves into the wiring)
- `gridPower`/`adapterPower` KILL → boundary `live`; `env.wellWet`/`env.primingChamberWet` KILL → boundary `pressure`

### Qualitative states (`states.js` + ~32 `system.yaml` `states:` blocks) — this whole layer dies
- `live/dead` BECOMES primitive `live`
- `wet/dry` BECOMES reading (`pressure` present)
- `pressurised`, `primed`, `open/closed`, `up/down`, `watering/off` KILL → readings
- `COMPLEMENT`, `POSITIVE`, `parseKindStates`, `axisOf`, `isGroupDef`, `hasRule`,
  `buildStateResolver`, `validateStateResolver`, `computeStates`, `groundedPos`,
  `CROSSCHECK_KEYS` — **`states.js` deleted in full**

### Solve outputs ("states in disguise")
- `pressureBar`/`headM` BECOMES `pressure`; `demands`/`flow`/`pumpFlow` BECOMES `flow`
- `controllerEnergised`/`relayCoil`/`pumpPowered`/`zoneEnergised`/`socketLive`/`energisedWires` BECOMES `live` (one word, per component)
- `pumpOn`, `valveOpen`, `watering` KILL → readings
- `commandedNotOpening`/`commandedNotEnergised`/`pumpCommandedNotPowered` KILL → reading `commandedNotReaching`
- `reachable` KEEP (engine: the hydraulic propagation)
- `converged`/`iters`/`valvesFrozen`/`dmp`/`stable`/`prevP`/`valveInlet` KEEP (solver bookkeeping)
- `throws`/`precip` KEEP (readings from the head transfer law); `outSum`/`massImbalance` KEEP (diagnostics over `flow`)

### Faults (`faults.js`)
- `pumpDisabled`, `valveDisabled`, `elecBlocked` BECOMES `dead(id)`
- `closedLinks`, `linkK`, `valveLossScale`, `pumpHeadScale`, `leaks`, `outletMods.flowScale/zeroFlow` BECOMES `clog`/`leak`
- `valveForcedOpen`, `bleedForcedOpen` BECOMES `stuck(open)`; `outletMods.nozzle/arc` BECOMES an `nozzle`/`arc` control value
- `emptyEffects()` KILL; `compileFaults()` KEEP (rewritten to compile `fail:` into the three verbs)

### Engine / topology (core reused — the hydraulic network is extended for valve internals)
- `solveElectrical` + `buildAdj`/`bfs`/`pathOf`/`reachable`/`throughBoth` KEEP (the `live` engine)
- `solveSteady`/`computeReachable`/`finalize` KEEP (the `pressure`+`flow` engine); the
  fixed-point valve loop is re-keyed on `inlet − chamber` pressure to drive the diaphragm
- `buildTopology` EXTENDED — splices valve internals (chamber node, metering-port / pilot-seat
  links) into the EPANET graph, like it already splices swing joints and connectors
- `outlets.js` (catalog transfer laws + nozzle/arc application), `model.js`
  (roles decide which primitive a component carries), `inp.js`, `epanet-runner.js`, `units.js` KEEP
- **new** `readings.js` — `open`, `watering`, `primed`, `starved`, `reaching`, `commandedNotReaching`

### Config constants
All KEEP, re-homed: unit/physics (`M_PER_BAR`, `G`); solver tuning (`ALPHA*`, `*_TOL*`,
`MAX_ITERS`, `EPANET_*`, `VALVE_FREEZE_TAIL`); transfer params (`VALVE_OPEN_BAR`/`STAY_BAR`,
`SPRAY_CLAMP_BAR`, geometry, `THROTTLE_MIN`, `PRESSURISED_BAR`); fault params (`CLOG_*`,
`PILOT_CLOG_BLOCKS`, `PUMP_CLOG_LOSS`, `*_BORE_MM`, `*_CD`, `WRONG_STREAM_BORE_SCALE`).

## Summary

> **State = `live` + `pressure` + `flow`.** Eight controls. Three fault verbs
> (`dead` / `clog`-`leak` / `stuck`). Three boundaries. Everything else is a reading or the
> engine. The solvers' core is reused and the hydraulic network is extended to absorb the
> valve mechanism as real nodes/links — which is precisely what lets the qualitative layer
> bolted on top (`states.js` + the YAML `states:` blocks) be **deleted, not ported**.
