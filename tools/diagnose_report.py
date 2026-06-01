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
            d = qstats.setdefault(s.qid, {"asked": 0, "positions": [], "deltas": [],
                                         "fault_deltas": []})
            d["asked"] += 1
            d["positions"].append(s.i)
            d["deltas"].append(prev - s.rank)
            # (fault, rank-gain, rank before this answer) — lets the report name
            # who a question helps/hurts and whether it fired after settling.
            d["fault_deltas"].append((f, prev - s.rank, prev))
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


def sec_health(g: dict) -> list[str]:
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
        f"{n} fault modes · {DEPTH} questions · raw numbers in `--json`, gate in "
        "`test_diagnose.py`.",
        "",
        "```",
        f"component leads & holds   {len(plocks):>2}/{n}   median "
        f"{statistics.median(plocks):g} q",
        f"sub-cause into top-3      {len(locks):>2}/{n}   median "
        f"{statistics.median(locks):g} q, slowest {max(locks)}",
        f"lands at #1               {at1:>2}/{n}",
        f"survives 1-in-5 errors    {robust:>2}/{n}   median "
        f"{statistics.median(recov)*100:.0f}% stay top-3",
        "```",
    ]


def sec_convergence(g: dict) -> list[str]:
    rows = {r["fault"]: r for r in g["rows"]}
    rob = g["robustness"]
    order = sorted(rows, key=lambda f: (rob[f]["recovery"], rows[f]["lock_in"] or 99))
    out = ["## Convergence",
           "",
           "Rank of the true cause after each answered question — "
           "🟥 #8+ 🟧 #6–7 🟨 #4–5 🟩 #2–3 ✅ #1. **fam/top3** = questions to lock the "
           "component / exact cause · **noise** = % still top-3 under 1-in-5 errors · "
           "**vs** = who else leads (⚠ = a different component). Worst-first.",
           "",
           "```",
           f"{'fault':7s}{'fam':4s}{'top3':5s}{'noise':6s}{'vs':9s}→ converges"]
    for f in order:
        r, v = rows[f], rob[f]
        fam = str(r["parent_lock"]) if r["parent_lock"] is not None else "—"
        top3 = str(r["lock_in"]) if r["lock_in"] is not None else "—"
        vs = ("⚠ " + r["cross"][0]) if r["cross"] else (r["confusers"][0] if r["confusers"] else "")
        traj = "".join(rank_cell(x) for x in r["ranks"])
        out.append(f"{f:7s}{fam:4s}{top3:5s}{v['recovery']*100:>4.0f}%  {vs:9s}{traj}")
    out.append("```")
    return out


def sec_questions(g: dict) -> list[str]:
    qs = g["qstats"]
    n = len(g["rows"])

    def work(q):
        return qs[q]["mean_work"]

    def swing(q):
        ds = [d for _, d, _ in qs[q]["fault_deltas"]]
        return max(ds), min(ds)

    tag = {}
    for q in qs:
        w, pos, asked = work(q), qs[q]["med_pos"], qs[q]["asked"] / n
        hi, lo = swing(q)
        if w >= 1.0 and asked >= 0.5:
            tag[q] = "carry"
        elif asked >= 0.5 and pos <= 6 and w < 0.1 and hi >= 2 and lo <= -2:
            tag[q] = "edged"          # broad: helps one fault, hurts another
        elif w < -0.05:
            tag[q] = "late"           # net-negative only because asked after settle
        elif -0.05 <= w < 0.1:
            tag[q] = "idle"

    maxw = max(work(q) for q in qs)
    out = ["## Questions",
           "",
           "**work** = mean rank-gain it earns the true cause (bar). "
           "**carry** = does the triage · **edged** = helps one fault, hurts another "
           "· **late** = fires after the ranking settled · **idle** = rarely "
           "decisive.",
           "",
           "```",
           f"{'q':6s}{'work':>5s} {'':12s} {'ask':>4s}  tag"]
    for q, d in sorted(qs.items(), key=lambda kv: -kv[1]["mean_work"]):
        bar = "█" * round(max(0.0, d["mean_work"]) / maxw * 12)
        out.append((f"{q:6s}{d['mean_work']:+5.1f} {bar:12s} {d['asked']/n*100:>3.0f}%"
                    f"  {tag.get(q, '')}").rstrip())
    out.append("```")

    edged = [q for q in qs if tag.get(q) == "edged"]
    if edged:
        bits = []
        for q in edged:
            fd = qs[q]["fault_deltas"]
            up = max(fd, key=lambda x: x[1])
            dn = min(fd, key=lambda x: x[1])
            bits.append(f"{q} helps {up[0]} {up[1]:+d}, hurts {dn[0]} {dn[1]:+d}")
        out += ["", "_edged: " + "; ".join(bits) + " — isolate its weights if retuned._"]
    return out


SECTIONS = [sec_health, sec_convergence, sec_questions]


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
