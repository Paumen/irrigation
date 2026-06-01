"""Simulate the troubleshoot loop for each fault code and report where the
target cause ranks after 4 / 6 / 8 / 10 answered questions.

Question order follows the troubleshoot playbook:
  * Round 1 (Q1-Q4 answered): fixed openers [Q1, Q2, Q3, Q8] -- the three
    one-trip observers + the progression recall.
  * Round 2 (Q5-Q8): the four highest-D LOW/MID-effort questions (effort >= 3,
    i.e. not the hands-on multimeter/swap/flow-meter tests), one at a time.
  * Round 3+ (Q9+): the highest-D question overall, one at a time.
At every step we only ever feed a question we actually have a table answer for
(Q9/Q10/Q10b/Q11/Q11b have no answers in the brief, so they are never fed), and
the engine's own `requires` gate is respected (Q2q only if Q2 == a).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from engine import Engine  # noqa: E402

DATA_PATH = Path(__file__).resolve().parent.parent / "data.json"

LETTER = {"a": 0, "b": 1, "c": 2, "d": 3}

# Each cell is the raw brief value. "-" / "" => not answered (skip).
# "x/y" => take the first listed (primary). Bold markers already stripped.
# Q22 is multiselect: a single letter means a one-item selection.
COLS1 = ["Q1", "Q2", "Q2q", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8"]
COLS2 = ["Q12", "Q13", "Q14", "Q15", "Q16", "Q17", "Q18", "Q19", "Q20", "Q21", "Q22", "Q23"]

TABLE1 = {
    "F1.5":   ["a", "d", "-", "c", "b",   "a", "d",   "c",   "a"],
    "F1.8":   ["a", "d", "-", "c", "b/c", "a", "d",   "c",   "c"],
    "F2.1":   ["a", "d", "-", "c", "d",   "c", "d",   "c",   "a/c"],
    "F2.5":   ["a", "d", "-", "c", "d",   "c", "d",   "a",   "c"],
    "F2.6":   ["a", "b/d", "a", "c/a", "a", "a/c", "a", "c", "a"],
    "F2.8":   ["a", "d", "-", "c", "d",   "c", "d",   "c",   "a"],
    "F3.1.1": ["c", "d", "-", "a", "a",   "a", "d",   "c",   "a"],
    "F3.1.2": ["a", "d", "-", "a", "a",   "a", "d",   "c",   "a"],
    "F3.1.3": ["c", "d", "-", "a", "a",   "a", "c/d", "c",   "c"],
    "F3.4":   ["c", "d/b", "-", "a", "a", "a", "c/d", "c",   "a/c"],
    "F4.1":   ["a", "d", "-", "c", "a",   "c", "a",   "c",   "a/c"],
    "F4.4":   ["a", "d", "-", "c", "a",   "c", "a",   "c",   "a"],
    "F5.1":   ["a", "d", "b", "b", "a",   "c", "a",   "c/b", "a/b"],
    "F5.3":   ["a", "d", "c", "d", "a",   "c", "a",   "b",   "c"],
    "F5.8":   ["a", "a", "c", "d", "a",   "b", "a",   "b",   "c"],
    "F6.1":   ["a", "a", "b", "a/d", "a", "b", "a",   "c",   "a"],
    "F6.3":   ["a", "a", "b/d", "a", "a", "b", "a",   "c",   "a"],
    "F7.1.1": ["c", "d", "-", "a", "a",   "a", "d/b", "c",   "a"],
    "F7.1.2": ["c", "a", "b", "a", "a",   "a", "a",   "c",   "b"],
    "F7.1.3": ["c", "a", "b", "a", "a",   "a", "a",   "c",   "a/b"],
    "F7.3.1": ["c", "d", "-", "a", "a",   "a", "a/b", "c",   "a"],
    "F7.3.2": ["c", "d/a", "b", "a", "a", "a", "a",   "c",   "a"],
    "F7.4":   ["c", "a", "b", "a", "a",   "a", "a",   "c",   "a"],
    "F8.1":   ["c", "a", "b", "a", "a",   "a", "a",   "c",   "a"],
    "F8.3":   ["c", "a", "b/d", "a", "a", "a", "a",   "c",   "a"],
    "F9.1.1": ["d", "a", "a", "a", "a",   "a", "a",   "c",   "a"],
    "F9.1.2": ["d", "a", "a", "a", "a",   "a", "a",   "c",   "a"],
    "F9.3":   ["d", "a", "a", "a", "a",   "a", "a",   "c",   "a"],
    "F9.4":   ["d", "a", "a", "a", "a",   "a", "a",   "c",   "a"],
}

TABLE2 = {
    "F1.5":   ["a", "a",   "a",   "a",   "a", "a", "d",   "a",   "a",   "a", "c", "a"],
    "F1.8":   ["a", "a",   "a",   "a",   "a", "a", "d",   "a",   "a",   "a", "c", "a"],
    "F2.1":   ["c", "b",   "a",   "a",   "a", "a", "d",   "b",   "d",   "a", "-", "a"],
    "F2.5":   ["c", "b",   "a",   "a",   "a", "a", "d",   "b",   "d",   "a", "-", "a"],
    "F2.6":   ["a", "a/b", "a",   "a",   "a", "a", "d",   "a",   "d",   "a", "a", "a"],
    "F2.8":   ["c", "b",   "a",   "a",   "a", "a", "d",   "b",   "d",   "a", "-", "a"],
    "F3.1.1": ["a", "a",   "b",   "d",   "a", "a", "d",   "b",   "a",   "a", "-", "a"],
    "F3.1.2": ["a", "a",   "b",   "d",   "a", "a", "d",   "b",   "a",   "a", "-", "a"],
    "F3.1.3": ["a", "a",   "c",   "d",   "a", "a", "d",   "b",   "a",   "b", "-", "a"],
    "F3.4":   ["a", "a",   "c",   "d",   "a", "a", "d",   "b",   "a",   "c", "a", "a"],
    "F4.1":   ["c", "a",   "a",   "a",   "a", "a", "d",   "b",   "b/d", "a", "-", "a"],
    "F4.4":   ["c", "a",   "a",   "a",   "a", "a", "d",   "b",   "b/d", "a", "-", "a"],
    "F5.1":   ["c", "a",   "a",   "a",   "a", "a", "d",   "b",   "c",   "a", "-", "a"],
    "F5.3":   ["c", "a",   "a",   "a",   "a", "a", "d",   "b",   "a",   "a", "-", "a"],
    "F5.8":   ["b", "a",   "a",   "a",   "a", "a", "d",   "b",   "a",   "a", "-", "a"],
    "F6.1":   ["b", "a",   "a",   "a",   "a", "a", "a",   "b",   "a",   "a", "c", "a"],
    "F6.3":   ["b", "a",   "a",   "a",   "a", "a", "d",   "b",   "a",   "a", "c", "a"],
    "F7.1.1": ["a", "a",   "b",   "b/c", "b", "a", "d",   "b",   "a",   "a", "-", "a"],
    "F7.1.2": ["b", "a",   "a",   "a",   "b", "b", "b",   "b",   "a",   "a", "b", "b"],
    "F7.1.3": ["b", "a",   "a",   "a",   "b", "b", "b",   "b",   "a",   "a", "b", "c"],
    "F7.3.1": ["a", "a",   "a",   "a",   "b", "b", "d",   "b",   "a",   "a", "-", "a"],
    "F7.3.2": ["a", "a",   "a",   "a",   "b", "b", "d",   "b",   "a",   "a", "-", "a"],
    "F7.4":   ["b", "a",   "a",   "a",   "b", "b", "b/d", "b",   "a",   "a", "b", "a"],
    "F8.1":   ["b", "a",   "a",   "a",   "a", "a", "c",   "b",   "a",   "a", "c", "a"],
    "F8.3":   ["b", "a",   "a",   "a",   "a", "a", "d",   "b",   "a",   "a", "c", "a"],
    "F9.1.1": ["a", "a",   "a",   "a",   "a", "a", "d",   "a/b", "a",   "a", "c", "a"],
    "F9.1.2": ["a", "a",   "a",   "a",   "a", "a", "d",   "a",   "a",   "a", "c", "a"],
    "F9.3":   ["a", "a",   "a",   "a",   "a", "a", "d",   "a",   "a",   "a", "c", "a"],
    "F9.4":   ["a", "a",   "a",   "a",   "a", "a", "d",   "a/b", "a",   "a", "c", "a"],
}

OPENERS = ["Q1", "Q2", "Q3", "Q8"]
CHECKPOINTS = [4, 6, 8, 10]


def first_letter(cell: str) -> str | None:
    cell = cell.strip()
    if cell in ("-", "", "—"):
        return None
    return cell.split("/")[0].strip()


def build_answers(code: str) -> dict[str, object]:
    """Map the brief's table letters to engine answer values for one fault."""
    raw: dict[str, str] = {}
    for col, val in zip(COLS1, TABLE1[code]):
        raw[col] = val
    for col, val in zip(COLS2, TABLE2[code]):
        raw[col] = val

    answers: dict[str, object] = {}
    for qid, cell in raw.items():
        letter = first_letter(cell)
        if letter is None:
            continue
        idx = LETTER[letter]
        if qid == "Q22":  # multiselect -> single-item list
            answers[qid] = [idx]
        else:
            answers[qid] = idx
    return answers


def target_rank(engine: Engine, code: str, answers: dict) -> tuple[int, float]:
    ranked = engine.rank(answers)
    for pos, r in enumerate(ranked, start=1):
        if r["id"] == code:
            return pos, r["pct"]
    return -1, 0.0


def next_question(engine: Engine, fed: dict, full: dict, low_effort_only: bool) -> str | None:
    """Highest-D recommended question we have a table answer for and haven't fed.

    `full` is this fault's complete table-answer map; we can only feed ids in it.
    `requires` and completed-gating are handled inside engine.recommendations().
    """
    recs = engine.recommendations(fed, {})
    for rec in recs:
        qid = rec["q"]["id"]
        if qid in fed or qid not in full:
            continue
        if low_effort_only and (rec["q"].get("effort") or 0) < 3:
            continue
        return qid
    return None


def simulate(engine: Engine, code: str) -> dict:
    full = build_answers(code)
    fed: dict[str, object] = {}
    order: list[str] = []

    # Round 1: fixed openers (only those present in the table -- all are).
    for qid in OPENERS:
        if qid in full:
            fed[qid] = full[qid]
            order.append(qid)

    # Rounds 2+: pick by D, low/mid-effort only until 8 answered, then anything.
    while len(fed) < 12:
        low_only = len(fed) < 8
        qid = next_question(engine, fed, full, low_only)
        if qid is None and low_only:
            # round-2 pool exhausted early: open up to any effort
            qid = next_question(engine, fed, full, False)
        if qid is None:
            break
        fed[qid] = full[qid]
        order.append(qid)

    # Ranks at each checkpoint (replay the first N fed answers, in order).
    ranks = {}
    for n in CHECKPOINTS:
        if len(order) >= n:
            subset = {q: full[q] for q in order[:n]}
            ranks[n] = target_rank(engine, code, subset)
        else:
            ranks[n] = None
    return {"order": order, "ranks": ranks, "n_fed": len(order)}


def main() -> None:
    with open(DATA_PATH) as f:
        engine = Engine(json.load(f))

    results = {}
    for code in TABLE1:
        results[code] = simulate(engine, code)

    # ---- Report 1: rank at each checkpoint ----
    print("=" * 78)
    print("RANK OF TARGET CAUSE AFTER N ANSWERED QUESTIONS  (rank #pos, pct%)")
    print("=" * 78)
    hdr = f"{'Code':<8} {'after 4':>14} {'after 6':>14} {'after 8':>14} {'after 10':>14}"
    print(hdr)
    print("-" * len(hdr))
    for code, res in results.items():
        cells = []
        for n in CHECKPOINTS:
            r = res["ranks"][n]
            if r is None:
                cells.append(f"{'(n/a)':>14}")
            else:
                pos, pct = r
                cells.append(f"{('#' + str(pos)):>5} {pct:6.1f}%  ")
        print(f"{code:<8} " + "".join(cells))

    # ---- Report 2: the question order actually fed ----
    print()
    print("=" * 78)
    print("QUESTION ORDER FED  (openers fixed; rest = engine's highest-D next)")
    print("=" * 78)
    for code, res in results.items():
        seq = res["order"]
        marked = []
        for i, q in enumerate(seq, 1):
            tag = q
            if i in CHECKPOINTS:
                tag = f"[{q}]"  # checkpoint boundary
            marked.append(tag)
        print(f"{code:<8} ({res['n_fed']:>2}) " + " ".join(marked))


if __name__ == "__main__":
    main()
