from __future__ import annotations

import json
import re
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


def fcode_key(f: str) -> list[int]:
    return [int(x) for x in re.findall(r"\d+", f)]


def hbar(n: float, scale: float, width: int = 12) -> str:
    return "█" * max(0, round(n / scale * width)) if scale else ""


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


def sec_trajectory(g: dict) -> list[str]:
    out = ["## Rank trajectory",
           "",
           "One square per question asked — the true fault's rank after that "
           "answer: ✅ #1 · 🟩 #2–3 · 🟨 #4–5 · 🟧 #6–7 · 🟥 #8+ · ⬜ skip (rank "
           "unchanged). **fam** / **top3** = answered questions until the right "
           "*component* leads and holds / the exact cause locks into the top-3. A "
           "run stops at 18 answers, or earlier when no question still separates "
           "the leaders.",
           "",
           "```",
           f"{'fault':7s}{'fam':5s}{'top3':6s}trajectory →"]
    for r in sorted(g["rows"], key=lambda x: fcode_key(x["fault"])):
        fam = str(r["parent_lock"]) if r["parent_lock"] is not None else "—"
        top3 = str(r["lock_in"]) if r["lock_in"] is not None else "—"
        cells = "".join("⬜" if rank is None else rank_cell(rank)
                        for _, rank in r["events"])
        out.append(f"{r['fault']:7s}{fam:5s}{top3:6s}{cells}")
    out.append("```")
    return out


def sec_family(g: dict) -> list[str]:
    rows = [r for r in g["rows"] if r["kind"] != "clean"]
    cross = sorted((r for r in rows if r["kind"] == "cross-family"), key=lambda x: -x["final_rank"])
    sib = [r for r in rows if r["kind"] == "sibling-only"]
    sib_out = sorted((r for r in sib if r["final_rank"] > 3), key=lambda x: -x["final_rank"])
    sib_in = sorted((r for r in sib if r["final_rank"] <= 3), key=lambda x: fcode_key(x["fault"]))
    miss = len(cross) + len(sib_out)
    out = ["## Family confusion",
           "",
           f"Only the **{miss}** faults that miss the top-3 need attention; the other "
           f"{len(sib_in)} reach the top-3 with the true cause at #2–3. "
           "(`#n` = where the true fault ends · `←` = who outranks it.)",
           ""]
    if cross:
        out += ["🟥 **Cross-family** — a *different* component wins (triage gap):", "```"]
        for r in cross:
            extra = f"   (+ sibling {', '.join(r['siblings'])})" if r["siblings"] else ""
            out.append(f"{r['fault']:7s} #{r['final_rank']}  ←  {', '.join(r['cross'])}{extra}")
        out.append("```")
    if sib_out:
        out += ["",
                "🟧 **Within-family, out of top-3** — right component, but siblings "
                "mask the exact sub-cause:", "```"]
        for r in sib_out:
            out.append(f"{r['fault']:7s} #{r['final_rank']}  ←  {', '.join(r['siblings'])}")
        out.append("```")
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
           f"median **{statistics.median(locks):g}** · "
           f"mean **{statistics.fmean(locks):.1f}**.",
           "",
           "```"]
    for (lo, hi), n in zip(edges, counts):
        out.append(f"{f'{lo:02d}–{hi:02d}':>5} {hbar(n, scale)} {n}")
    out.append(f"{'never':>5} {hbar(never, scale)} {never}")
    out.append("```")
    return out


def sec_scorecard(g: dict) -> list[str]:
    qs = g["qstats"]
    n_runs = len(g["rows"])
    out = ["## Question scorecard",
           "",
           f"What each question *did* across the {n_runs} runs. **work** = mean "
           "rank gain for the true fault (🟩 ≥1.0 · 🟨 ≥0.1 · ⬜ idle · 🟥 hurts) · "
           "**when** = median position asked. _Q1 always leads, so its work partly "
           "credits unwinding the cold-start prior, not pure discrimination._",
           "",
           "```",
           f"   {'q':5s}{'asked':18s}{'when':>5s}{'work':>6s}"]
    for qid, d in sorted(qs.items(), key=lambda kv: -kv[1]["mean_work"]):
        pct = d["asked"] / n_runs * 100
        asked = f"{pct:3.0f}% {hbar(d['asked'], n_runs, 9)}"
        out.append(f"{work_cell(d['mean_work'])} {qid:5s}{asked:18s}"
                   f"{d['med_pos']:5.0f}{d['mean_work']:+6.1f}")
    out.append("```")

    # thresholds must match work_cell
    neg = sorted((q for q, d in qs.items() if d["mean_work"] < -0.05),
                 key=lambda q: qs[q]["mean_work"])
    idle = sorted((q for q, d in qs.items() if -0.05 <= d["mean_work"] < 0.1),
                  key=lambda q: qs[q]["med_pos"], reverse=True)
    out.append("")
    parts = []
    if neg:
        late = statistics.fmean(qs[q]["med_pos"] for q in neg)
        parts.append(f"🟥 _cost rank_ (land ~pos {late:.0f}, after the ranking has "
                     f"settled): {', '.join(neg)}")
    if idle:
        parts.append(f"⬜ _≈ idle_ (redundant or too narrow): {', '.join(idle)}")
    if parts:
        out.append("**Low-yield questions** — " + " · ".join(parts) + ".")
    return out


def sec_character(g: dict) -> list[str]:
    prof = g["profile"]
    pos = {q: d["med_pos"] for q, d in g["qstats"].items()}
    out = ["## Question character",
           "",
           "A structural read from each question's effect weights (no simulation). "
           "**scope** = families it can move · **force** = strongest single push "
           "(hard ≥1.5 · firm ≥0.9 · else nudge) · **rule-out** = share of weight "
           "that *subtracts* to exonerate a cause · **shape** = how the weight "
           "spreads across answers (decisive = one loud answer · even = graded). "
           "Sorted broad-to-narrow.",
           "",
           "```",
           f"{'q':6s}{'scope':12s}{'force':8s}{'rule-out':10s}shape"]
    for qid, p in sorted(prof.items(), key=lambda kv: (-kv[1]["families"], -kv[1]["max_push"])):
        scope = f"{p['families']:>2}  {scope_label(p['families'])}"
        rout = f"{p['ruleout']*100:.0f}%"
        out.append(f"{qid:6s}{scope:12s}{force_label(p['max_push']):8s}"
                   f"{rout:10s}{shape_label(p['top_share'])}")
    out.append("```")

    def names(pred, by=None, cap=6):
        sel = [q for q, p in prof.items() if pred(p)]
        sel.sort(key=(by or (lambda q: q)))
        return ", ".join(sel[:cap]) + (" …" if len(sel) > cap else "")

    pos_of = lambda q: pos.get(q, 99)
    out += ["",
            f"High-scope questions triage across families and sit early in the "
            f"funnel ({names(lambda p: p['families'] >= 6, pos_of)}); low-scope "
            f"confirmers settle a single family and land last "
            f"({names(lambda p: p['families'] <= 2, pos_of)}) — the intended "
            "broad-to-narrow shape.",
            "",
            "_scope/force/shape are a question's **potential**; the scorecard's "
            "`work` is what it **delivered**. A high-force question that lands late "
            "(Q15, Q16, Q20) shows little work because the ranking has usually "
            "settled before it._"]
    return out


def sec_robustness(g: dict) -> list[str]:
    rob = g["robustness"]
    clean = {r["fault"]: r for r in g["rows"]}
    recov = [v["recovery"] for v in rob.values()]
    strong = sum(1 for x in recov if x >= 0.8)
    order = sorted(rob, key=lambda k: rob[k]["recovery"])

    def noise_ranks(f: str) -> list[int]:
        return [round(x) for x in rob[f]["median_ranks"]]

    def diverges(f: str) -> bool:
        cr, nr = clean[f]["ranks"], noise_ranks(f)
        m = min(len(cr), len(nr))
        return any(rank_cell(cr[i]) != rank_cell(nr[i]) for i in range(m))

    out = ["## Robustness to answer errors",
           "",
           f"Each fault re-run {NOISE_TRIALS}× with **1 answer in 5 wrong or "
           "mis-skipped**. This is the noise view of §Rank trajectory: *recover* = "
           "trials still ending in the top-3, *#1* = trials ending at #1, *lock* = "
           "questions to lock the top-3 (clean → noisy median; · = never under "
           "noise).",
           "",
           f"**{strong}/{len(rob)}** faults stay top-3 ≥80% of the time "
           f"(median {statistics.median(recov)*100:.0f}%). Worst-first:",
           "",
           "```",
           f"{'fault':8s}{'recover':>8s}{'#1':>6s}   lock"]
    for f in order:
        v = rob[f]
        cl = clean[f]["lock_in"]
        nz = round(v["med_lockin"]) if v["med_lockin"] is not None else None
        cl_s = str(cl) if cl is not None else "—"
        nz_s = str(nz) if v["lock_rate"] >= 0.5 and nz is not None else "·"
        out.append(f"{f:8s}{v['recovery']*100:7.0f}%{v['at1']*100:5.0f}%   "
                   f"{cl_s} → {nz_s}")
    out.append("```")

    shifted = [f for f in order if diverges(f)]
    steady = [f for f in order if not diverges(f)]
    if shifted:
        out += ["",
                "**Where the errors bite** — noise median rank vs the clean path, "
                "for the faults whose path actually shifts (rank scale as above):",
                "",
                "```"]
        for f in shifted:
            out.append(f"{f:7s} clean " + "".join(rank_cell(x) for x in clean[f]["ranks"]))
            out.append(f"{'':7s} noise " + "".join(rank_cell(x) for x in noise_ranks(f)))
        out.append("```")
    if steady:
        out += ["",
                f"_The remaining {len(steady)} track their clean path under noise: "
                f"{', '.join(sorted(steady, key=fcode_key))}._"]
    out += ["",
            f"_The hardest cases ({', '.join(order[:4])}) most often end outside "
            "the top-3 — one wrong answer is enough to keep them behind a sibling; "
            "the rest re-converge._"]
    return out


SECTIONS = [
    sec_headline, sec_trajectory, sec_family, sec_lockin, sec_scorecard,
    sec_character, sec_robustness,
]


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
