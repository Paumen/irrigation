# F-Code Specification

**Version:** 1.0 
**Status:** canonical
**Format:** dotted (`F<component>.<mode>.<instance>`)
**Source of truth for migration:** the live `data.js` cause taxonomy

---

## 1. Grammar

```
F <component> . <mode> . <instance>
```

- **Component digit** = *location along the system*.
- **Mode digit** = *physicality* (physical low, logical high).
- **Instance** = specific case; omitted when a mode has one case.

### Component digits

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
(diaphragm, seat, body). The §2 F7 note covers the test that resolves which side is at
fault.

### Mode digits (physical → logical gradient; 8 off-axis)

| Digit | Mode | Meaning |
|:-----:|------|---------|
| `1` | **Physical defect** | Intrinsic physical fault of the part |
| `3` | **Physical obstruction** | Flow blocked or lost (air / debris) |
| `4` | **Install error** | Physical setup fault |
| `5` | **Software error** | Code-level fault (app bug, firmware) |
| `6` | **Settings error** | Logical config in software |
| `8` | **External fault** | Cause outside the component's boundary |

Digits `1–6` form the physical→logical gradient; digit `8` (external) sits off this
axis, marking a cause beyond the component's own boundary.

**Reserved component digits:** `0`. **Reserved mode digits:** `0, 2, 7, 9`.

---

## 2. Code tree

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
│  └─ F5.3.2   foot-valve clog (strainer)
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

**Note (F1 vs F2) — remote channel vs. the box.** Both surfaces can run or change the
system: the app reaches the controller over wifi/cloud (`F1`), and the controller acts
directly via its touchscreen and stored schedule (`F2`). They are *not* peers — `F2`
owns command and execution; `F1` is only the remote path layered on top. So the
touchscreen lives in `F2.1` (controller hardware) and the watering schedule / zone map
lives in `F2.6` (controller state), **not** in `F1`. `F1` covers only the app itself
(`F1.5`) and its connection (`F1.8`); kill the wifi and the app path dies while the
touchscreen and stored schedule keep running.

**Note (F7) — resolving the electrical-vs-hydraulic fork.** As noted in §1, the valve
straddles both layers: its solenoid is **electrical** (24 V from the controller — coil
faults at `F7.1.1`, plunger/port obstruction at `F7.3.1`), while the diaphragm, seat,
and body are **hydraulic** (`F7.1.2`, `F7.1.3`, `F7.3.2`). The isolating test is
**manual operation**: open the bleed screw or turn the solenoid by hand. If the zone
then runs, the hydraulics are sound and the fault is electrical — solenoid coil, wiring
(`F3`), or controller (`F2`). If it still won't run, the fault is hydraulic — diaphragm,
seat, or obstruction. This is why an `F7` symptom on its own does not tell you which
neighbour to suspect; the bleed test resolves the fork before any part is replaced.

**Note (F7) — Teflon paste-and-tape.** Using both over-torques the joint and splits the
valve body: an install act with a defect outcome. Score it as `F7.1.3`, not as an `F7.4`
instance, to avoid double-counting.

**Forward-looking codes (no historical cause, absent from migration):**
`F3.4`, `F4.4`, `F5.8`. (`F2.8` is sourced from the R22 split.)

---

## 3. Migration table (live `data.js` → F)

**Six 1→2 splits** (⮌ = one live code maps to two F-codes). Parent broadcasts:
`R1→F1, R2→F2, R3→F4, R4→F5, R5→F6, R6→F3, R7→F7, R8→F8, R9→F9`.

| Live | → F | Kind |
|------|-----|------|
| R11 | F2.6 | move (cross-family) |
| R12 | F1.5 | rename |
| R13 | F1.8 | rename |
| R22 | **F2.1 + F2.8** | ⮌ split |
| R23 | **F2.5 + F2.6** | ⮌ split |
| R31 | F4.1 | move |
| R41 | F5.3 | move |
| R42 | F5.1 | move |
| R51 | F6.1 | move |
| R52 | F6.3 | move |
| R61 | F3.1.1 | move |
| R62 | F3.1.2 | move |
| R63 | F3.1.3 | move |
| R71 | **F7.1.1 + F7.3.1** | ⮌ split |
| R72 | **F7.1.2 + F7.3.2** | ⮌ split |
| R73 | F7.1.3 | rename |
| R74 | F7.4 | rename (mode-level) |
| R81 | F8.1 | rename |
| R82 | F8.3 | rename |
| R91 | **F9.1.1 + F9.3** | ⮌ split |
| R92 | **F9.1.2 + F9.4** | ⮌ split |

`R11` (schedule / zone map) now moves to the **existing** `F2.6` rather than the old
`F1.6` — schedule is controller state, not an app concern (§2 note). `F2.6` therefore
aggregates `R11` (straight move) plus the `R23` settings share. The old `F1.6` no longer
exists.

---

## 4. Machine-readable migration map

String = rename/move. Array = 1→many split (manual apportioning required, §5).

```json
{
  "R1": "F1", "R2": "F2", "R3": "F4", "R4": "F5", "R5": "F6",
  "R6": "F3", "R7": "F7", "R8": "F8", "R9": "F9",

  "R11": "F2.6",
  "R12": "F1.5",
  "R13": "F1.8",
  "R22": ["F2.1", "F2.8"],
  "R23": ["F2.5", "F2.6"],
  "R31": "F4.1",
  "R41": "F5.3",
  "R42": "F5.1",
  "R51": "F6.1",
  "R52": "F6.3",
  "R61": "F3.1.1",
  "R62": "F3.1.2",
  "R63": "F3.1.3",
  "R71": ["F7.1.1", "F7.3.1"],
  "R72": ["F7.1.2", "F7.3.2"],
  "R73": "F7.1.3",
  "R74": "F7.4",
  "R81": "F8.1",
  "R82": "F8.3",
  "R91": ["F9.1.1", "F9.3"],
  "R92": ["F9.1.2", "F9.4"]
}
```

> **Apply via single lookup pass over original tokens** — never sequential string
> replacement (old `R3*`→`F4*`, old `R4*`→`F5*` overlap and would corrupt).

---

## 5. Split apportioning (required before data.js migration)

Each split source's `baseline` and every per-question `effects` entry divides between
its two targets.

### R22 → F2.1 (unit defect) + F2.8 (socket-side power)
Hits: Q3 (1.0), Q9 ctrl row, Q10b ctrl (1.0), Q11 storm (1.0), Q13 (1.6), Q20 (−0.2).
Q11 storm → F2.8; Q13 "0 V" → F2.1; Q3 "silent" → both.

### R23 → F2.5 (firmware) + F2.6 (settings)
Hits: Q2 (−0.2), Q2q (0.4), Q7 (1.0), Q9 ctrl row, Q11b outage (1.0), Q20 (0.4).
Q7 "restart fixed it" → F2.5; Q11b outage → lean F2.5.
(`F2.6` also absorbs `R11`'s schedule effects as a straight move — no apportioning
needed for that portion; just sum it into the `F2.6` baseline/effects.)

### R71 → F7.1.1 (coil) + F7.3.1 (plunger / port obstruction)
Hits: Q2, Q2q, Q6, Q12, Q13, Q15, Q22.
Q15 coil-resistance → F7.1.1; Q6 "buzz or hum" → F7.3.1; Q12 "bleed runs" → both
(per the §2 F7 bleed-test note, electrical fault = coil or plunger).

### R72 → F7.1.2 (diaphragm tear) + F7.3.2 (metering port / screen debris)
Hits: Q10 valves row, Q12, Q17, Q18.
Q17 "damage or debris" → both (the option label conflates them; split 0.6 / 0.4).

### R91 → F9.1.1 (regulator) + F9.3 (debris/nozzle)
Hits: Q2q (0.6), Q8 gradual (0.4), Q10 rotor row (0.6). Split both.

### R92 → F9.1.2 (gear-drive stuck) + F9.4 (arc/range)
Hits: Q10 rotor row (1.0). Lean F9.4, small weight on F9.1.2.

(Parent `R9`→`F9` broadcasts hit all F9 children automatically.)

**Default rule if not hand-tuning:** duplicate each effect to both children, then trim.

---

## 5.5 Per-question recalibration

Effects in `data.js` that need adjustment beyond §5's default rule — cases where a
split-source effect should be **moved**, **dropped on one side**, or
**asymmetrically weighted** rather than duplicated. Anything not listed below
duplicates as-is.

### R22 → F2.1 (unit) + F2.8 (socket-side power)

| Question / option | Current R22 | F2.1 | F2.8 |
|---|---|---|---|
| Q11 storm row | 1.0 | 0.2 | 1.0 |
| Q13 "0 V" | 1.6 | 1.6 | drop |
| Q20 "Clicks, 230 V out" | -0.2 | -0.2 | -0.4 |
| Q9 ctrl row (age) | — | yes | drop |

### R23 → F2.5 (firmware) + F2.6 (settings)

| Question / option | Current R23 | F2.5 | F2.6 |
|---|---|---|---|
| Q7 "Restart fixed it" | 1.0 | 1.0 | drop |
| Q11b outage | 1.0 | 1.0 | 0.2 |
| Q2q "Erratic" | 0.4 | 0.4 | 0.2 |
| Q2 "Several zones at once" | 0.4 | 0.2 | 0.4 |
| Q9 ctrl row (age) | — | 0.4 | drop |

### R71 → F7.1.1 (coil) + F7.3.1 (plunger / port obstruction)

| Question / option | Current R71 | F7.1.1 | F7.3.1 |
|---|---|---|---|
| Q6 "Buzz or hum" | 0.4 | drop | 0.4 |
| Q6 "Silent — no click" | 0.6 | 0.6 | 0.2 |
| Q15 "In range" | -1.0 | -1.0 | drop |
| Q15 "Open or infinite" | 1.6 | 1.6 | drop |
| Q15 "Near zero / very low" | 1.6 | 1.6 | drop |
| Q22 "water from valve" | 0.4 | drop | drop |

### R72 → F7.1.2 (diaphragm tear) + F7.3.2 (metering port / debris)

| Question / option | Current R72 | F7.1.2 | F7.3.2 |
|---|---|---|---|
| Q17 "Damage or debris present" | 1.0 | 0.6 | 0.4 |

### R91 → F9.1.1 (regulator) + F9.3 (debris/nozzle)

| Question / option | Current R91 | F9.1.1 | F9.3 |
|---|---|---|---|
| Q2q "Erratic" | 0.6 | 0.2 | 0.6 |
| Q9 rotor row (age) | — | yes | drop |

### R92 → F9.1.2 (gear-drive seized) + F9.4 (arc/range)

| Question / option | Current R92 | F9.1.2 | F9.4 |
|---|---|---|---|
| Q10 rotor row | 1.0 | 0.2 | 1.0 |

### Cross-family move (R11 → F2.6) — parent-broadcast compensation

The R11 move out of the R1 family means F1 parent broadcasts no longer reach
F2.6. Restore the lost signal with an explicit hit:

| Question / option | Action |
|---|---|
| Q1 "All 4 zones fail" | add explicit `F2.6: 0.2` |

### Downstream cleanup

- **Q9 ctrl row** `causes: ['R12', 'R22', 'R23']` → `['F2.1', 'F2.5']`. Drop
  F1.5 (app bugs aren't controller-age-correlated), drop F2.8 (socket/breaker
  don't age), drop F2.6 (stored settings don't age).

---

## 6. Parsing note

Strip `F`, then `code.slice(1).split('.')` → `[component, mode, instance]`.
Component digit `[0]` → §1 location table; mode digit `[1]` → §1 mode table.
Guard `length === 2` for mode-level codes.
