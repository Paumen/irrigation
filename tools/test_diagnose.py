"""Convergence regression test for the diagnostic engine + data.json.

Drives the engine exactly as the MCP `diagnose_irrigation` tool does — following
the #1 recommended-next question each step — feeding a representative homeowner
answer profile per fault. The discrete answers (Q1-Q8, Q12-Q23) and the context
answers (the Q9 ages matrix and the Q10/Q10b/Q11/Q11b recent-event matrices,
taken from each fault's "strongest context correlate") are the design's per-fault
answer key: what a homeowner whose true fault is F* would report.

It asserts each true cause climbs to the top of the ranked list within 15
questions. A handful of near-degenerate causes can only reach a documented
rank (see EXPECTED_MAX) until a dedicated discriminator is added.

Run: python3 tools/test_diagnose.py
"""

from __future__ import annotations

import json
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
    "F3.1.1": "a a b d a a d b a a - a",
    "F3.1.2": "a a b d a a d b a a - a",
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

# Every fault should reach top-3 within 15 questions, except these documented
# near-degeneracies (each needs a dedicated discriminator to separate from a
# sibling — see the team notes / option list):
#   F4.4   relay install is a strict shadow of F4.1 (every reached answer, esp.
#          Q20=b, favours the physical defect). Needs a wiggle/loose-lug option.
#   F5.8   low well shares the heatwave correlate with F5.3, weighted higher.
#   F7.3.2 metering-port debris overlaps F7.3.1 / F7.1.2 almost exactly.
EXPECTED_MAX = {"F4.4": 25, "F5.8": 4, "F7.3.2": 4}
DEFAULT_MAX = 3

failures: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    if not cond:
        failures.append(f"{name}: {detail}")


def build_key(fault: str) -> dict:
    key: dict = {}
    for col, let in zip(T1_COLS, T1[fault].split()):
        if let != "-":
            key[col] = LET[let]
    for col, let in zip(T2_COLS, T2[fault].split()):
        if let != "-":
            key[col] = [LET[let]] if col == "Q22" else LET[let]
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
    check(f"{fault} rank@15 <= {cap}", r15 <= cap, f"got rank {r15}")

# --- lock in the four data.json fixes so a later edit can't silently undo them ---
def r15(f: str) -> int:
    return results[f][min(15, len(results[f])) - 1]

check("2b: F9.1.2 (gear-drive) lifted from 4 to <=2", r15("F9.1.2") <= 2, f"got {r15('F9.1.2')}")
check("3c: F7.3.2 (metering port) lifted from 7 to <=4", r15("F7.3.2") <= 4, f"got {r15('F7.3.2')}")
check("4c: F2.5 (firmware) lifted from 3 to <=2", r15("F2.5") <= 2, f"got {r15('F2.5')}")

# the always-identifiable causes must stay exactly #1 (no-regression guard)
for fault in ("F3.1.1", "F4.1", "F5.1", "F7.1.1", "F9.4", "F2.6"):
    check(f"{fault} stays rank 1", r15(fault) == 1, f"got {r15(fault)}")

if failures:
    print(f"FAIL ({len(failures)})")
    for f in failures:
        print("  -", f)
    sys.exit(1)
print(f"diagnose: all {len(T1)} faults converge within bounds")
