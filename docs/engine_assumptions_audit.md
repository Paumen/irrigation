# Engine assumptions & magic-number audit

Every modeling assumption and hand-picked constant in the simulation engine
(`tools/hydraulics.py` + `tools/simulate.py`), with an honest confidence tag and
where it lives. The diagnostic *questionnaire* engine (`tools/engine.py`,
`data.json`) is **out of scope** — this is only the hydraulics + fault simulator.

## How to read the tags

| Tag | Meaning |
|-----|---------|
| ✅ **Grounded** | Matches an external standard, datasheet, or is a correct physical law. Trust it. |
| 🟡 **Plausible** | A reasonable engineering estimate, but **uncalibrated and unverified**. It's a knob someone picked. |
| 🔴 **Questionable** | Likely wrong, oversimplified, or conflates two different things. Affects the answer. |
| ⚫ **Structural** | An architectural choice, not a number — listed separately at the bottom. |

The single most important thing in this document is the **Structural** section.
Most of the 🔴 numbers are symptoms; the architecture is the disease.

---

## 1. Unit & physics constants — ✅ all grounded

| Constant | Value | Where | Note |
|---|---|---|---|
| `M_PER_BAR` | 10.197 | hydraulics:20 | 1 bar of water head. Correct. |
| `G` | 9.80665 | hydraulics:21 | Standard gravity. Correct. |
| `KV_PER_CV` | 0.864978 | hydraulics:22 | Kv↔Cv conversion. Correct. |
| Hazen-Williams form | `10.67·L·q^1.852 / (C^1.852·d^4.87)` | hydraulics:92 | Standard SI Hazen-Williams. Correct. |
| Torricelli free discharge | `Cd·A·√(2gh)` | hydraulics:153 | Correct orifice law. |

These are not where the risk is.

---

## 2. Manufacturer reference tables

| Item | Value | Where | Tag | Note |
|---|---|---|---|---|
| Hunter MP Rotator flow chart | table | hydraulics:24 | ✅ | Spot-checked vs Hunter: MP2000 360°=1.47 GPM (pub. ~1.46), MP3000 360°=3.64 GPM (~3.6). Matches. |
| `MP_REG_BAR` | 2.7579 (=40 psi) | hydraulics:29 | ✅ | PRS40 regulates to 40 psi. Correct. |
| Hunter I-20 Blue nozzle chart | table | hydraulics:35 | ✅ | Spot-checked vs Hunter: #3.0@3.0 bar=3.0 GPM, #2.0=1.9 GPM. Matches. |
| **`PUMP_CURVES` (DAB Jet)** | tables | hydraulics:47 | 🔴 | **Unverified against any DAB datasheet.** And the family ordering is suspicious: `JET 82 M` shut-off (47 m) > `JET 92 M` (36.2 m), which is backwards for a model family. This is the **keystone** — the pump curve sets the entire operating point, so if it's wrong, *every* flow & pressure number is wrong. Verify against the real datasheet first. |

---

## 3. Hydraulic model laws

| Assumption | Where | Tag | Note |
|---|---|---|---|
| Friction summed per segment, each carrying combined downstream flow | hydraulics:367 | ✅ | Correct network friction accounting. |
| Static lift from per-node elevations | hydraulics:407 | ✅ | Correct. |
| I-20 flow tracks pressure (unregulated) | hydraulics:343 | ✅ | Physically right for a gear-drive rotor. |
| MP regulated to a flat flow above setpoint | hydraulics:144 | ✅ | Right behavior for a PRS body. |
| I-20 extrapolation outside chart as `q∝√P` | hydraulics:128 | 🟡 | Orifice approximation beyond the published range. Reasonable, unverifiable. |
| MP de-regulation below inlet threshold: `q = base·√(min(inlet,setpoint)/setpoint)` | hydraulics:146 | 🟡 | Plausible model of a regulator dropping out, but the curve shape is invented. |
| `MP_REG_MIN_INLET_BAR` = 3.5 | hydraulics:32 | 🟡 | The inlet a PRS40 needs to hold regulation. ~50 psi is plausible but a guess; directly controls when MP heads start sagging. |
| `HOSE_WALL_MM` {32:3.0, 25:2.7, 16:3.0} | hydraulics:60 | 🟡 | Pipe **inner** diameter = OD − 2·wall, and these wall thicknesses are assumed. Inner d enters friction as `d^4.87`, so a small wall error is a **large** friction error. Should be measured against the actual pipe. |
| `VALVE_CV` = 7.0 | hydraulics:64 | 🟡 | Flow coefficient of the zone valves. Plausible for ~1″ but unverified. |
| `SJ_LOSS_BAR` = 0.05 | hydraulics:65 | 🟡 | Swing-joint minor loss. A guess. |
| `SUCTION_EXTRA_LOSS_M` = 1.0 | hydraulics:66 | 🟡 | Lumped suction-side loss. A guess. |
| `STREAM_CD` = 0.97 | hydraulics:61 | 🟡 | Discharge coeff for the Z5 open stream. High (implies a smooth nozzle); plausible for a clean orifice. **Becomes 🔴 when reused for jagged leaks — see §5.** |

---

## 4. Pump-model selection

| Assumption | Where | Tag | Note |
|---|---|---|---|
| Pump model is **inferred** as the curve whose shut-off head is nearest the rated bar | hydraulics:296, simulate:646 | 🔴 | The pump isn't pinned to a known model — it's guessed from a rating. |
| The two engines infer it from **different fields** | `pump.well.max_bar` (hydraulics) vs `pump.foot_valve.bar` (simulate) | 🔴 | If those disagree, the two engines silently pick **different pumps** and stop agreeing — and the cross-validation test assumes they match. |

---

## 5. Fault-effect table (`_effect`) — mostly 🔴 guessed numbers

These are the constants that turn "this part is broken" into a number. Almost
all are unsourced, and several share a deeper modeling flaw (leaks as smooth
orifices).

| Constant | Value | Where | Tag | Note |
|---|---|---|---|---|
| `LEAK_D_SMALL` | 0.006 m | simulate:59 | 🔴 | "A split joint/tee leaks through a 6 mm hole." Pure guess. |
| `LEAK_D_SEAL` | 0.008 m | simulate:60 | 🔴 | 8 mm hole for a blown seal/cap. Pure guess. |
| `LEAK_D_CHECK` | 0.004 m | simulate:61 | 🔴 | 4 mm back-drain. Pure guess. |
| `LEAK_D_HOSE[*]` | hose inner d | simulate:56 | 🔴 | A burst hose is modeled as a hole **the full bore of the pipe** — a worst-case, not a typical split. |
| **Leak discharge coeff** | `Cd = 0.97` | simulate:732 | 🔴 | Leaks reuse the **smooth-nozzle** coefficient. A jagged rupture has Cd ≈ 0.6. So leak flow is **systematically over-estimated**, which over-states cross-zone starvation ("burst pipe kills the other zone"). |
| `HW_C_CLOGGED` | 90 | simulate:48 | 🔴 | One fixed roughness for "clogged hose." Real fouling spans a huge range; a single value can't represent it. |
| `VALVE_LOSS_CLOGGED_BAR` | 0.4 | simulate:50 | 🔴 | Added loss for a clogged seat — and the **same** number is reused for a "throttled" flow-control stem (simulate:676), which is a different thing. |
| `WEEP_D` | 0.003 m | simulate:51 | 🟡 | A weeping valve passes a 3 mm trickle. Guess, but low-impact. |
| `SUCTION_CLOG_LOSS_M` | 6.0 | simulate:53 | 🔴 | Extra lift for a clogged foot valve. Big number, no source. |
| `NOZZLE_CLOG_SCALE` | 0.25 | simulate:63 | 🔴 | A clogged nozzle still passes 25% flow. Guess. |
| `NOZZLE_MISCONFIG_SCALE` | 1.6 | simulate:64 | 🔴 | A "wrong nozzle" flows 1.6×. Guess (and direction-only — real depends on which nozzle). |

**Pattern:** every leak is a *smooth, full-or-fixed-size orifice*. That makes
leaks too clean and too big, and it's the same assumption everywhere, so errors
don't cancel — they compound in the same direction.

---

## 6. Grading thresholds

| Constant | Value | Where | Tag | Note |
|---|---|---|---|---|
| `POP_BAR` | 1.7 bar | simulate:67 | 🔴 | "A rotor won't pop up below this." But 1.7 is just the **bottom of the I-20 performance chart**, reused as the **physical pop-up pressure** — two different things. A rotor typically pops at a *lower* pressure than it performs well at, so "won't-pop" almost certainly fires too early. |
| `REG_MIN` | 3.5 bar | simulate:68 | 🟡 | Same value as MP_REG_MIN_INLET; drives the "under-regulated" flag. |
| `DEAD_Q` | 0.02 m³/h | simulate:69 | 🟡 | Below this a head is "doing nothing." Low-impact threshold. |
| `WEAK_FRAC` | 0.75 | simulate:70 | 🔴 | "Weak = under 75% of healthy." Why 75%? Nothing justifies it; could as easily be 0.6 or 0.85. Sets the entire weak/full boundary. |

---

## 7. Numerics

| Item | Value | Where | Tag | Note |
|---|---|---|---|---|
| Picard relaxation | 0.5 | both | 🟡 | Under-relaxation for stability. Fine. |
| `MAX_ITERS` | 500 / 600 | both | 🟡 | **Non-convergence only raises a flag/`converged:false`, it doesn't fail.** A non-converged solve still returns numbers that look authoritative. |
| `SOLVE_TOL` | 1e-7 | both | ✅ | Tight enough. |
| Bisection for free-discharge sinks | — | simulate:728 | ✅ | Correct choice; the √P response oscillates under plain fixed-point. |
| Seed flows | 0.3 / chart@3 bar | both | ✅ | Just a starting guess; doesn't affect the converged answer. |

---

## 8. Design-guideline limits (advisory, not equipment ratings)

| Constant | Value | Where | Tag | Note |
|---|---|---|---|---|
| `VELOCITY_LIMIT_MS` | 1.5 | hydraulics:68 | ✅ | Standard irrigation pipe-velocity guideline (~1.5 m/s). |
| `PRESSURE_SPREAD_LIMIT_PCT` | 20 | hydraulics:69 | 🟡 | Common "≤20% pressure variation" coverage rule of thumb. |

---

## Structural assumptions (⚫ — the architecture, not the numbers)

These are the choices that generate whole *classes* of error. They matter more
than any single constant.

1. **Grades are computed from upstream *causes*, not from the head's local
   state.** `_grade(spec, p_bar, q, baseline, commanded, severed, pump_running,
   valve_state)` (simulate:780) takes 8 inputs; a real rotor only senses 3
   (`spec, p_bar, q`). It solves the physics to get true inlet pressure/flow,
   then **throws that away** and re-derives the verdict from the causes — so the
   grade can contradict the hydraulics. Direct symptom: `if not commanded:
   return "full"` (simulate:795) stamps a barely-dribbling stuck-open head
   "full" purely because it wasn't commanded. **The fix is to make
   `grade = f(spec, p_bar, q)` and report intent ("shouldn't be on") as a
   separate axis.** This single inversion would delete five of the eight
   arguments and several §6 special cases.

2. **"Weak" is judged against a healthy baseline of the *same commanded set*.**
   (simulate:797, baseline solve at simulate:838). Deliberate (there's a code
   comment), but it has an undocumented consequence: under overload, every head
   is compared to its *already-degraded* self, so a head throwing half its
   normal distance still gets badged **"full."** "Full" therefore means "as good
   as it'd be under these conditions," **not** "working correctly" — which is not
   what a reader assumes.

3. **Every leak is a smooth orifice (Cd≈0.97) of a guessed diameter.** (§5).
   Systematically over-sizes leaks and their cross-zone starvation effect, in a
   consistent direction so errors compound.

4. **The pump model is inferred, not pinned — and inferred differently by the
   two engines.** (§4). A latent way for the two solvers to silently diverge.

5. **Non-convergence is a flag, not a failure.** (§7). The engine can return
   confident-looking numbers it never actually settled on.

6. **No output carries uncertainty.** Every number is reported to 3–4 decimals
   with no band, despite resting on the 🔴/🟡 constants above. Precise-looking
   output invites trust the inputs don't earn.

---

## Bottom line: where the risk actually concentrates

Ranked by how much it can move the answer:

1. **Pump curve (§2)** — unverified keystone; sets everything. *Verify against
   the DAB datasheet first.*
2. **Grading architecture (Structural #1)** — wrong in principle; generates a
   class of wrong verdicts independent of the hydraulics.
3. **Leak model (§5, Structural #3)** — guessed sizes + wrong Cd, biased one way,
   drives the headline "cross-zone" behavior.
4. **Hose inner diameters & C (§3)** — enter friction as `d^4.87`; small input
   error → large pressure error.
5. **Grading thresholds POP_BAR / WEAK_FRAC (§6)** — arbitrary cut lines on the
   four-way grade everyone actually reads.

What's **solid**: the unit physics, the nozzle/MP tables (verified vs Hunter),
the Hazen-Williams friction law, the electrical reachability model, and the
conservation accounting. The skeleton is sound; the calibration and the grading
layer are where the trust gap lives.

**No amount of code review closes that gap** — only measuring a few real heads
(flow/pressure) in the actual yard and comparing tells you whether the numbers
are within 10% or off by 3×.
