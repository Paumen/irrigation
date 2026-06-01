"""Analysis report for the diagnostic questionnaire.

Where `test_diagnose.py` is a pass/fail *gate*, this is the *microscope*: it
runs the same per-fault simulations (shared `diagnose_sim` harness) but instead
of asserting, it characterises the engine's behaviour so you can see *why* the
numbers are what they are and where the questionnaire is weak.

Sections:
  1. Headline           — faults, lock-in median, depth, family-confusion mix.
  2. Rank trajectory    — per-fault row of coloured rank cells (one per question
                          asked, 🟩 #1 → 🟥 #7+), with base/final rank + lock-in.
  3. Family confusion   — for each fault, the causes outranking it at the end,
                          flagged sibling (same parent) vs cross-family; the whole
                          suite bucketed clean / sibling-only / cross.
  4. Lock-in speed      — histogram of how many questions it takes to lock a fault
                          into the top-3 and keep it there.
  5. Question scorecard — per question: how often it's asked across the adaptive
                          runs, its mean position in the funnel, and the mean
                          rank-improvement it delivers (which questions do the work).

Run:   python3 tools/diagnose_report.py            # console
       python3 tools/diagnose_report.py --md out.md  # also write a markdown file
       python3 tools/diagnose_report.py --json       # raw metrics as JSON
"""

from __future__ import annotations

import json
import re
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from diagnose_sim import (
    DEPTH, ENG, FAULTS, LABEL, PARENT, build_key, simulate_all,
)

DEFAULT_MAX = 3


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
# rendering helpers — emoji cells carry the colour in both terminal & markdown
# ----------------------------------------------------------------------------
def rank_cell(r: int) -> str:
    """One coloured square for a rank: green #1 → red out-of-the-running."""
    return "🟩" if r == 1 else "🟨" if r <= 3 else "🟧" if r <= 6 else "🟥"


def fcode_key(f: str) -> list[int]:
    """Natural sort key for an F-code: F3.1.1 -> [3, 1, 1]."""
    return [int(x) for x in re.findall(r"\d+", f)]


def work_badge(mean: float) -> str:
    """How much a question moves the true fault's rank, at a glance."""
    if mean >= 1.0:
        return "🔥"
    if mean >= 0.1:
        return "🟢"
    if mean >= -0.05:
        return "⚪"
    return "🔻"


def hbar(n: int, scale: int, width: int = 12) -> str:
    return "█" * max(0, round(n / scale * width)) if scale else ""


# ----------------------------------------------------------------------------
# section renderers -> list[str] lines
# ----------------------------------------------------------------------------
def sec_headline(g: dict) -> list[str]:
    rows = g["rows"]
    locks = [r["lock_in"] for r in rows if r["lock_in"] is not None]
    fm = g["family_mix"]
    at1 = sum(1 for r in rows if r["final_rank"] == 1)
    in23 = sum(1 for r in rows if 1 < r["final_rank"] <= 3)
    out = len(rows) - at1 - in23
    med = statistics.median(locks) if locks else None
    return [
        "# Diagnostic questionnaire — analysis report",
        "",
        f"**{len(rows)} faults · depth {DEPTH}**",
        "",
        f"- ✅ **{at1}** end at #1  ·  🥈 **{in23}** more in top-3  ·  ❌ **{out}** out of top-3",
        f"- 🎯 lock-in: **{len(locks)}/{len(rows)}** settle & hold top-3 · median **{med}** questions",
        f"- 🌳 confusion: ✅ **{fm['clean']}** clean · 🟨 **{fm['sibling-only']}** sibling-only · "
        f"🟥 **{fm['cross-family']}** cross-family",
    ]


def sec_trajectory(g: dict) -> list[str]:
    out = ["## Rank trajectory",
           "",
           "Each square = the true fault's rank after one question. "
           "🟩 #1 · 🟨 #2–3 · 🟧 #4–6 · 🟥 #7+.",
           "",
           "```",
           f"{'fault':7s}{'par':5s}{'base→fin':9s}{'lock':5s}trajectory →"]
    for r in sorted(g["rows"], key=lambda x: fcode_key(x["fault"])):
        lock = str(r["lock_in"]) if r["lock_in"] is not None else "—"
        cells = "".join(rank_cell(x) for x in r["ranks"])
        out.append(f"{r['fault']:7s}{r['parent']:5s}"
                   f"{r['base_rank']:>4}→{r['final_rank']:<4}{lock:5s}{cells}")
    out.append("```")
    return out


def sec_family(g: dict) -> list[str]:
    rows = [r for r in g["rows"] if r["kind"] != "clean"]
    cross = [r for r in rows if r["kind"] == "cross-family"]
    sibling = [r for r in rows if r["kind"] == "sibling-only"]
    out = ["## Family confusion",
           "",
           "Causes still outranking each fault at the end. "
           "🟥 a *different* family is winning (triage gap) — 🟨 only its *own* "
           "family (a discriminator gap inside one component).",
           ""]
    for r in sorted(cross, key=lambda x: -x["final_rank"]):
        sib = f"  (+ own-family {', '.join(r['siblings'])})" if r["siblings"] else ""
        out.append(f"🟥 `{r['fault']}` #{r['final_rank']} ← "
                   f"{', '.join(r['cross'])}{sib}")
    for r in sorted(sibling, key=lambda x: -x["final_rank"]):
        out.append(f"🟨 `{r['fault']}` #{r['final_rank']} ← {', '.join(r['siblings'])}")
    out += ["",
            f"_The {len(sibling)} 🟨 cases are missing within-component discriminators "
            "(F4.4 / F5.8 / F7.3.2 / F7.4 are the documented ones); the "
            f"{len(cross)} 🟥 case is the one most worth a new question._"]
    return out


def sec_lockin_buckets(g: dict) -> list[str]:
    buckets = [("1–3", 1, 3, "🟩"), ("4–6", 4, 6, "🟩"), ("7–9", 7, 9, "🟨"),
               ("10–12", 10, 12, "🟨"), ("13–15", 13, 15, "🟧"), ("16–18", 16, 18, "🟧")]
    counts = {b[0]: 0 for b in buckets}
    never = 0
    for r in g["rows"]:
        li = r["lock_in"]
        if li is None:
            never += 1
            continue
        for label, lo, hi, _ in buckets:
            if lo <= li <= hi:
                counts[label] += 1
                break
    scale = max([*counts.values(), never, 1])
    out = ["## Lock-in speed",
           "",
           "Questions needed to lock a fault into the top-3 and keep it there.",
           ""]
    for label, _, _, emo in buckets:
        n = counts[label]
        out.append(f"{emo} `{label:>5}` {hbar(n, scale)} {n}")
    out.append(f"🟥 `{'never':>5}` {hbar(never, scale)} {never}")
    return out


def sec_question_scorecard(g: dict) -> list[str]:
    qs = g["qstats"]
    n_runs = len(g["rows"])
    out = ["## Question scorecard",
           "",
           "Sorted by **work** = mean rank-improvement the question gives the true "
           "fault (🔥 big mover · 🟢 helps · ⚪ marginal · 🔻 hurts). "
           "`asked` = share of runs that reach it; `when` = mean position (1 = first).",
           "",
           "```",
           f"   {'q':5s}{'asked':14s}{'when':6s}{'meanΔ':>6s}"]
    def keyfn(kv):
        return -statistics.fmean(kv[1]["deltas"])
    for qid, d in sorted(qs.items(), key=keyfn):
        mean = statistics.fmean(d["deltas"])
        pct = d["asked"] / n_runs * 100
        asked = f"{pct:3.0f}% {hbar(d['asked'], n_runs, 8)}"
        out.append(f"{work_badge(mean)} {qid:5s}{asked:14s}"
                   f"{statistics.fmean(d['positions']):4.1f}  {mean:+6.2f}")
    out.append("```")
    return out


SECTIONS = [
    sec_headline, sec_trajectory, sec_family, sec_lockin_buckets,
    sec_question_scorecard,
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
