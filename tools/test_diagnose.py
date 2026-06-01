"""Convergence regression gate for the diagnostic engine + data.json.

Drives the engine exactly as the MCP `diagnose_irrigation` tool does — following
the #1 recommended-next question each step — feeding each fault's representative
homeowner answer key. The simulator and the answer key now live in
`diagnose_sim.py`; this file is just the gate on top of them (and
`diagnose_report.py` reuses the same harness for analysis).

What it asserts, severity two-tier:

- **FAILURE** (exit 1): a true cause that ends OUT of the top 3 (beyond its
  documented `EXPECTED_MAX` cap), or a top-3-capable cause that never settles in
  the top 3. These are the hard invariants — author-owned intent, kept in code.
- **WARNING** (suite still passes): a cause that merely SHIFTS — a worse-but-
  still-acceptable final rank (vs `PREFERRED_MAX`), or a lock-in / median lock-in
  that moved versus the recorded baseline.

The brittle part of the old design — ~28 hand-maintained per-fault lock-in
constants that drifted on every weight tweak — is now a *regenerable snapshot*
(`diagnose_baseline.json`): observed numbers live in the snapshot, authored
intent (`EXPECTED_MAX`, `PREFERRED_MAX`) stays here. Regenerate the snapshot
deliberately with:

    python3 tools/test_diagnose.py --update-baseline

Run the gate with: python3 tools/test_diagnose.py
"""

from __future__ import annotations

import json
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from diagnose_sim import DEPTH, ENG, FAULTS, PARENT, simulate_all

BASELINE_PATH = Path(__file__).resolve().parent / "diagnose_baseline.json"

# ---- author-owned intent (NOT auto-regenerated) -----------------------------
# A true cause that ends beyond this rank is a FAILURE. Default is top-3; the
# entries below are documented near-degeneracies that can't reach top-3 with the
# current question set — each needs a dedicated discriminator to split it from a
# sibling. All four are *within-family* (same parent) confusions:
#   F4.4   relay install is a strict shadow of F4.1 (every reached answer favours
#          the physical defect). Needs a wiggle/loose-lug option.
#   F5.8   low well shares the heatwave correlate with F5.3, weighted higher.
#   F7.3.2 metering-port debris overlaps F7.3.1 / F7.1.2 almost exactly.
#   F7.4   valve install error ends stuck behind three F7 siblings
#          (F7.1.3 / F7.1.2 / F7.3.2); needs an assembly/mis-set discriminator.
EXPECTED_MAX = {"F4.4": 25, "F5.8": 4, "F7.3.2": 4, "F7.4": 4}
DEFAULT_MAX = 3  # top-3

# The preferred (ideal) rank each fault should hold. Ending worse than this but
# still within the failure threshold is a WARNING, not a failure.
PREFERRED_MAX = {
    # always-identifiable causes that should sit at #1
    "F3.1.1": 1, "F4.1": 1, "F5.1": 1, "F7.1.1": 1, "F9.4": 1, "F2.6": 1,
    # the locked-in data.json fixes (2b / 3c / 4c)
    "F9.1.2": 2, "F7.3.2": 4, "F2.5": 2,
}

failures: list[str] = []
warnings: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    if not cond:
        failures.append(f"{name}: {detail}")


def warn(name: str, detail: str = "") -> None:
    warnings.append(f"{name}: {detail}" if detail else name)


def cap_of(fault: str) -> int:
    return EXPECTED_MAX.get(fault, DEFAULT_MAX)


def compute_metrics() -> dict:
    """Observed convergence numbers — the regenerable baseline snapshot."""
    trajs = simulate_all(DEPTH)
    lockins = {
        f: trajs[f].lock_in(DEFAULT_MAX)
        for f in FAULTS
        if cap_of(f) <= DEFAULT_MAX
    }
    locked = [v for v in lockins.values() if v is not None]
    return {
        "depth": DEPTH,
        "lockin": lockins,
        "median_lockin": statistics.median(locked) if locked else None,
    }


def load_baseline() -> dict | None:
    if BASELINE_PATH.exists():
        return json.loads(BASELINE_PATH.read_text())
    return None


def save_baseline(metrics: dict) -> None:
    BASELINE_PATH.write_text(json.dumps(metrics, indent=2, sort_keys=True) + "\n")


def run_gate() -> int:
    # --- the engine starts every fault on the broad scope question ---
    recs0 = ENG.recommendations({}, {})
    check("empty state recommends Q1 first",
          bool(recs0) and recs0[0]["q"]["id"] == "Q1",
          str(recs0[0]["q"]["id"] if recs0 else None))

    trajs = simulate_all(DEPTH)

    # --- every fault converges to its documented bound within DEPTH questions ---
    for fault in FAULTS:
        traj = trajs[fault]
        check(f"{fault} ran the funnel", len(traj.steps) >= 3,
              f"only {len(traj.steps)} questions")
        rN = traj.rank_at(DEPTH)
        cap = cap_of(fault)
        pref = PREFERRED_MAX.get(fault, cap)
        # OUT of the top 3 (or beyond a documented degeneracy cap) -> FAILURE
        check(f"{fault} ends within top {cap}", rN <= cap,
              f"got rank {rN} (out of top {cap})")
        # SHIFTED to a worse rank but still acceptable -> WARNING
        if rN <= cap and rN > pref:
            warn(f"{fault} shifted from preferred rank {pref} to {rN}",
                 f"still within top {cap}")

    # --- convergence speed vs the recorded baseline snapshot ---
    metrics = compute_metrics()
    baseline = load_baseline()
    lockins = metrics["lockin"]

    for fault, now in lockins.items():
        # a top-3-capable fault that never settles in the top 3 is a FAILURE
        check(f"{fault} settles in top-3", now is not None, "never stays in top-3")

    if baseline is None:
        warn("no baseline snapshot",
             "run `python3 tools/test_diagnose.py --update-baseline` to record one")
    else:
        base_lock = baseline.get("lockin", {})
        for fault, now in lockins.items():
            base = base_lock.get(fault)
            if base is not None and now is not None and now != base:
                warn(f"{fault} lock-in shifted",
                     f"{base} -> {now} questions ({'slower' if now > base else 'faster'})")
        b_med, n_med = baseline.get("median_lockin"), metrics["median_lockin"]
        if b_med != n_med:
            direction = "slower" if (n_med or 0) > (b_med or 0) else "faster"
            warn(f"median lock-in shifted {direction}", f"{b_med} -> {n_med} questions")

    locked = [v for v in lockins.values() if v is not None]
    print(f"--- diagnose: {len(FAULTS)} faults | {len(locked)}/{len(FAULTS)} lock into "
          f"top-3 | median lock-in {metrics['median_lockin']} questions | depth {DEPTH} ---")
    if warnings:
        print(f"WARN ({len(warnings)}) — ranking/speed shifts, suite still passes:")
        for w in warnings:
            print("  ~", w)
    if failures:
        print(f"FAIL ({len(failures)})")
        for f in failures:
            print("  -", f)
        return 1
    print(f"diagnose: all {len(FAULTS)} faults within top-3 bounds"
          + (f" ({len(warnings)} warning(s))" if warnings else ""))
    return 0


def main() -> int:
    if "--update-baseline" in sys.argv:
        metrics = compute_metrics()
        save_baseline(metrics)
        print(f"wrote baseline snapshot -> {BASELINE_PATH.name} "
              f"(depth {metrics['depth']}, median lock-in {metrics['median_lockin']})")
        return 0
    return run_gate()


if __name__ == "__main__":
    sys.exit(main())
