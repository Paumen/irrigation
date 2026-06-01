# Diagnostics testing & analysis

How the troubleshooting questionnaire is regression-tested and analysed. Three
files, one shared harness:

| file | role |
|------|------|
| `tools/diagnose_sim.py` | **harness** — per-fault answer key + the simulator that drives the engine through it, recording the full ranking trajectory. Imported by the other two. |
| `tools/test_diagnose.py` | **gate** — pass/fail convergence regression. Thin layer over the harness. |
| `tools/diagnose_report.py` | **microscope** — analysis report over the same simulations (trajectories, family confusion, lock-in buckets, question frequency / position / work). |
| `tools/diagnose_baseline.json` | regenerable snapshot of observed lock-in numbers (the convergence-speed baseline). |

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
fell out of top-3 — fix the weights. WARNINGs about lock-in shifts are expected
after intentional tuning: eyeball the report, then re-run `--update-baseline` to
accept the new numbers. WARNINGs about a *preferred-rank* shift (e.g. F2.6
slipping from #1 to #2) are real signal — investigate before accepting.

## What the report tells you

- **Rank trajectory** — a row of coloured squares per fault (🟩 #1 · 🟨 #2–3 ·
  🟧 #4–6 · 🟥 #7+), one per question asked, with an end badge (✅/🥈/❌). Spot
  faults that lock early vs late, and faults that bounce.
- **Family confusion** — the causes outranking each fault at the end, split into
  🟨 **siblings** (same parent `F<n>`) and 🟥 **cross-family**. This is the key
  design signal: sibling-only confusion is a *missing discriminator inside one
  component*; cross-family confusion is a *triage* gap and usually worse. The four
  documented degeneracies (F4.4, F5.8, F7.3.2, F7.4) are all sibling-only.
- **Lock-in speed** — histogram of questions-to-lock-top-3. The right tail and
  the `never` bucket are where to spend effort.
- **Question scorecard** — one table per question: how often the adaptive engine
  reaches it (`asked`), when in the funnel (`when`), and the mean rank-improvement
  it gives the *true* fault, badged 🔥/🟢/⚪/🔻. Q1/Q3/Q2 carry the early triage;
  🔻 questions (Q6, Q17, Q19) cost rank on average and are re-weight/cut candidates.

## Known degeneracies (documented caps)

| fault | cap | why it can't reach top-3 yet |
|-------|-----|------------------------------|
| F4.4  | —   | relay install error is a near-shadow of F4.1; needs a wiggle/loose-lug option |
| F5.8  | 4   | low well shares the heatwave correlate with F5.3 (weighted higher) |
| F7.3.2| 4   | metering-port debris overlaps F7.3.1 / F7.1.2 |
| F7.4  | 4   | valve install error sits behind three F7 siblings; needs an assembly/mis-set discriminator |

Each needs a dedicated discriminating question/option, not a weight tweak.
