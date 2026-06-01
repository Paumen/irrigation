# Diagnostics testing & analysis

How the troubleshooting questionnaire is regression-tested and analysed. Three
files, one shared harness:

| file | role |
|------|------|
| `tools/diagnose_sim.py` | **harness** — per-fault answer key + the simulator (truthful and noisy), question-scope and robustness helpers. Imported by the other two. |
| `tools/test_diagnose.py` | **gate** — pass/fail convergence + robustness regression. Thin layer over the harness. |
| `tools/diagnose_report.py` | **microscope** — analysis report over the same simulations (trajectory, family confusion, lock-in, question scorecard, robustness). |
| `tools/diagnose_baseline.json` | regenerable snapshot of observed lock-in **and robustness** numbers. |

All stdlib-only, matching `engine.py`.

## Review of the old setup → what changed

The original `test_diagnose.py` was a single 300-line file that conflated three
jobs and was brittle:

1. **The answer key (the real asset) was trapped in the test.** `T1/T2/CTX/MULTI`
   — what a homeowner with each true fault would report — is a reusable dataset,
   but nothing else could touch it. → **Extracted to `diagnose_sim.py`.**
2. **The rich trajectory was computed and thrown away.** `simulate()` walked the
   whole funnel but returned only a list of ranks; the gate reduced each run to a
   final rank + one lock-in number. → **`simulate()` now returns a `Trajectory`**
   (per-step question, rank, top-3, confidence) so analysis is possible.
3. **~28 hand-maintained magic numbers drifted.** `BASELINE_LOCKIN`,
   `BASELINE_MEDIAN_LOCKIN`, etc. were observed values pasted into code; every
   weight tweak in `data.json` desynced them and the suite went yellow/red on
   noise (it was failing on import when this work started). → **Split intent from
   observation:** authored thresholds (`EXPECTED_MAX`, `PREFERRED_MAX`) stay in
   code; observed numbers move to `diagnose_baseline.json`, regenerated on purpose.
4. **The file ran on import** (no `__main__` guard, top-level gate) so it couldn't
   be reused as a library. → **Guarded;** importing it now has no side effects.
5. **Depth was 15.** Four faults (F1.8, F2.6, F4.4, F5.3) keep improving past Q15.
   → **Depth raised to 18** (`DEPTH` in `diagnose_sim.py`).

Severity semantics are unchanged: a true cause ending **out of top-3** (beyond a
documented `EXPECTED_MAX` cap) is a **FAILURE**; a cause that merely **shifts**
rank or lock-in but stays acceptable is a **WARNING**.

## Running it

```bash
python3 tools/test_diagnose.py                    # the gate (CI)
python3 tools/test_diagnose.py --update-baseline  # re-record lock-in snapshot
python3 tools/diagnose_report.py                  # analysis report (console)
python3 tools/diagnose_report.py --md report.md   # also write markdown
python3 tools/diagnose_report.py --json           # raw metrics for tooling
```

**Workflow after editing `data.json`:** run the gate. A FAILURE means a fault
fell out of top-3, or median error-recovery collapsed below the floor — fix the
weights. WARNINGs about lock-in or robustness shifts are expected after
intentional tuning: eyeball the report, then re-run `--update-baseline` to accept
the new numbers. WARNINGs about a *preferred-rank* shift (e.g. F2.6 slipping from
#1 to #2) are real signal — investigate before accepting.

The gate's robustness check re-runs every fault `NOISE_TRIALS` times with
`NOISE_RATE` of answers replaced by a random valid answer (seeded, deterministic),
and asserts the overall median recovery clears `MIN_MEDIAN_RECOVERY`.

## What the report tells you

- **Rank trajectory** — a row of rank cells per fault (✅ #1 · 🟩 #2–3 · 🟨 #4–6 ·
  🟧 #7–9 · 🟥 #10+), one per question asked, sorted by F-code. Two lock-in columns: `fam` =
  questions until the right *component* leads (#1) and holds, and `top3` = until the
  exact cause locks into the top-3. All 29 faults reach the right family at #1
  (median 6 questions) — including the three that never pin the exact sub-cause — so
  the engine always finds *which part* is broken; only same-family sub-cause
  discrimination ever fails.
- **Family confusion** — the causes outranking each fault at the end. **Cross-family**
  cases (a *different* component winning — a triage gap) are listed in full; the
  **within-family** ones (a missing discriminator inside one component) are listed
  lighter. The four documented degeneracies (F4.4, F5.8, F7.3.2, F7.4) are all
  within-family.
- **Lock-in speed** — histogram (buckets of 4) of questions-to-lock-top-3, with
  median and mean. The right tail and the `never` bucket are where to spend effort.
- **Question scorecard** (behavioural) — per question: how often the adaptive engine
  reaches it (`asked`), its median position (`when`), and the average rank-improvement
  it gave the *true* fault (`work`). Followed by which questions *don't* pull their
  weight (Q6/Q17/Q19 cost rank on average).
- **Question character** (structural) — read straight from each question's effect
  weights, independent of the sims: `scope` (families it can move — triage vs narrow),
  `force` (strongest push — hard/firm/nudge), `rule-out` (share of evidence that
  *subtracts* to exonerate vs only adds), and `shape` (one decisive answer vs graded
  across all). These are independent axes; triage-vs-narrow is only one of them.
- **Question character** rows carry scanning bars per axis (scope/force/rule-out/shape).
- **Robustness** — each fault's clean rank path stacked against its **median rank path
  under 1-in-5 random answers** (same square scale), with how often the noisy run ends
  in the top-3 vs at #1 and the lock-in clean→noisy. Robust faults' noise rows track
  the clean path and end green; the documented degeneracies stay orange/red on both —
  no unique fingerprint, so one wrong answer keeps them behind a sibling.

## Known degeneracies (documented caps)

| fault | cap | why it can't reach top-3 yet |
|-------|-----|------------------------------|
| F4.4  | —   | relay install error is a near-shadow of F4.1; needs a wiggle/loose-lug option |
| F5.8  | 4   | low well shares the heatwave correlate with F5.3 (weighted higher) |
| F7.3.2| 4   | metering-port debris overlaps F7.3.1 / F7.1.2 |
| F7.4  | 4   | valve install error sits behind three F7 siblings; needs an assembly/mis-set discriminator |

Each needs a dedicated discriminating question/option, not a weight tweak.
