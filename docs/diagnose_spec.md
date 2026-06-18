# Diagnostic engine spec

Guide a homeowner toward the broken part of their irrigation system by asking step-by-step
questions and using the answers to maintain a live, ranked list of the most likely failure
modes. Delivered through the `irrigation` skill's `troubleshoot` playbook, which drives the
engine over the `diagnose_irrigation` MCP tool.

## Engine

- **Questionnaire:** Questions can be answered, changed, or skipped in any order. Each question has a shape (`options`, `multi`, `matrix`, `ages`), an effort cost, and a stage (Symptoms, Timeline, Tests).
- **Ranking:** Every answer adds to or subtracts from each suspect failure mode; the engine recomputes scores and percentages after each answer, sorted most- to least-likely.
- **Recommendations:** The engine scores the unanswered questions by how sharply they separate the contending failure modes (isolation + breadth, with effort as a tie-breaker) and surfaces the most informative next questions, each with a discriminator `D`; the loop's stop signal is an empty `next` (no question still separates the contenders).
- **State:** the engine is pure and stateless; the caller owns the conversation state — `answers` (question id → answer, shape depends on the question `type`) and `skipped` (question id → true for "I don't know" / skip).

Failure-mode baselines, question effects, slider curves, and stage definitions live in `data.json`
— the canonical record, scored by `tools/engine.py`. Its failure-mode ids are the F-codes defined
below.

## F-code taxonomy

**Format:** dotted (`F<component>.<mode>.<instance>`).

### Grammar

```
F <component> . <mode> . <instance>
```

- **Component digit** = *location along the system*.
- **Mode digit** = *physicality* (physical low, logical high).
- **Instance** = specific case; omitted when a mode has one case.

#### Component digits

| Digit | Component | Layer |
|:-----:|-----------|-------|
| `1` | App | command (remote) |
| `2` | Controller | command (box) |
| `3` | Wiring (24 V) | electrical distribution |
| `4` | Relay | electrical switching |
| `5` | Pump | water path → |
| `6` | Main hose (32 mm) | |
| `7` | Zone valves | |
| `8` | Zone hose (25 mm) | |
| `9` | Heads | → end of flow |

`F1–F4` are the command/electrical layer; `F5–F9` are the water path in flow order —
with one deliberate seam: `F7` (the zone valves) is the only component spanning both
layers, carrying electrical faults (solenoid coil, plunger) alongside hydraulic ones
(diaphragm, seat, body). The F7 note below covers the test that resolves which side is at
fault.

#### Mode digits (physical → logical gradient; 8 off-axis)

| Digit | Mode | Meaning |
|:-----:|------|---------|
| `1` | **Physical defect** | Intrinsic physical fault of the part |
| `3` | **Physical obstruction** | Flow blocked or lost (air / debris) |
| `4` | **Install error** | Physical setup fault |
| `5` | **Software error** | Code-level fault (app bug, firmware) |
| `6` | **Settings error** | Logical config in software |
| `8` | **External fault** | Failure mode outside the component's boundary |

Digits `1–6` form the physical→logical gradient; digit `8` (external) sits off this
axis, marking a failure mode beyond the component's own boundary.

**Reserved component digits:** `0`. **Reserved mode digits:** `0, 2, 7, 9`.

### Code tree

```
F1  App
├─ F1.5   Software error (app bug)
└─ F1.8   External fault (no connectivity — wifi / cloud)

F2  Controller
├─ F2.1   Physical defect (controller unit, incl. touchscreen)
├─ F2.5   Software error (firmware)
├─ F2.6   Settings error (schedule, zone map, zone count, master-valve / pump-start)
└─ F2.8   External fault (no supply power — socket / plug / upstream breaker)

F3  Wiring (24 V)
├─ F3.1   Physical defect
│  ├─ F3.1.1   zone conductor (break / cut)
│  ├─ F3.1.2   common wire
│  └─ F3.1.3   splice (corroded → open / intermittent)
└─ F3.4   Install error
   ├─ F3.4.1   connection loose
   └─ F3.4.2   wires touching (not isolated)

F4  Relay
├─ F4.1   Physical defect
└─ F4.4   Install error

F5  Pump
├─ F5.1   Physical defect (motor, cap, impeller)
├─ F5.3   Physical obstruction (suction-side)
│  ├─ F5.3.1   lost prime (air leak)
│  └─ F5.3.2   suction-strainer clog
└─ F5.8   External fault (low well level)

F6  Main hose (32 mm)
├─ F6.1   Physical defect (leak / break)
└─ F6.3   Physical obstruction (air / debris)

F7  Zone valves
├─ F7.1   Physical defect
│  ├─ F7.1.1   solenoid coil (open / shorted)
│  ├─ F7.1.2   diaphragm (tear / perished)
│  └─ F7.1.3   body seal (seat damage)
├─ F7.3   Physical obstruction
│  ├─ F7.3.1   solenoid (plunger stuck/dirty, port clog)
│  └─ F7.3.2   diaphragm (metering port, screen debris)
└─ F7.4   Install error
   ├─ F7.4.1   loose or mis-set (bleed screw, solenoid, flow control, bonnet screws)
   └─ F7.4.2   assembly fault (diaphragm unseated, valve backwards)

F8  Zone hose (25 mm)
├─ F8.1   Physical defect (leak / break)
└─ F8.3   Physical obstruction (air / debris)

F9  Heads
├─ F9.1   Physical defect
│  ├─ F9.1.1   pressure regulator (PRS40)
│  └─ F9.1.2   gear-drive seized (rotor stuck; weak spring)
├─ F9.3   Physical obstruction (debris in well, filter / nozzle clog)
└─ F9.4   Install error (arc / range mis-set, nozzle mismatch)
```

**Parent linkage in `data.json`.** Every failure-mode row carries `parent: 'F<component>'` —
flat at the component level — regardless of whether the code itself is at mode level (e.g.,
`F7.4`) or instance level (e.g., `F7.1.1`). No intermediate `F7.1` / `F7.3` / `F7.4` rows exist,
so the engine's flat `parent`-field broadcast stays simple: `F7:x` lifts every row with
`parent: 'F7'`. Mode-level broadcasts (e.g., `F7.1:x`) are **not** supported; if ever needed, add
explicit per-child effects rather than a broadcast.

### Note (F1 vs F2) — remote channel vs. the box

Both surfaces can run or change the system: the app reaches the controller over wifi/cloud
(`F1`), and the controller acts directly via its touchscreen and stored schedule (`F2`). They are
*not* peers — `F2` owns command and execution; `F1` is only the remote path layered on top. So the
touchscreen lives in `F2.1` (controller hardware) and the watering schedule / zone map lives in
`F2.6` (controller state), **not** in `F1`. `F1` covers only the app itself (`F1.5`) and its
connection (`F1.8`); kill the wifi and the app path dies while the touchscreen and stored schedule
keep running.

### Note (F7) — resolving the electrical-vs-hydraulic fork

The valve straddles both layers: its solenoid is **electrical** (24 V from the controller — coil
faults at `F7.1.1`, plunger/port obstruction at `F7.3.1`), while the diaphragm, seat, and body are
**hydraulic** (`F7.1.2`, `F7.1.3`, `F7.3.2`). The isolating test is **manual operation**, and it
resolves in two steps because the two manual paths differ:

- **Internal bleed** — rotate the solenoid a quarter-turn. This lifts the plunger mechanically
  *through* the solenoid's own exhaust port, so it exercises the plunger/port path. If the zone
  runs, that path is clear and the activation fault is upstream — coil (`F7.1.1`), wiring (`F3`),
  or controller (`F2`); the plunger obstruction `F7.3.1` is ruled out. If it does not run, fall
  through to:
- **External bleed** — loosen the bleed screw, venting the bonnet straight to atmosphere and
  *bypassing* the plunger/port. If the zone now runs (where the internal bleed failed), the
  difference is exactly the plunger/port → `F7.3.1`. If it sprays hard from the valve but the heads
  stay dry, the bonnet is venting yet the diaphragm still won't lift/seal → diaphragm `F7.1.2` /
  seat `F7.1.3`. If barely any water appears even from the screw, the bonnet never pressurises →
  supply (`F6`/`F5`) or the inlet/metering screen `F7.3.2`.

So an `F7` symptom on its own does not tell you which neighbour to suspect; the internal → external
bleed ladder resolves the fork before any part is replaced. A second fork — *won't seal because the
seal is bad* vs. *won't seal because something holds it open* — is split by the **flow control**:
screwing it fully shut clamps the diaphragm onto the seat regardless of the solenoid. If a leak then
stops, the surfaces can seal and the failure mode is upstream (controller `F2.6`, solenoid stuck
open `F7.3.1`, cross-wire `F3.4`); if it still leaks, the diaphragm/seat is gone. Opening a
throttled flow control on a weak zone is likewise the cleanest probe for a mis-set valve (`F7.4`).
The live questionnaire implements these as `Q12`/`Q12b` (bleed ladder) and `Q24`/`Q25` (flow
control).

**Teflon paste-and-tape.** Using both over-torques the joint and splits the valve body: an install
act with a defect outcome. Score it as `F7.1.3`, not as an `F7.4` instance, to avoid double-counting.

### Parsing

Strip `F`, then `code.slice(1).split('.')` → `[component, mode, instance]`.
Component digit `[0]` → component table; mode digit `[1]` → mode table.
Guard `length === 2` for mode-level codes.
