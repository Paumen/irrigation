"""Convergence regression gate for the diagnostic engine + data.json.

Observed numbers (lock-in, robustness) live in the regenerable snapshot
`diagnose_baseline.json`; authored intent (`EXPECTED_MAX`, `PREFERRED_MAX`)
stays here. Regenerate the snapshot with:

    python3 tools/test_diagnose.py --update-baseline
"""

from __future__ import annotations

import json
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from diagnose_sim import DATA, DEPTH, ENG, FAULTS, PARENT, robustness_all, simulate_all

BASELINE_PATH = Path(__file__).resolve().parent / "diagnose_baseline.json"

# Authored-value grids: data.json is hand-maintained, so guard the quantisation.
# Baselines snap to a 4-value grid; answer effects to a signed 10-value grid
# (note ±0.8/±1.2 are valid baselines but deliberately NOT valid effects).
ALLOWED_BASELINES = {0.6, 0.8, 1.0, 1.2}
ALLOWED_EFFECTS = {-1.6, -1.0, -0.6, -0.4, -0.2, 0.2, 0.4, 0.6, 1.0, 1.6}

# Copy budgets: keep question prompts, answer labels, and cause names terse
# enough to render (cause labels share a row with the F-code in the report).
MAX_QUESTION_LEN = 100
MAX_ANSWER_LEN = 45
MAX_CAUSE_LEN = 45

# parent -> direct child causes, derived from each cause's `parent` field.
_CHILDREN: dict[str, list[str]] = {}
for _c in DATA["causes"]:
    _CHILDREN.setdefault(_c["parent"], []).append(_c["id"])


def _descendants(node: str) -> set[str]:
    out: set[str] = set()
    stack = list(_CHILDREN.get(node, []))
    while stack:
        n = stack.pop()
        out.add(n)
        stack.extend(_CHILDREN.get(n, []))
    return out


def _answer_effects(q: dict):
    """Yield (answer_label, effects_dict) for every authored answer on a question."""
    for o in q.get("options", []):
        yield o.get("label", "?"), o.get("effects", {})
    for r in q.get("rows", []):  # matrix rows carry a per-cause effects dict
        if "effects" in r:
            yield r.get("id", "?"), r["effects"]


NOISE_RATE = 0.2
NOISE_TRIALS = 50
MIN_MEDIAN_RECOVERY = 0.6

# Failure rank cap per fault. Elevated entries are intentional within-family
# near-degeneracies that can't reach top-3 without a new discriminator; do not
# tighten to DEFAULT_MAX without adding one.
EXPECTED_MAX = {"F4.4": 25, "F5.8": 4, "F7.3.2": 4, "F7.4": 4}
DEFAULT_MAX = 3

# Preferred rank; ending worse but within EXPECTED_MAX is a WARNING.
PREFERRED_MAX = {
    "F3.1.1": 1, "F4.1": 1, "F5.1": 1, "F7.1.1": 1, "F9.4": 1, "F2.6": 1,
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


def validate_data() -> None:
    """Static data.json invariants: value grids and no parent/child double-counting."""
    for c in DATA["causes"]:
        check(f"{c['id']} baseline on grid", c.get("baseline") in ALLOWED_BASELINES,
              f"baseline {c.get('baseline')} not in {sorted(ALLOWED_BASELINES)}")
        lbl = c.get("label", "")
        check(f"{c['id']} name under {MAX_CAUSE_LEN}", len(lbl) < MAX_CAUSE_LEN,
              f"{len(lbl)} chars: {lbl!r}")

    for q in DATA["questions"]:
        text = q.get("text", "")
        check(f"{q['id']} text under {MAX_QUESTION_LEN}", len(text) < MAX_QUESTION_LEN,
              f"{len(text)} chars")
        for o in q.get("options", []):
            lbl = o.get("label", "")
            check(f"{q['id']} answer under {MAX_ANSWER_LEN}", len(lbl) < MAX_ANSWER_LEN,
                  f"{len(lbl)} chars: {lbl!r}")
        for label, effects in _answer_effects(q):
            for cid, v in effects.items():
                check(f"{q['id']} [{label}] effect on grid", v in ALLOWED_EFFECTS,
                      f"{cid}={v} not in {sorted(ALLOWED_EFFECTS)}")
            keys = set(effects)
            for cid in keys:
                clash = keys & _descendants(cid)
                check(f"{q['id']} [{label}] no parent+child effect", not clash,
                      f"{cid} given alongside descendant(s) {sorted(clash)}")


def compute_metrics() -> dict:
    trajs = simulate_all(DEPTH)
    lockins = {
        f: trajs[f].lock_in(DEFAULT_MAX)
        for f in FAULTS
        if cap_of(f) <= DEFAULT_MAX
    }
    locked = [v for v in lockins.values() if v is not None]
    rob = robustness_all(NOISE_TRIALS, NOISE_RATE, seed=0)
    recovery = {f: round(v["recovery"], 3) for f, v in rob.items()}
    return {
        "depth": DEPTH,
        "lockin": lockins,
        "median_lockin": statistics.median(locked) if locked else None,
        "robustness": recovery,
        "median_recovery": round(statistics.median(recovery.values()), 3),
    }


def load_baseline() -> dict | None:
    if BASELINE_PATH.exists():
        return json.loads(BASELINE_PATH.read_text())
    return None


def save_baseline(metrics: dict) -> None:
    BASELINE_PATH.write_text(json.dumps(metrics, indent=2, sort_keys=True) + "\n")


def run_gate() -> int:
    validate_data()

    recs0 = ENG.recommendations({}, {})
    check("empty state recommends Q1 first",
          bool(recs0) and recs0[0]["q"]["id"] == "Q1",
          str(recs0[0]["q"]["id"] if recs0 else None))

    trajs = simulate_all(DEPTH)

    for fault in FAULTS:
        traj = trajs[fault]
        check(f"{fault} ran the funnel", len(traj.steps) >= 3,
              f"only {len(traj.steps)} questions")
        rN = traj.rank_at(DEPTH)
        cap = cap_of(fault)
        pref = PREFERRED_MAX.get(fault, cap)
        check(f"{fault} ends within top {cap}", rN <= cap,
              f"got rank {rN} (out of top {cap})")
        if rN <= cap and rN > pref:
            warn(f"{fault} shifted from preferred rank {pref} to {rN}",
                 f"still within top {cap}")

    metrics = compute_metrics()
    baseline = load_baseline()
    lockins = metrics["lockin"]

    for fault, now in lockins.items():
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

    med_recovery = metrics["median_recovery"]
    check("median recovery clears floor", med_recovery >= MIN_MEDIAN_RECOVERY,
          f"median recovery {med_recovery} < floor {MIN_MEDIAN_RECOVERY}")
    if baseline is not None:
        b_recovery = baseline.get("robustness", {})
        for fault, now in metrics["robustness"].items():
            base = b_recovery.get(fault)
            if base is not None and now < base - 0.1:
                warn(f"{fault} robustness dropped", f"{base:.0%} -> {now:.0%} recovery")
        b_med_r = baseline.get("median_recovery")
        if b_med_r is not None and abs(b_med_r - med_recovery) > 0.02:
            direction = "down" if med_recovery < b_med_r else "up"
            warn(f"median recovery shifted {direction}", f"{b_med_r:.0%} -> {med_recovery:.0%}")

    locked = [v for v in lockins.values() if v is not None]
    print(f"--- diagnose: {len(FAULTS)} faults | {len(locked)}/{len(FAULTS)} lock into "
          f"top-3 | median lock-in {metrics['median_lockin']} questions | "
          f"median recovery {med_recovery:.0%} | depth {DEPTH} ---")
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
