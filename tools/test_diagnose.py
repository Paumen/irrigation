"""Convergence regression test for the diagnostic engine + data.json.

Drives the engine exactly as the MCP `diagnose_irrigation` tool does — following
the #1 recommended-next question each step — feeding a representative homeowner
answer profile per fault. The discrete answers (Q1-Q8, Q12-Q23) and the context
answers (the Q9 ages matrix and the Q10/Q10b/Q11/Q11b recent-event matrices,
taken from each fault's "strongest context correlate") are the design's per-fault
answer key: what a homeowner whose true fault is F* would report.

Severity is two-tier. A true cause that ends OUT of the top 3 (beyond its
documented cap) is a FAILURE and exits non-zero. A cause that merely SHIFTS to
a worse rank but stays within the top 3 is a WARNING -- the suite still passes
but flags the regression. A handful of near-degenerate causes can only reach a
documented rank (see EXPECTED_MAX) until a dedicated discriminator is added.

It also tracks the median number of questions needed to lock a fault into the
top 3 and keep it there for the rest of the run (BASELINE_MEDIAN_LOCKIN); a
change in that convergence speed is reported as a WARNING.

Run: python3 tools/test_diagnose.py
"""

from __future__ import annotations

import json
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from engine import Engine

DATA = json.loads((Path(__file__).resolve().parent.parent / "data.json").read_text())
ENG = Engine(DATA)

# ---- per-fault answer key. Letters a/b/c/d -> option index 0/1/2/3 ; '-' = skip ----
T1_COLS = ["Q1", "Q2", "Q2q", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8"]
T2_COLS = ["Q12", "Q13", "Q14", "Q15", "Q16", "Q17", "Q18", "Q19", "Q20", "Q21", "Q22", "Q23"]

T1 = {
    "F1.5":   "a d - c b a d c a",
    "F1.8":   "a d - c b a d c c",
    "F2.1":   "a d - c d c d c c",
    "F2.5":   "a d - c d c d a c",
    "F2.6":   "a b a c a c a c a",
    "F2.8":   "a d - c d c d c a",
    "F3.1.1": "c d - a a a d c a",
    "F3.1.2": "a d - a a a d c a",
    "F3.1.3": "c d - a a a c c c",
    "F3.4":   "c d - a a a c c c",
    "F4.1":   "a d - c a c a c c",
    "F4.4":   "a d - c a c a c a",
    "F5.1":   "a d b b a c a c b",
    "F5.3":   "a d c d a c a b c",
    "F5.8":   "a a c d a b a b c",
    "F6.1":   "a a b d a b a c a",
    "F6.3":   "a a b a a b a c a",
    "F7.1.1": "c d - a a a d c a",
    "F7.1.2": "c a b a a a a c b",
    "F7.1.3": "c a b a a a a c b",
    "F7.3.1": "c d - a a a b c a",
    "F7.3.2": "c d b a a a a c a",
    "F7.4":   "c a b a a a a c a",
    "F8.1":   "c a b a a a a c a",
    "F8.3":   "c a b a a a a c a",
    "F9.1.1": "d a a a a a a c a",
    "F9.1.2": "d a a a a a a c b",  # 2b: grit-wear seizure is gradual, not sudden
    "F9.3":   "d a a a a a a c a",
    "F9.4":   "d a a a a a a c a",
}
T2 = {
    "F1.5":   "a a a a a a d a a a c a",
    "F1.8":   "a a a a a a d a a a c a",
    "F2.1":   "c b a a a a d b d a - a",
    "F2.5":   "c b a a a a d b d a - a",
    "F2.6":   "a b a a a a d a d a a a",
    "F2.8":   "c b a a a a d b d a - a",
    "F3.1.1": "a c b d a a d b a a - a",  # Q13c: high-resistance break reads low/fluctuating
    "F3.1.2": "a c b d a a d b a a - a",  # Q13c: high-resistance break reads low/fluctuating
    "F3.1.3": "a a c d a a d b a b - a",
    "F3.4":   "a a c d a a d b a c a a",
    "F4.1":   "c a a a a a d b b a - a",
    "F4.4":   "c a a a a a d b b a - a",
    "F5.1":   "c a a a a a d b c a - a",
    "F5.3":   "c a a a a a d b a a - a",
    "F5.8":   "b a a a a a d b a a - a",
    "F6.1":   "b a a a a a a b a a c a",
    "F6.3":   "b a a a a a d b a a c a",
    "F7.1.1": "a a b b b a d b a a - a",
    "F7.1.2": "b a a a b b b b a a b b",
    "F7.1.3": "b a a a b b b b a a b c",
    "F7.3.1": "a a a a b b d b a a - a",
    "F7.3.2": "a a a a b b d b a a - a",
    "F7.4":   "b a a a b b b b a a b a",
    "F8.1":   "b a a a a a c b a a c a",
    "F8.3":   "b a a a a a d b a a c a",
    "F9.1.1": "a a a a a a d b a a c a",
    "F9.1.2": "a a a a a a d a a a c a",
    "F9.3":   "a a a a a a d a a a c a",
    "F9.4":   "a a a a a a d b a a c a",
}

# Context answers (Q9 ages + Q10/Q10b/Q11/Q11b recent-event matrices) from each
# fault's strongest context correlate. step 4 = 12+ yrs; "right" = "started right
# after". Cells whose named event has no matching effect on the target cause are
# omitted (storm->F5.1, storm->F7.1.1).
CTX = {
    "F1.5":   {},
    "F1.8":   {"Q11b": {"outage": "right"}},
    "F2.1":   {"Q9": {"ctrl": 4}, "Q11": {"storm": "right"}},
    "F2.5":   {"Q11b": {"outage": "right"}},
    "F2.6":   {"Q10b": {"ctrl": "right"}},
    "F2.8":   {"Q11b": {"outage": "right"}},
    "F3.1.1": {"Q11b": {"dig": "right"}},
    "F3.1.2": {"Q11b": {"dig": "right"}},
    "F3.1.3": {"Q11": {"storm": "right"}},
    "F3.4":   {"Q10b": {"wiring": "right"}},
    "F4.1":   {"Q9": {"relay": 4}, "Q11": {"storm": "right"}},
    "F4.4":   {"Q10b": {"relay": "right"}},
    "F5.1":   {"Q9": {"pump": 4}},
    "F5.3":   {"Q9": {"pump": 3}, "Q11": {"heat": "right"}},
    "F5.8":   {"Q11": {"heat": "right"}},
    "F6.1":   {"Q11": {"freeze": "right"}, "Q9": {"mainHose": 4}},
    "F6.3":   {"Q10": {"hose": "right"}},
    "F7.1.1": {"Q9": {"valves": 4}},
    "F7.1.2": {"Q9": {"valves": 4}},
    "F7.1.3": {"Q11": {"freeze": "right"}, "Q9": {"valves": 4}},
    "F7.3.1": {"Q10": {"valves": "right"}},
    "F7.3.2": {"Q10": {"valves": "right"}},
    "F7.4":   {"Q10": {"valves": "right"}},
    "F8.1":   {"Q11": {"freeze": "right"}, "Q9": {"hose": 4}},
    "F8.3":   {"Q10": {"hose": "right"}},
    "F9.1.1": {"Q9": {"rotor": 4}},
    "F9.1.2": {"Q9": {"rotor": 4}},  # 2b: rotor age now feeds F9.1.2
    "F9.3":   {"Q10": {"rotor": "right"}},
    "F9.4":   {"Q10": {"rotor": "right"}},
}

LET = {"a": 0, "b": 1, "c": 2, "d": 3}

# Q18/Q22/Q23 are multiselect: a letter maps to the list of ticked option
# indices (a survey can report several things at once). The "none ticked"
# answers — Q18 "nothing visible", Q23 "no water" — carry no effects; like a
# real survey where the user ticks nothing and moves on, they are left
# unanswered for the simulator to skip (None below).
MULTI = {
    "Q18": {"a": [0], "b": [1], "c": [2], "d": None},
    "Q22": {"a": [0], "b": [1], "c": [2]},
    "Q23": {"a": None, "b": [0], "c": [1], "d": [0, 1]},
}

# A true cause that ends beyond this rank is a FAILURE. The default is top-3;
# these documented near-degeneracies can't reach top-3 with the current question
# set (each needs a dedicated discriminator to separate from a sibling — see the
# team notes / option list):
#   F4.4   relay install is a strict shadow of F4.1 (every reached answer, esp.
#          Q20=b, favours the physical defect). Needs a wiggle/loose-lug option.
#   F5.8   low well shares the heatwave correlate with F5.3, weighted higher.
#   F7.3.2 metering-port debris overlaps F7.3.1 / F7.1.2 almost exactly.
EXPECTED_MAX = {"F4.4": 25, "F5.8": 4, "F7.3.2": 4}
DEFAULT_MAX = 3  # top-3

# The preferred (ideal) rank each fault used to hold. Ending worse than this but
# still within the failure threshold (top-3 / documented cap) is a WARNING, not
# a failure: the cause shifted but stayed in the top 3. Faults absent here are
# only expected to land somewhere in the top 3.
PREFERRED_MAX = {
    # always-identifiable causes that should sit at #1
    "F3.1.1": 1, "F4.1": 1, "F5.1": 1, "F7.1.1": 1, "F9.4": 1, "F2.6": 1,
    # the locked-in data.json fixes (2b / 3c / 4c)
    "F9.1.2": 2, "F7.3.2": 4, "F2.5": 2,
}

# Baseline number of questions to LOCK each top-3-capable fault into the top 3
# and keep it there for the rest of the run. The median of these is the
# convergence-speed metric; a shift in either is reported as a WARNING.
BASELINE_LOCKIN = {
    "F1.5": 11, "F1.8": 13, "F2.1": 10, "F2.5": 15, "F2.6": 13, "F2.8": 10,
    "F3.1.1": 2, "F3.1.2": 5, "F3.1.3": 6, "F3.4": 6, "F4.1": 10,
    "F5.1": 3, "F5.3": 3, "F6.1": 11, "F6.3": 3, "F7.1.1": 4, "F7.1.2": 5,
    "F7.1.3": 8, "F7.3.1": 5, "F7.4": 11, "F8.1": 11, "F8.3": 7,
    "F9.1.1": 1, "F9.1.2": 1, "F9.3": 12, "F9.4": 1,
}
BASELINE_MEDIAN_LOCKIN = 6.5

failures: list[str] = []
warnings: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    if not cond:
        failures.append(f"{name}: {detail}")


def warn(name: str, detail: str = "") -> None:
    warnings.append(f"{name}: {detail}" if detail else name)


def build_key(fault: str) -> dict:
    key: dict = {}
    for col, let in zip(T1_COLS, T1[fault].split()):
        if let != "-":
            key[col] = LET[let]
    for col, let in zip(T2_COLS, T2[fault].split()):
        if let == "-":
            continue
        if col in MULTI:
            picks = MULTI[col][let]
            if picks is not None:  # None = none ticked -> left unanswered (skipped)
                key[col] = picks
        else:
            key[col] = LET[let]
    key.update(CTX[fault])
    return key


def simulate(fault: str, n: int = 15) -> list[int]:
    """Return the true fault's rank after each answered question, driving the
    engine by its own #1 recommended-next each step."""
    key = build_key(fault)
    answers, skipped = {}, {}
    ranks: list[int] = []
    while len(ranks) < n:
        recs = ENG.recommendations(answers, skipped)
        if not recs:
            break
        qid = recs[0]["q"]["id"]
        if qid in key:
            answers[qid] = key[qid]
            ranked = ENG.rank(answers)
            ranks.append(next(i for i, r in enumerate(ranked, 1) if r["id"] == fault))
        else:
            skipped[qid] = True  # context/age question with no discrete answer here
    return ranks


def lock_in(ranks: list[int], thr: int = DEFAULT_MAX) -> int | None:
    """Earliest number of answered questions after which the fault's rank stays
    <= thr for the entire remainder of the run. None if it never settles."""
    n = len(ranks)
    for k in range(1, n + 1):
        if all(r <= thr for r in ranks[k - 1:]):
            return k
    return None


# --- the engine starts every fault on the broad scope question ---
recs0 = ENG.recommendations({}, {})
check("empty state recommends Q1 first",
      bool(recs0) and recs0[0]["q"]["id"] == "Q1",
      str(recs0[0]["q"]["id"] if recs0 else None))

# --- every fault converges to its documented bound within 15 questions ---
results = {f: simulate(f) for f in T1}
for fault, ranks in results.items():
    check(f"{fault} ran the funnel", len(ranks) >= 3, f"only {len(ranks)} questions")
    # once the engine runs out of separating questions the rank is stable, so the
    # last value reached stands in for any unreached checkpoint.
    r15 = ranks[min(15, len(ranks)) - 1]
    cap = EXPECTED_MAX.get(fault, DEFAULT_MAX)
    pref = PREFERRED_MAX.get(fault, cap)
    # OUT of the top 3 (or beyond a documented degeneracy cap) -> FAILURE
    check(f"{fault} ends within top {cap}", r15 <= cap,
          f"got rank {r15} (out of top {cap})")
    # SHIFTED to a worse rank but still acceptable -> WARNING
    if r15 <= cap and r15 > pref:
        warn(f"{fault} shifted from preferred rank {pref} to {r15}",
             f"still within top {cap}")

# --- convergence speed: median # of questions to lock & keep a fault in top-3 ---
TOP3 = [f for f in T1 if EXPECTED_MAX.get(f, DEFAULT_MAX) <= DEFAULT_MAX]
lockins = {f: lock_in(results[f], DEFAULT_MAX) for f in TOP3}
# a top-3-capable fault that never settles in the top 3 is a FAILURE
for fault in TOP3:
    check(f"{fault} settles in top-3", lockins[fault] is not None,
          "never stays in top-3")
    # an individual fault whose lock-in moved is a WARNING
    base, now = BASELINE_LOCKIN.get(fault), lockins[fault]
    if base is not None and now is not None and now != base:
        warn(f"{fault} lock-in shifted",
             f"{base} -> {now} questions ({'slower' if now > base else 'faster'})")

locked = [v for v in lockins.values() if v is not None]
median_lockin = statistics.median(locked) if locked else None
# a shift in the headline median is a WARNING (convergence speed changed)
if median_lockin != BASELINE_MEDIAN_LOCKIN:
    direction = "slower" if (median_lockin or 0) > BASELINE_MEDIAN_LOCKIN else "faster"
    warn(f"median lock-in shifted {direction}",
         f"{BASELINE_MEDIAN_LOCKIN} -> {median_lockin} questions "
         f"over {len(locked)} top-3 faults")

print(f"--- diagnose: {len(T1)} faults | {len(locked)}/{len(T1)} lock into top-3 "
      f"| median lock-in {median_lockin} questions ---")
if warnings:
    print(f"WARN ({len(warnings)}) — ranking/speed shifts, suite still passes:")
    for w in warnings:
        print("  ~", w)
if failures:
    print(f"FAIL ({len(failures)})")
    for f in failures:
        print("  -", f)
    sys.exit(1)
print(f"diagnose: all {len(T1)} faults within top-3 bounds"
      + (f" ({len(warnings)} warning(s))" if warnings else ""))
