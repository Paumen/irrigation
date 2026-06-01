from __future__ import annotations

import json
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from diagnose_sim import (
    DEPTH, ENG, FAULTS, PARENT, build_key, question_profile,
    robustness_all, simulate_all,
)

DEFAULT_MAX = 3
NOISE_RATE = 0.2
NOISE_TRIALS = 50


def final_confusers(fault: str) -> list[str]:
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
            "lock_in": t.lock_in(DEFAULT_MAX), "parent_lock": t.parent_lock_in(parent),
            "ranks": t.ranks, "events": t.events,
            "confusers": confusers, "siblings": siblings, "cross": cross, "kind": kind,
        })

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

    for qid, d in qstats.items():
        d["med_pos"] = statistics.median(d["positions"])
        d["mean_work"] = statistics.fmean(d["deltas"])

    return {
        "rows": rows, "family_mix": family_mix, "qstats": qstats,
        "profile": question_profile(),
        "robustness": robustness_all(NOISE_TRIALS, NOISE_RATE, seed=0),
    }


def rank_cell(r: int) -> str:
    return ("✅" if r == 1 else "🟩" if r <= 3 else "🟨" if r <= 5
            else "🟧" if r <= 7 else "🟥")


def work_cell(m: float) -> str:
    return "🟩" if m >= 1.0 else "🟨" if m >= 0.1 else "🟥" if m < -0.05 else "⬜"


def scope_label(n: int) -> str:
    return "triage" if n >= 6 else "narrow" if n <= 2 else "mid"


def force_label(m: float) -> str:
    return "hard" if m >= 1.5 else "firm" if m >= 0.9 else "nudge"


def shape_label(x: float) -> str:
    return "decisive" if x >= 0.55 else "even" if x <= 0.40 else "graded"


def sec_headline(g: dict) -> list[str]:
    rows = g["rows"]
    n = len(rows)
    locks = [r["lock_in"] for r in rows if r["lock_in"] is not None]
    plocks = [r["parent_lock"] for r in rows if r["parent_lock"] is not None]
    at1 = sum(1 for r in rows if r["final_rank"] == 1)
    recov = [v["recovery"] for v in g["robustness"].values()]
    robust = sum(1 for x in recov if x >= 0.8)
    return [
        "# Diagnostic questionnaire — analysis report",
        "",
        f"{n} fault modes · {DEPTH} questions deep",
        "",
        "```",
        f"{'Right component leads & holds':31s}{len(plocks):>2}/{n}   "
        f"median {statistics.median(plocks):g} q",
        f"{'Sub-cause into top-3':31s}{len(locks):>2}/{n}   "
        f"median {statistics.median(locks):g} q (range {min(locks)}–{max(locks)}, 3 known misses)",
        f"{'Lands at #1 outright':31s}{at1:>2}/{n}",
        f"{'Survives 1-in-5 user errors':31s}{robust:>2}/{n}   "
        f"stays top-3 ≥80% of trials (median {statistics.median(recov)*100:.0f}%)",
        "```",
    ]


def sec_faults(g: dict) -> list[str]:
    rows = {r["fault"]: r for r in g["rows"]}
    rob = g["robustness"]
    locks = [r["lock_in"] for r in g["rows"] if r["lock_in"] is not None]
    order = sorted(rows, key=lambda f: (rob[f]["recovery"], -rows[f]["final_rank"]))

    out = ["## Per-fault convergence",
           "",
           "One row per fault. **ends** = clean final rank · **lock** = questions to "
           "lock the top-3 and hold (— = never) · **top-3 / #1** = share of 50 noisy "
           f"runs (1-in-5 answers wrong/skipped) ending top-3 / at #1 · **confused "
           "by** = who outranks the true cause (⚠ = a different component, a triage "
           "gap). Worst-first.",
           "",
           "```",
           f"{'fault':8s}{'ends':>5s}{'lock':>6s}{'top-3':>7s}{'#1':>6s}   confused by"]
    for f in order:
        r, v = rows[f], rob[f]
        lock = str(r["lock_in"]) if r["lock_in"] is not None else "—"
        note = ", ".join(r["confusers"][:3]) + (" …" if len(r["confusers"]) > 3 else "")
        if r["cross"]:
            note += "  ⚠"
        out.append((f"{f:8s}{'#'+str(r['final_rank']):>5s}{lock:>6s}"
                    f"{v['recovery']*100:6.0f}%{v['at1']*100:5.0f}%   {note}").rstrip())
    out.append("```")

    within8 = sum(1 for v in locks if v <= 8)
    slow = sum(1 for v in locks if v >= 13)
    out += ["",
            f"Lock-in: median **{statistics.median(locks):g}**, mean "
            f"**{statistics.fmean(locks):.1f}** questions — {within8}/{len(g['rows'])} "
            f"within 8, {slow} need 13+."]

    fragile = [f for f in order if rob[f]["recovery"] < 0.65]
    if fragile:
        out += ["",
                "**Fragile faults** (recover < 65%) — clean path vs the noise median, "
                "one square per answered question (✅ #1 · 🟩 #2–3 · 🟨 #4–5 · "
                "🟧 #6–7 · 🟥 #8+):",
                "",
                "```"]
        for f in fragile:
            noise = [round(x) for x in rob[f]["median_ranks"]]
            out.append(f"{f:7s} clean " + "".join(rank_cell(x) for x in rows[f]["ranks"]))
            out.append(f"{'':7s} noise " + "".join(rank_cell(x) for x in noise))
        out.append("```")
    return out


def sec_questions(g: dict) -> list[str]:
    qs = g["qstats"]
    prof = g["profile"]
    n_runs = len(g["rows"])
    out = ["## Per-question value",
           "",
           "What each question delivered, next to its structural potential. "
           "**work** = mean rank gain for the true fault (🟩 ≥1.0 · 🟨 ≥0.1 · ⬜ idle "
           "· 🟥 hurts) · **when** = median position · **asked** = % of runs · "
           "**scope** = families it can move · **force** = strongest push · "
           "**rule** = weight spent exonerating · **shape** = decisive (one loud "
           "answer) vs even. Sorted by work.",
           "",
           "```",
           f"   {'q':5s}{'work':>5s}{'when':>5s}{'asked':>7s}   "
           f"{'scope':10s}{'force':7s}{'rule':6s}shape"]
    for qid, d in sorted(qs.items(), key=lambda kv: -kv[1]["mean_work"]):
        p = prof[qid]
        scope = f"{p['families']:>2} {scope_label(p['families'])}"
        rule = f"{p['ruleout']*100:.0f}%"
        out.append(f"{work_cell(d['mean_work'])} {qid:5s}{d['mean_work']:+5.1f}"
                   f"{d['med_pos']:5.0f}{d['asked']/n_runs*100:6.0f}%   "
                   f"{scope:10s}{force_label(p['max_push']):7s}{rule:6s}"
                   f"{shape_label(p['top_share'])}")
    out.append("```")

    neg = sorted((q for q, d in qs.items() if d["mean_work"] < -0.05),
                 key=lambda q: qs[q]["mean_work"])
    idle = sorted((q for q, d in qs.items() if -0.05 <= d["mean_work"] < 0.1),
                  key=lambda q: qs[q]["med_pos"], reverse=True)
    parts = []
    if neg:
        parts.append(f"🟥 _cost rank_: {', '.join(neg)}")
    if idle:
        parts.append(f"⬜ _idle_: {', '.join(idle)}")
    out.append("")
    if parts:
        out.append("**Low-yield** (asked late, after the ranking has settled) — "
                   + " · ".join(parts) + ".")
    out.append("")
    out.append("_scope/force/shape are **potential**; `work` is what landed. "
               "High-force questions that arrive late (Q15, Q16, Q20) show little "
               "work because the ranking has usually settled by then._")
    return out


SECTIONS = [sec_headline, sec_faults, sec_questions]


def render(g: dict) -> str:
    return "\n\n".join("\n".join(fn(g)) for fn in SECTIONS) + "\n"


def as_json(g: dict) -> str:
    payload = {
        "depth": DEPTH,
        "family_mix": g["family_mix"],
        "faults": [dict(r) for r in g["rows"]],
        "questions": {
            qid: {
                "asked": d["asked"],
                "median_position": d["med_pos"],
                "mean_work": round(d["mean_work"], 3),
                **{k: round(v, 3) if isinstance(v, float) else v
                   for k, v in g["profile"][qid].items()},
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
