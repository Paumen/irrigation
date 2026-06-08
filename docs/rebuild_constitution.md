# Rebuild constitution

The rules for the from-scratch rebuild of the irrigation simulator. This file
exists because the last version **already had** the right idea written down
(`CLAUDE.md`: *"connectivity IS the propagation — no per-fault symptom tables"*)
and the code violated it on nearly every line. A principle nobody is prevented
from breaking is worthless.

So this is not a list of good intentions. Every rule below is phrased as
something **checkable**, and the design goal is to make the wrong thing **hard
or impossible to express** — not merely discouraged.

---

## Prime directive

> **Represent things that physically exist, and let behavior emerge from them.
> Never assert the outcome you want to see.**

Every rotten thing in the old engine was the second half: a hand-written claim
about what *should* happen, instead of a physical thing that *makes* it happen.

The litmus to hold over every single line, forever:

> *Am I representing something real and letting the consequence fall out — or am
> I asserting the consequence I want?*

---

## Guardrails

Each one names the disease it kills (from the old engine) and how you check it.

### G1 — One model of the system. One source of truth.
One file describes the physical system: the parts, how they connect (pipes and
wires), their physical properties. Everything reads from it.
- **Kills:** two source files (`setup.yaml` + `graph.yaml`) describing one yard;
  code stitching between two ontologies.
- **Check:** no module reads a second system description. There is exactly one,
  and "what is the system" has exactly one answer.

### G2 — Model only what you can point at.
Every primitive in the model is a physical object, a physical property, or a
physical law. If you cannot walk into the yard and point at it, it is not a
primitive — it is either a derived *observation* or a fiction.
- **Kills:** "run a zone," "grade," "scenario," per-fault "symptom" — abstractions
  treated as if they were real things.
- **Check:** for every type in the model, name the real-world object you'd point
  at. Banned as model primitives: *zone-run, grade, symptom, scenario.*

### G3 — A component sees only its own local reality.
A component computes its behavior from inputs that are physically present *at
that component* — its inlet pressure, its own state. Nothing else.
- **Kills:** grading a rotor on `commanded / pump_running / severed / baseline` —
  things a piece of plastic cannot know.
- **Check:** read each component function's parameters. If it names anything
  global — a command, the pump's status, another component, a baseline — it is a
  violation. A rotor that "knows why" its supply is low is the bug.

### G4 — State is primary. Behavior emerges. Outputs are reads.
The system is always in a state: what's energized, what's pressurized, where the
water is. Inputs *mutate* state. The simulation *evolves* state by physical law.
Outputs *read* state. There is no "calculate, then paint a picture of it."
- **Kills:** the stateless calculator that ran one solve and then a *separate
  second pass* reconstructed where the water was.
- **Check:** there is one state object. The physics writes it; the view reads the
  same one. If any code reconstructs physical state *after* the solve, the
  architecture is already wrong.

### G5 — Separate physical domains are separate objects.
Water is one domain. The 24 V valve circuit and the 230 V pump circuit are two
*more*, galvanically isolated. Domains couple **only** where real hardware
couples them (the controller's switches, a solenoid acting on a pilot).
- **Kills:** one flattened netlist with current "reachable" continuously from the
  pump mains into the valve wiring — physically impossible.
- **Check:** the 24 V and 230 V circuits are distinct structures. No propagation
  crosses between domains except through an explicitly modeled switch/relay/
  solenoid.

### G6 — Physics is native, and honest about what it doesn't know.
The physical laws live in the simulation, applied to the one model. Nothing is
borrowed from a separate "reference" tool. And no number is presented with more
confidence than its inputs earn.
- **Kills:** importing a standalone reference calculator's functions (built
  for a different source) into the simulation; four-decimal output resting on
  guessed constants.
- **Check:** no import of a standalone reference calculator. Any output resting
  on an unmeasured constant is labeled or banded, never shown as false precision.

### G7 — Inputs are physical acts, not abstractions.
You energize the pump contactor. You energize a valve's solenoid. You open a
manual valve. You break a part. "Running zone 3" is not an input — it is *two
separate energizations* that you can command, or that can fail, independently.
- **Kills:** `commanded_zones` fusing "open these valves" and "run the pump" into
  one fake event.
- **Check:** the input vocabulary is a list of physical actions on physical
  hardware. `commanded_zones` does not exist.

---

## Process (how you build it so rot can't widen)

### P1 — Smallest *real* slice first, end to end.
Pump + one pipe + one valve + one head. Energize the pump → water stands
pressurized against the shut valve. Open the valve → flow emerges. That tiny
thing must be **honest** — state-driven, local, emergent — before a second zone
or a single fault is added.
- The old engine's original sin was building *wide* (every zone, every fault,
  every chart) on a hollow core. Correct-and-tiny beats complete-and-fake.

### P2 — Touch reality before building on the physics.
Before stacking anything on a physical constant (pump curve, pipe diameter),
check it against at least one real measurement from the yard. Calibration is a
first step, not an afterthought. No code review substitutes for a measurement.

---

## Red flags — rot is creeping back if you see:

- a lookup table mapping *fault → symptom*
- a function that needs to know *why* something is happening
- a second file that describes the system
- reconstructing physical state *after* the solve instead of carrying it
- a number shown to many decimals that came from a guessed input
- the words *grade / scenario / run-zone / symptom* used as model primitives
- any `if broken: return <outcome>` that isn't a statement of a local physical law

---

*Hold each new component against the prime directive before it's written. If it
asserts an outcome instead of representing a thing, it does not get built.*
