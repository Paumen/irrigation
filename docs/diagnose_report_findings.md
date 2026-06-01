# Diagnose-report investigation: negative contributions & Q23 occurrence

Companion to `docs/diagnose_report.md` (regenerate both with
`python3 tools/diagnose_report.py --md docs/diagnose_report.md`). This note
answers two questions raised by the report's **Question scorecard**:

1. Why do some questions show a *negative* `work` (they cost the true fault rank)?
2. Why is Q23's `asked` share so low (7%)?

Both were traced by replaying the engine's pick order fault-by-fault and logging,
for every answered step, `prev_rank → new_rank` (the `work` the report averages).

## 1. Negative `work` — two distinct causes

The scorecard's `work` is `prev_rank − new_rank` along the engine's *chosen*
question order: positive = the answer moved the true fault toward #1. It is a
**realised, path- and timing-dependent** number, not an intrinsic property of the
question. The four net-negative questions split into two unrelated mechanisms.

### 1a. No-upside / timing artifact — Q6, Q17, Q19 (and the late tail)

These fire *after* the ranking has largely settled, when the true fault is
already at or near #1. From that position a non-discriminating answer can only
hold (0) or slip (negative) — there is no upside left to earn, so the metric is
structurally capped at ≤ 0. The negatives are small and concentrated on the
already-documented near-degeneracies (F4.4, F5.8, F7.4), where a broad answer
lets a tied sibling edge ahead by a rank or two:

| Q   | asked | steps with **0** | net Δ | the only negatives |
|-----|------:|-----------------:|------:|--------------------|
| Q19 | 20    | 18               | −3    | F4.4 5→7, F5.8 3→4 |
| Q17 |  8    |  7               | −1    | F7.4 2→3           |
| Q6  | 25    | 20 (≤0 elsewhere)| −4    | F1.8 2→5, F1.5 4→6, three 1→2 slips |

This is exactly the report's existing prose ("asked after the ranking has
usually settled, so a stray answer mostly reshuffles ties the wrong way"). These
are **not** bad questions — a question that lands late is penalised by *when* the
engine asks it, not by what it can discriminate. Their `force`/`scope` in the
Question-character section is fine; they simply have no rank left to win.

### 1b. Coarse, double-edged content — Q8

Q8 ("How did the problem progress? — Sudden / Gradual / Intermittent / No
pattern") is the exception: it is asked **early** (median position 4) and in
**100%** of runs, yet still nets slightly negative. It is not idle — it is
*high-variance*. Each main answer carries 8 effects spread across many families,
so the same coarse symptom strongly helps some faults and strongly hurts others:

```
Q8 biggest swings:  F7.1.3 +9, F1.8 +3, F2.8 +3   (helps)
                    F7.4 −3, F8.1 −3, F8.3 −3      (hurts)
net −4 over 29 asks  →  mean −0.14
```

Mechanism: "progression" is a symptom most causes share, so for the average true
fault the generic answer boosts a *competing* sibling about as often as the true
cause. This is a genuine **content** signal (Q8's effect weights are not
well-isolated per fault), distinct from the timing artifact above — worth a look
if Q8's weights are ever retuned, but it is not a correctness bug.

**Takeaway:** negative `work` is expected and mostly benign. The metric should be
read as "realised movement *given the engine's ordering*", which the report's
caption already flags for early positions. The one substantive finding is Q8's
breadth/variance.

## 2. Q23 asked only 7% — a simulation-key artifact, not an idle question

Q23 ("Start the pump only, all valves closed — where does water come out? *tick
all*") is a 2-option multiselect: **a)** out of the heads, **b)** out of the
valves. There is **no option for the common "nowhere / nothing comes out"
outcome.**

In the per-fault answer key (`T2` in `tools/diagnose_sim.py`) Q23 is encoded as a
letter and translated by `MULTI["Q23"]`:

```
a → None (nothing ticked → recorded as a SKIP)   b → [0]   c → [1]   d → [0,1]
```

27 of 29 faults answer Q23 = `a` (no leak in the pump-only test), which maps to
`None`, so the run never records Q23 as *answered*. Only F7.1.2 (`b`) and F7.1.3
(`c`) tick a box → **2/29 = 6.9% ≈ 7%**.

The key point: the engine is **not** ignoring Q23. Replaying the runs, the engine
**recommends Q23 first 26 times**, but only 2 of those have a non-skip answer in
the key:

```
Q23 recommended-first across all runs : 26
Q23 actually answered (in key)        :  2   ← what the scorecard's "asked" counts
```

So Q23 is a frequently-surfaced discriminator that the scorecard undercounts,
because an empty multiselect (`a`) is treated as a skip rather than as the
informative answer "neither — nothing leaks." The engine can't tell Q23 was
effectively already answered "neither," so it keeps re-recommending it.

### Two ways to make the report reflect reality

- **Answer-key fix (test/report only):** give Q23 a real "nowhere" code so the
  key answers it for all faults instead of skipping. As-is, the 7% is a true
  statement about the *key*, not about the question's usefulness.
- **Question-design fix (`data.json`):** add an explicit "Nowhere — nothing comes
  out" option to Q23 carrying *rule-out* weight (subtracting from the F7.x
  pump-side bleed causes). That makes Q23 answerable for every fault and stops the
  engine re-recommending it once the homeowner reports no leak — improving both
  the real tool and the report's `asked` count.

The design-fix is the higher-value change but touches `data.json` (the diagnostic
source of truth) and would need `tools/test_diagnose.py` to stay green, so it is
flagged here rather than applied as part of this investigation.

## 3. Two kinds of skip — and whether the "negative-confirmation" kind carries information

A skip can mean two very different things:

- **Don't-know / didn't-do** — the homeowner can't or won't perform the step.
  Genuinely no information.
- **Negative confirmation** — the homeowner *did* look and reports "it's none of
  the listed options." A real negative finding.

In the simulation these are separable by question **type**: a `multiselect`
("tick all that apply") answered with the empty set is a negative confirmation;
an `options`/`matrix`/`ages` follow-up left blank is don't-know.

```
NEGATIVE-CONFIRMATION skips (multiselect answered empty)   DON'T-KNOW skips (follow-up not done)
  Q18  "where is water / wet ground?"      24 faults         Q2q  13   Q24  9   Q25  9
  Q22  "run a zone — what at valves/heads?" 14 faults         Q12b  2   Q12  1
  Q23  "pump only — where does water come?" 27 faults
```

### Are the negative-confirmation skips giving valuable information?

**The engine treats them as its single most valuable next question — then throws
the answer away.** Replaying every run and counting how often each multiselect is
*recommended first* vs how often its answer is actually usable:

```
            recommended-first   usable (a tick)   discarded as "neither"
  Q18              20                  5                   15
  Q22              29                 15                   14
  Q23              26                  2                   24
                                          → 53 top-recommendations discarded
```

So **53 times** the engine spent its best next question on a multiselect (it picks
them precisely because their options *do* split the live contenders), the
homeowner answered "none of these," and the scoring model contributed **zero** —
`Engine._score` iterates over ticked indices, so an empty set is a no-op. The
information the engine sought is real and was actually obtained; it is then
silently dropped. This is also why §2's Q23 `asked` count is so low: a usable tick
is rare, but the question is far from idle.

**Yet you cannot simply turn "neither" into a blanket rule-out.** Treating a
neither as "subtract every positive-presence weight the options carry" was tested
two ways:

- *At end-of-run:* it changes only **2/29** final ranks — the positive evidence
  has already pinned the answer, so as a confirmer it is largely redundant.
- *Inline (applied when asked):* it is actively **harmful** — **11/29** faults end
  worse and several never lock into the top-3 — because an untargeted, full-
  magnitude negation destabilises the contending set and the question path.

The value is real but only a *targeted, low-magnitude* rule-out (like the −0.2
weights Q22's option 2 already carries) could safely capture it — not a blanket
negation.

### The blocker: 10 keys answer "neither" on a question that boosts that very fault

A clean rule-out is impossible today because the data is internally inconsistent:
**10 fault/question pairs answer "neither" on a multiselect whose own option
*adds* weight to that same fault.** Ruling those out would penalise the true
cause — which is exactly why the inline experiment hurt F7.3.2 and F7.4.

```
  F7.4   (valve mis-set)          Q23=neither, yet Q23 "water from valves" +1.0, "from heads" +0.6
  F7.3.2 (diaphragm screen)       Q18/Q22/Q23=neither, yet all three boost it (Q23 "heads" +0.6 …)
  F7.3.1 (solenoid plunger)       Q23=neither, yet Q23 "heads" +0.4
  F6.1   (main-hose break)        Q23=neither, yet Q23 "valves" +0.4
  F3.1.1 (zone-conductor break)   Q22=neither, yet Q22 "water at zone not switched on" +1.0
  F3.1.3 (corroded splice)        Q22=neither, yet Q22 +0.4
  F2.6 / F3.4                     Q23=neither, yet Q23 "heads" +0.4
```

For several of these the **answer key looks wrong**, not the weights: F7.4 carries
the *same* +1.0 "water from valves" weight as F7.1.3 (which correctly ticks
`valves`), so a stuck-open / mis-set valve on a pump-only test almost certainly
*does* weep at the valves — its key should tick a box, not answer "neither." Same
story for F7.3.x. Correcting those keys would (a) raise the Q18/Q22/Q23 `asked`
counts and let them post positive `work`, and (b) make a remaining "neither" a
*clean* negative finding for the faults that genuinely present nothing.

### Bottom line

The negative-confirmation skips are meaningful answers the engine actively seeks
(53 discarded), but the current model extracts **no** information from them, and
the path to fixing that is gated on two changes, in order:

1. **Reconcile the 10 contradictions** (most are answer-key errors — the fault
   does present at heads/valves and should tick a box).
2. *Then* optionally let an empty multiselect apply a **small, targeted**
   rule-out, so "I looked, it's none of these" demotes the absent-symptom causes
   without destabilising the run.

Both touch `data.json`/the sim and must keep `tools/test_diagnose.py` green, so
they are flagged here rather than applied as part of this investigation.
