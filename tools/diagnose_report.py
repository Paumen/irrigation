"""Analysis report for the diagnostic questionnaire.

Where `test_diagnose.py` is a pass/fail *gate*, this is the *microscope*: it
runs the same per-fault simulations (shared `diagnose_sim` harness) but instead
of asserting, it characterises the engine's behaviour so you can see *why* the
numbers are what they are and where the questionnaire is weak.

Sections:
  1. Headline                — faults, lock-in median, depth, family-confusion mix.
  2. Ranking trajectory      — per-fault sparkline of the true fault's rank over
                               the questions asked, with base/final rank + lock-in.
  3. Family confusion        — for each fault, the causes outranking it at the end,
                               flagged sibling (same parent) vs cross-family; the
                               whole suite bucketed clean / sibling-only / cross.
  4. Lock-in buckets         — histogram of how many questions it takes to lock a
                               fault into the top-3 and keep it there.
  5. Question frequency      — how often each question is actually asked across the
                               adaptive runs (the engine picks, so not every Q runs).
  6. Question position       — mean/median step index at which each question lands
                               (early triage vs late confirmation).
  7. Question work           — mean rank-improvement each question delivers to the
                               true fault when answered (which questions do the work).

Run:   python3 tools/diagnose_report.py            # console
       python3 tools/diagnose_report.py --md out.md  # also write a markdown file
       python3 tools/diagnose_report.py --json       # raw metrics as JSON
"""

from __future__ import annotations

import json
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from diagnose_sim import (
    DEPTH, ENG, FAULTS, LABEL, PARENT, build_key, simulate_all,
)

DEFAULT_MAX = 3
BARS = "▁▂▃▄▅▆▇█"


# ----------------------------------------------------------------------------
# metric computation (engine-driven; no assertions)
# ----------------------------------------------------------------------------
def final_confusers(fault: str) -> list[str]:
    """Cause ids ranked strictly above `fault` once its whole answer key is in."""
    ranked = ENG.rank(build_key(fault))
    above: list[str] = []
    for r in ranked:
        if r["id"] == fault:
            break
        above.append(r["id"])
    return above


def gather() -> dict:
    trajs = simulate_all(DEPTH)

    # per-fault summary + family confusion
    rows = []
    family_mix = {"clean": 0, "sibling-only": 0, "cross-family": 0}
    for f in FAULTS:
        t = trajs[f]
        confusers = final_confusers(f)
        parent = PARENT[f]
        siblings = [c for c in confusers if PARENT[c] == parent]
        cross = [c for c in confusers if PARENT[c] != parent]
        if not confusers:
            kind = "clean"
        elif not cross:
            kind = "sibling-only"
        else:
            kind = "cross-family"
        family_mix[kind] += 1
        rows.append({
            "fault": f, "parent": parent,
            "base_rank": t.base_rank, "final_rank": t.final_rank,
            "lock_in": t.lock_in(DEFAULT_MAX), "n_asked": len(t.steps),
            "ranks": t.ranks, "confusers": confusers,
            "siblings": siblings, "cross": cross, "kind": kind,
        })

    # question frequency / position / work, aggregated across all runs
    qstats: dict[str, dict] = {}
    for f in FAULTS:
        t = trajs[f]
        prev = t.base_rank
        for s in t.steps:
            d = qstats.setdefault(s.qid, {"asked": 0, "positions": [], "deltas": []})
            d["asked"] += 1
            d["positions"].append(s.i)
            d["deltas"].append(prev - s.rank)  # +ve = moved the true fault up
            prev = s.rank

    return {"trajs": trajs, "rows": rows, "family_mix": family_mix, "qstats": qstats}


# ----------------------------------------------------------------------------
# rendering helpers
# ----------------------------------------------------------------------------
def spark(ranks: list[int], worst: int = 8) -> str:
    """Sparkline where rank 1 is the tallest bar (best). Ranks >= worst floor out."""
    out = []
    for r in ranks:
        r = min(r, worst)
        idx = len(BARS) - 1 - int(round((r - 1) / (worst - 1) * (len(BARS) - 1)))
        out.append(BARS[max(0, min(len(BARS) - 1, idx))])
    return "".join(out)


def hbar(n: int, scale: int, width: int = 30) -> str:
    return "█" * max(0, round(n / scale * width)) if scale else ""


# ----------------------------------------------------------------------------
# section renderers -> list[str] lines
# ----------------------------------------------------------------------------
def sec_headline(g: dict) -> list[str]:
    rows = g["rows"]
    locks = [r["lock_in"] for r in rows if r["lock_in"] is not None]
    fm = g["family_mix"]
    at1 = sum(1 for r in rows if r["final_rank"] == 1)
    top3 = sum(1 for r in rows if r["final_rank"] <= 3)
    return [
        "# Diagnostic questionnaire — analysis report",
        "",
        f"- Faults simulated: **{len(rows)}**  |  questions per run (depth): **{DEPTH}**",
        f"- End at #1: **{at1}/{len(rows)}**  |  end in top-3: **{top3}/{len(rows)}**",
        f"- Lock into top-3 & stay: **{len(locks)}/{len(rows)}**  "
        f"|  median lock-in **{statistics.median(locks) if locks else None}** questions",
        f"- Family confusion: clean **{fm['clean']}**, "
        f"sibling-only **{fm['sibling-only']}**, cross-family **{fm['cross-family']}**",
    ]


def sec_trajectory(g: dict) -> list[str]:
    out = ["## Ranking trajectory (per fault)",
           "",
           "Sparkline: tall = rank 1 (best). `base→final` = rank before any "
           "question → after the full run. `lock` = questions to settle in top-3.",
           "",
           "```",
           f"{'fault':8s} {'parent':6s} trajectory (rank over questions)         "
           f"base→final  lock",
           f"{'-'*8} {'-'*6} {'-'*40} {'-'*10}  {'-'*4}"]
    for r in sorted(g["rows"], key=lambda x: (x["final_rank"] == 1, -x["final_rank"])):
        lock = r["lock_in"] if r["lock_in"] is not None else "—"
        out.append(f"{r['fault']:8s} {r['parent']:6s} "
                   f"{spark(r['ranks']):40s} "
                   f"{r['base_rank']:2d}→{r['final_rank']:<2d}      {str(lock):>4}")
    out.append("```")
    return out


def sec_family(g: dict) -> list[str]:
    out = ["## Family confusion (do the confusers share a parent?)",
           "",
           "For each fault that does **not** end at #1, the causes outranking it "
           "at the end — `S:` siblings (same parent), `X:` cross-family.",
           "",
           "```"]
    for r in sorted(g["rows"], key=lambda x: (x["kind"], x["final_rank"]), reverse=True):
        if r["kind"] == "clean":
            continue
        sib = ",".join(r["siblings"]) or "—"
        crx = ",".join(r["cross"]) or "—"
        flag = "SIBLING-ONLY" if r["kind"] == "sibling-only" else "CROSS-FAMILY"
        out.append(f"{r['fault']:8s} (#{r['final_rank']}, {flag:12s})  "
                   f"S:[{sib}]  X:[{crx}]")
    out.append("```")
    fm = g["family_mix"]
    out += ["",
            f"- **{fm['clean']}** faults end clean at #1 (no confusers).",
            f"- **{fm['sibling-only']}** are confused only by their *own family* — "
            "these are discriminator gaps inside one component, not mix-ups across "
            "the tree (the documented F4.4 / F5.8 / F7.3.2 / F7.4 degeneracies live here).",
            f"- **{fm['cross-family']}** are still outranked by a *different* "
            "component's cause at the end — the cases most worth a new question."]
    return out


def sec_lockin_buckets(g: dict) -> list[str]:
    buckets = [("1-3", 1, 3), ("4-6", 4, 6), ("7-9", 7, 9),
               ("10-12", 10, 12), ("13-15", 13, 15), ("16-18", 16, 18)]
    counts = {b[0]: 0 for b in buckets}
    never = 0
    for r in g["rows"]:
        li = r["lock_in"]
        if li is None:
            never += 1
            continue
        for label, lo, hi in buckets:
            if lo <= li <= hi:
                counts[label] += 1
                break
    scale = max([*counts.values(), never, 1])
    out = ["## Lock-in buckets (questions to lock & hold top-3)",
           "",
           "```"]
    for label, _, _ in buckets:
        n = counts[label]
        out.append(f"{label:>6} | {hbar(n, scale):30s} {n}")
    out.append(f"{'never':>6} | {hbar(never, scale):30s} {never}")
    out.append("```")
    return out


def sec_question_freq(g: dict) -> list[str]:
    qs = g["qstats"]
    n_runs = len(g["rows"])
    scale = max([d["asked"] for d in qs.values()] + [1])
    out = ["## Question frequency (how often each question is asked)",
           "",
           f"Out of {n_runs} fault runs. The engine chooses adaptively, so a "
           "question asked in every run is a universal triage step; a rare one is "
           "a narrow confirmer.",
           "",
           "```"]
    for qid, d in sorted(qs.items(), key=lambda kv: -kv[1]["asked"]):
        pct = d["asked"] / n_runs * 100
        out.append(f"{qid:5s} | {hbar(d['asked'], scale):28s} "
                   f"{d['asked']:3d}/{n_runs} ({pct:3.0f}%)")
    out.append("```")
    return out


def sec_question_position(g: dict) -> list[str]:
    qs = g["qstats"]
    out = ["## Question position in the trajectory (early vs late)",
           "",
           "Mean / median ordinal at which a question is asked, over the runs that "
           "asked it. Low = early triage; high = late confirmation.",
           "",
           "```",
           f"{'q':5s} {'mean':>5s} {'median':>7s} {'min':>4s} {'max':>4s}  asked",
           f"{'-'*5} {'-'*5} {'-'*7} {'-'*4} {'-'*4}  {'-'*5}"]
    for qid, d in sorted(qs.items(), key=lambda kv: statistics.fmean(kv[1]["positions"])):
        p = d["positions"]
        out.append(f"{qid:5s} {statistics.fmean(p):5.1f} {statistics.median(p):7.1f} "
                   f"{min(p):4d} {max(p):4d}  {d['asked']:5d}")
    out.append("```")
    return out


def sec_question_work(g: dict) -> list[str]:
    qs = g["qstats"]
    out = ["## Which questions do the most work (rank improvement)",
           "",
           "Mean change in the *true* fault's rank when a question is answered "
           "(+ = pushed the true cause up toward #1). `net` sums it over all runs; "
           "`up/flat/down` counts how often it helped / did nothing / hurt.",
           "",
           "```",
           f"{'q':5s} {'mean Δ':>7s} {'net':>5s}  {'up/flat/down':>13s}  asked",
           f"{'-'*5} {'-'*7} {'-'*5}  {'-'*13}  {'-'*5}"]
    def keyfn(kv):
        return -statistics.fmean(kv[1]["deltas"])
    for qid, d in sorted(qs.items(), key=keyfn):
        deltas = d["deltas"]
        up = sum(1 for x in deltas if x > 0)
        flat = sum(1 for x in deltas if x == 0)
        down = sum(1 for x in deltas if x < 0)
        out.append(f"{qid:5s} {statistics.fmean(deltas):7.2f} {sum(deltas):5d}  "
                   f"{up:3d}/{flat:3d}/{down:3d}    {d['asked']:5d}")
    out.append("```")
    return out


SECTIONS = [
    sec_headline, sec_trajectory, sec_family, sec_lockin_buckets,
    sec_question_freq, sec_question_position, sec_question_work,
]


def render(g: dict) -> str:
    blocks = []
    for fn in SECTIONS:
        blocks.append("\n".join(fn(g)))
    return "\n\n".join(blocks) + "\n"


def as_json(g: dict) -> str:
    payload = {
        "depth": DEPTH,
        "family_mix": g["family_mix"],
        "faults": [
            {k: v for k, v in r.items() if k != "ranks"} | {"ranks": r["ranks"]}
            for r in g["rows"]
        ],
        "questions": {
            qid: {
                "asked": d["asked"],
                "mean_position": round(statistics.fmean(d["positions"]), 2),
                "median_position": statistics.median(d["positions"]),
                "mean_delta": round(statistics.fmean(d["deltas"]), 3),
                "net_delta": sum(d["deltas"]),
            }
            for qid, d in g["qstats"].items()
        },
    }
    return json.dumps(payload, indent=2)


def main() -> None:
    g = gather()
    if "--json" in sys.argv:
        print(as_json(g))
        return
    report = render(g)
    print(report)
    if "--md" in sys.argv:
        i = sys.argv.index("--md")
        path = Path(sys.argv[i + 1]) if i + 1 < len(sys.argv) else Path("diagnose_report.md")
        path.write_text(report)
        print(f"\n[wrote markdown -> {path}]")


if __name__ == "__main__":
    main()
