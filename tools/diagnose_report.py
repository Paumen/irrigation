"""Analysis report for the diagnostic questionnaire.

Where `test_diagnose.py` is a pass/fail *gate*, this is the *microscope*: it
runs the same per-fault simulations (shared `diagnose_sim` harness) but instead
of asserting, it characterises the engine's behaviour so you can see *why* the
numbers are what they are and where the questionnaire is weak.

Sections:
  1. Headline           — outcome / lock-in / confusion / robustness, at a glance.
  2. Rank trajectory    — per-fault row of rank cells (one per question asked,
                          ✅ #1 · 🟩 #2–3 · 🟨 #4–6 · 🟥 #7+), with lock-in.
  3. Family confusion   — faults still outranked at the end; cross-family cases
                          (a different component winning) called out in full,
                          within-family ones listed lighter.
  4. Lock-in speed      — histogram (buckets of 4) of questions to lock & hold top-3.
  5. Question scorecard — per question: how often asked, median position, median
                          rank-improvement (work), and scope (families it touches).
                          Plus which questions don't pull their weight, and the
                          triage-vs-narrowing split.
  6. Robustness         — how well each fault survives 1-in-5 random answers.

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
    DEPTH, ENG, FAULTS, PARENT, build_key, question_families,
    robustness_all, simulate_all,
)

DEFAULT_MAX = 3
NOISE_RATE = 0.2
NOISE_TRIALS = 50


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

    rows = []
    family_mix = {"clean": 0, "sibling-only": 0, "cross-family": 0}
    for f in FAULTS:
        t = trajs[f]
        confusers = final_confusers(f)
        parent = PARENT[f]
        siblings = [c for c in confusers if PARENT[c] == parent]
        cross = [c for c in confusers if PARENT[c] != parent]
        kind = "clean" if not confusers else ("sibling-only" if not cross else "cross-family")
        family_mix[kind] += 1
        rows.append({
            "fault": f, "parent": parent,
            "base_rank": t.base_rank, "final_rank": t.final_rank,
            "lock_in": t.lock_in(DEFAULT_MAX), "ranks": t.ranks,
            "confusers": confusers, "siblings": siblings, "cross": cross, "kind": kind,
        })

    # question frequency / position / work (rank-improvement), across all runs
    qstats: dict[str, dict] = {}
    for f in FAULTS:
        t = trajs[f]
        prev = t.base_rank
        for s in t.steps:
            d = qstats.setdefault(s.qid, {"asked": 0, "positions": [], "deltas": []})
            d["asked"] += 1
            d["positions"].append(s.i)
            d["deltas"].append(prev - s.rank)
            prev = s.rank

    fams = question_families()
    for qid, d in qstats.items():
        d["families"] = len(fams.get(qid, set()))
        d["med_pos"] = statistics.median(d["positions"])
        d["med_work"] = statistics.median(d["deltas"])
        d["mean_work"] = statistics.fmean(d["deltas"])

    return {
        "rows": rows, "family_mix": family_mix, "qstats": qstats,
        "robustness": robustness_all(NOISE_TRIALS, NOISE_RATE, seed=0),
    }


# ----------------------------------------------------------------------------
# rendering helpers
# ----------------------------------------------------------------------------
def rank_cell(r: int) -> str:
    """A rank as one square: ✅ #1 · 🟩 #2–3 · 🟨 #4–6 · 🟥 #7+."""
    return "✅" if r == 1 else "🟩" if r <= 3 else "🟨" if r <= 6 else "🟥"


def fcode_key(f: str) -> list[int]:
    """Natural sort key for an F-code: F3.1.1 -> [3, 1, 1]."""
    return [int(x) for x in re.findall(r"\d+", f)]


def hbar(n: float, scale: float, width: int = 12) -> str:
    return "█" * max(0, round(n / scale * width)) if scale else ""


def scope_label(n: int) -> str:
    return "triage" if n >= 6 else "narrow" if n <= 2 else "mid"


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
    recov = [v["recovery"] for v in g["robustness"].values()]
    still = sum(1 for x in recov if x >= 0.5)
    return [
        "# Diagnostic questionnaire — analysis report",
        "",
        f"{len(rows)} faults · {DEPTH} questions deep",
        "",
        "```",
        f"Outcome      {at1} reach #1 · {in23} settle in top-3 · {out} stay out",
        f"Lock-in      {len(locks)}/{len(rows)} hold top-3 · "
        f"median {statistics.median(locks):g} · range {min(locks)}–{max(locks)} questions",
        f"Confusion    {fm['clean']} clean · {fm['sibling-only']} within-family · "
        f"{fm['cross-family']} cross-family",
        f"Robustness   1-in-5 answers random → median recovery "
        f"{statistics.median(recov)*100:.0f}% · {still}/{len(rows)} faults usually recover",
        "```",
    ]


def sec_trajectory(g: dict) -> list[str]:
    out = ["## Rank trajectory",
           "",
           "Each square = the true fault's rank after one question. "
           "✅ #1 · 🟩 #2–3 · 🟨 #4–6 · 🟥 #7+.",
           "",
           "```",
           f"{'fault':7s}{'lock':5s}trajectory →"]
    for r in sorted(g["rows"], key=lambda x: fcode_key(x["fault"])):
        lock = str(r["lock_in"]) if r["lock_in"] is not None else "—"
        cells = "".join(rank_cell(x) for x in r["ranks"])
        out.append(f"{r['fault']:7s}{lock:5s}{cells}")
    out.append("```")
    return out


def sec_family(g: dict) -> list[str]:
    rows = [r for r in g["rows"] if r["kind"] != "clean"]
    cross = [r for r in rows if r["kind"] == "cross-family"]
    sib = sorted((r for r in rows if r["kind"] == "sibling-only"),
                 key=lambda x: x["final_rank"], reverse=True)
    out = ["## Family confusion",
           "",
           "Faults a competing cause still outranks at the end. "
           "❌ = ended out of top-3 · ⚠️ = in top-3 but not #1.",
           ""]
    if cross:
        out.append("**Cross-family — a *different* component is winning (a triage gap):**")
        for r in sorted(cross, key=lambda x: -x["final_rank"]):
            icon = "❌" if r["final_rank"] > 3 else "⚠️"
            tail = f"  _(+ own family {', '.join(r['siblings'])})_" if r["siblings"] else ""
            out.append(f"- {icon} `{r['fault']}` #{r['final_rank']} ← "
                       f"**{', '.join(r['cross'])}**{tail}")
        out.append("")
    # within-family: listed lighter — just the fault + rank, no sibling ids
    out.append("_Within-family only (a missing discriminator inside one component):_")
    out.append("_" + " · ".join(
        f"{'❌' if r['final_rank'] > 3 else '⚠️'} {r['fault']} #{r['final_rank']}"
        for r in sib) + "_")
    return out


def sec_lockin(g: dict) -> list[str]:
    locks = [r["lock_in"] for r in g["rows"] if r["lock_in"] is not None]
    never = sum(1 for r in g["rows"] if r["lock_in"] is None)
    edges = [(1, 4), (5, 8), (9, 12), (13, 16), (17, DEPTH)]
    counts = [sum(1 for v in locks if lo <= v <= hi) for lo, hi in edges]
    scale = max([*counts, never, 1])
    out = ["## Lock-in speed",
           "",
           f"Questions needed to lock a fault into the top-3 and hold it. "
           f"median **{statistics.median(locks):g}** · mean **{statistics.fmean(locks):.1f}**.",
           "",
           "```"]
    for (lo, hi), n in zip(edges, counts):
        out.append(f"{f'{lo}–{hi}':>6} {hbar(n, scale)} {n}")
    out.append(f"{'never':>6} {hbar(never, scale)} {never}")
    out.append("```")
    return out


def sec_scorecard(g: dict) -> list[str]:
    qs = g["qstats"]
    n_runs = len(g["rows"])
    out = ["## Question scorecard",
           "",
           "Per question across the 29 runs. **work** = average rank-improvement it "
           "gives the true fault (+ = toward #1; the median is 0 for most, since "
           "rank rarely moves on a single step). **when** = median position. "
           "**scope** = component families its answers can move "
           "(triage ≥6 · mid 3–5 · narrow ≤2).",
           "",
           "```",
           f"{'q':5s}{'asked':18s}{'when':>5s}{'work':>6s}  scope"]
    order = sorted(qs.items(), key=lambda kv: -kv[1]["mean_work"])
    for qid, d in order:
        pct = d["asked"] / n_runs * 100
        asked = f"{pct:3.0f}% {hbar(d['asked'], n_runs, 9)}"
        out.append(f"{qid:5s}{asked:18s}{d['med_pos']:5.0f}{d['mean_work']:+6.1f}  "
                   f"{d['families']} {scope_label(d['families'])}")
    out.append("```")

    # which questions don't pull their weight, and why
    neg = sorted((q for q, d in qs.items() if d["mean_work"] < 0), key=lambda q: qs[q]["mean_work"])
    idle = sorted((q for q, d in qs.items() if 0 <= d["mean_work"] <= 0.05),
                  key=lambda q: qs[q]["med_pos"], reverse=True)
    out.append("")
    out.append("**Questions that don't pull their weight**")
    if neg:
        late = statistics.fmean(qs[q]["med_pos"] for q in neg)
        out.append(f"- _cost rank on average_ — {', '.join(neg)}: asked ~pos "
                   f"{late:.0f}, after the ranking has usually settled, so a stray "
                   "answer here mostly reshuffles ties the wrong way.")
    if idle:
        out.append(f"- _≈ no movement_ — {', '.join(idle)}: their answer rarely "
                   "separates the causes still live at that point (redundant with "
                   "earlier questions, or too narrow to matter).")

    # triage vs narrowing
    triage = sorted((q for q, d in qs.items() if d["families"] >= 6),
                    key=lambda q: qs[q]["med_pos"])
    narrow = sorted((q for q, d in qs.items() if d["families"] <= 2),
                    key=lambda q: qs[q]["med_pos"])
    out += ["",
            "**Triage vs narrowing**",
            f"- _broad (≥6 families), asked early_ — {', '.join(triage)}",
            f"- _narrow (≤2 families), asked late_ — {', '.join(narrow)}",
            "  The engine front-loads cross-family triage and saves "
            "single-family confirmers for last — exactly the intended funnel."]
    return out


def sec_robustness(g: dict) -> list[str]:
    rob = g["robustness"]
    recov = [v["recovery"] for v in rob.values()]
    out = ["## Robustness to answer errors",
           "",
           f"Each fault re-run **{NOISE_TRIALS}×** with **1 in 5** answers replaced "
           "by a random valid one (misclick / misread / misunderstood). "
           "**recovery** = share of noisy runs still ending in the top-3.",
           "",
           f"Overall median recovery **{statistics.median(recov)*100:.0f}%** · "
           f"mean **{statistics.fmean(recov)*100:.0f}%**.",
           "",
           "```",
           f"{'fault':7s}recovery        median-final"]
    for f in sorted(rob, key=lambda k: rob[k]["recovery"]):
        v = rob[f]
        bar = f"{v['recovery']*100:3.0f}% {hbar(v['recovery'], 1.0, 10)}"
        out.append(f"{f:7s}{bar:16s}#{v['median_final']:g}")
    out.append("```")
    out.append("")
    out.append("_The least-robust faults are the documented degeneracies "
               "(F7.3.2 / F4.4 / F7.4 / F2.5 / F5.8): with no unique fingerprint, a "
               "single wrong answer is enough to tip them behind a sibling._")
    return out


SECTIONS = [
    sec_headline, sec_trajectory, sec_family, sec_lockin, sec_scorecard, sec_robustness,
]


def render(g: dict) -> str:
    return "\n\n".join("\n".join(fn(g)) for fn in SECTIONS) + "\n"


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
                "median_position": d["med_pos"],
                "median_work": d["med_work"],
                "mean_work": round(d["mean_work"], 3),
                "families": d["families"],
            }
            for qid, d in g["qstats"].items()
        },
        "robustness": {f: v for f, v in g["robustness"].items()},
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
