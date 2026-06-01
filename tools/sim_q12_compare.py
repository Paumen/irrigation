"""Before/after for softening Q12 option-a ('zone runs on bleed') downstream
penalties from -1.6 to -0.4. Re-runs the whole loop for each fault under both
catalogues (so question ordering re-derives, not just re-scoring)."""

from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from engine import Engine  # noqa: E402
import sim_faults as S  # noqa: E402

RAW = json.load(open(Path(__file__).resolve().parent.parent / "data.json"))
DOWNSTREAM = ["F7.1.2", "F7.1.3", "F7.4", "F8", "F9"]  # the -1.6 entries in Q12 opt a


def engine_with(downstream_val: float) -> Engine:
    d = copy.deepcopy(RAW)
    for q in d["questions"]:
        if q["id"] == "Q12":
            eff = q["options"][0]["effects"]  # option a = "Yes — zone runs"
            for k in DOWNSTREAM:
                eff[k] = downstream_val
    return Engine(d)


def cell(ranks, n):
    r = ranks[n]
    return "—" if r is None else f"#{r[0]}"


def main() -> None:
    before = engine_with(-1.6)
    after = engine_with(-0.4)

    print("Rank of target cause after 4 / 6 / 8 / 10 questions")
    print("                  BEFORE (-1.6)         AFTER (-0.4)")
    print("code        4    6    8   10        4    6    8   10     verdict@10")
    print("-" * 72)
    for code in S.TABLE1:
        rb = S.simulate(before, code)["ranks"]
        ra = S.simulate(after, code)["ranks"]
        b = [cell(rb, n) for n in S.CHECKPOINTS]
        a = [cell(ra, n) for n in S.CHECKPOINTS]
        pb = rb[10][0] if rb[10] else 99
        pa = ra[10][0] if ra[10] else 99
        verdict = "same" if pa == pb else (f"better {pb}->{pa}" if pa < pb else f"WORSE {pb}->{pa}")
        row = f"{code:<8}" + "".join(f"{x:>5}" for x in b) + "    " + "".join(f"{x:>5}" for x in a)
        print(f"{row}     {verdict}")


if __name__ == "__main__":
    main()
