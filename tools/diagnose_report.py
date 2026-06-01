"""Analysis report for the diagnostic questionnaire.

Where `test_diagnose.py` is a pass/fail *gate*, this is the *microscope*: it
runs the same per-fault simulations (shared `diagnose_sim` harness) but instead
of asserting, it characterises the engine's behaviour so you can see *why* the
numbers are what they are and where the questionnaire is weak.

Sections:
  1. Headline           — outcome / lock-in / confusion / robustness, at a glance.
  2. Rank trajectory    — per-fault row of rank cells (one per question asked,
                          ✅ #1 · 🟩 #2–3 · 🟨 #4–6 · 🟧 #7–9 · 🟥 #10+), with lock-in.
  3. Family confusion   — faults still outranked at the end; cross-family cases
                          (a different component winning) called out in full,
                          within-family ones listed lighter.
  4. Lock-in speed      — histogram (buckets of 4) of questions to lock & hold top-3.
  5. Question scorecard — behavioural: how often each question is asked, its median
                          position, and the rank-improvement (work) it delivered,
                          plus which questions don't pull their weight.
  6. Question character — structural: scope / force / rule-out / answer-shape of
                          each question, read straight from its effect weights.
  7. Robustness         — how well each fault survives 1-in-5 random answers.

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
    DEPTH, ENG, FAULTS, PARENT, build_key, question_profile,
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
            "lock_in": t.lock_in(DEFAULT_MAX), "parent_lock": t.parent_lock_in(parent),
            "ranks": t.ranks,
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

    for qid, d in qstats.items():
        d["med_pos"] = statistics.median(d["positions"])
        d["mean_work"] = statistics.fmean(d["deltas"])

    return {
        "rows": rows, "family_mix": family_mix, "qstats": qstats,
        "profile": question_profile(),
        "robustness": robustness_all(NOISE_TRIALS, NOISE_RATE, seed=0),
    }


# ----------------------------------------------------------------------------
# rendering helpers
# ----------------------------------------------------------------------------
def rank_cell(r: int) -> str:
    """A rank as one square: ✅ #1 · 🟩 #2–3 · 🟨 #4–6 · 🟧 #7–9 · 🟥 #10+."""
    return ("✅" if r == 1 else "🟩" if r <= 3 else "🟨" if r <= 6
            else "🟧" if r <= 9 else "🟥")


def work_cell(m: float) -> str:
    """A question's average work as one square: 🟩 strong · 🟨 helps · ⬜ idle · 🟥 hurts."""
    return "🟩" if m >= 1.0 else "🟨" if m >= 0.1 else "🟥" if m < -0.05 else "⬜"


def recov_cell(x: float) -> str:
    """Robustness as one square: 🟩 ≥80% · 🟨 ≥50% · 🟧 ≥30% · 🟥 worse."""
    return "🟩" if x >= 0.8 else "🟨" if x >= 0.5 else "🟧" if x >= 0.3 else "🟥"


def fcode_key(f: str) -> list[int]:
    """Natural sort key for an F-code: F3.1.1 -> [3, 1, 1]."""
    return [int(x) for x in re.findall(r"\d+", f)]


def hbar(n: float, scale: float, width: int = 12) -> str:
    return "█" * max(0, round(n / scale * width)) if scale else ""


def minibar(frac: float, width: int = 5) -> str:
    """Filled/empty proportion bar for scanning a 0..1 magnitude."""
    f = max(0, min(width, round(frac * width)))
    return "█" * f + "·" * (width - f)


def scope_label(n: int) -> str:
    return "triage" if n >= 6 else "narrow" if n <= 2 else "mid"


def force_label(m: float) -> str:
    return "hard" if m >= 1.5 else "firm" if m >= 0.9 else "nudge"


def ruleout_label(x: float) -> str:
    return "rules-out" if x >= 0.35 else "rules-in" if x <= 0.10 else "mixed"


def shape_label(x: float) -> str:
    return "decisive" if x >= 0.55 else "even" if x <= 0.40 else "graded"


# ----------------------------------------------------------------------------
# section renderers -> list[str] lines
# ----------------------------------------------------------------------------
def sec_headline(g: dict) -> list[str]:
    rows = g["rows"]
    n = len(rows)
    locks = [r["lock_in"] for r in rows if r["lock_in"] is not None]
    plocks = [r["parent_lock"] for r in rows if r["parent_lock"] is not None]
    at1 = sum(1 for r in rows if r["final_rank"] == 1)
    recov = [v["recovery"] for v in g["robustness"].values()]
    robust = sum(1 for x in recov if x >= 0.8)
    # one capability per line: what it does, the score, and how fast/well
    return [
        "# Diagnostic questionnaire — analysis report",
        "",
        f"{n} fault modes · {DEPTH} questions deep",
        "",
        "```",
        f"{'Finds the right component':28s}{len(plocks):>2}/{n}  "
        f"median {statistics.median(plocks):g} questions to lead & hold",
        f"{'Locks the sub-cause into top-3':28s}{len(locks):>2}/{n}  "
        f"median {statistics.median(locks):g}, range {min(locks)}–{max(locks)} "
        f"(3 documented misses)",
        f"{'Lands it at #1 outright':28s}{at1:>2}/{n}",
        f"{'Recovers from a wrong answer':28s}{robust:>2}/{n}  "
        f"≥80% of the time under 1-in-5 random answers (median {statistics.median(recov)*100:.0f}%)",
        "```",
    ]


def sec_trajectory(g: dict) -> list[str]:
    out = ["## Rank trajectory",
           "",
           "Each square = the true fault's rank after one *answered* question. "
           "✅ #1 · 🟩 #2–3 · 🟨 #4–6 · 🟧 #7–9 · 🟥 #10+. "
           "**fam** = questions until the right *component* leads (#1) and stays; "
           "**top3** = until the exact cause locks into the top-3.",
           "",
           "Rows vary in length: a run stops at 18 answers **or** when no remaining "
           "question still separates the contending causes (the engine's done "
           "signal) — whichever comes first. Skipped context/age questions, which "
           "this fault's profile doesn't answer, aren't plotted.",
           "",
           "```",
           f"{'fault':7s}{'fam':5s}{'top3':6s}trajectory →"]
    for r in sorted(g["rows"], key=lambda x: fcode_key(x["fault"])):
        fam = str(r["parent_lock"]) if r["parent_lock"] is not None else "—"
        top3 = str(r["lock_in"]) if r["lock_in"] is not None else "—"
        cells = "".join(rank_cell(x) for x in r["ranks"])
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
    if sib_in:
        out += ["",
                f"🟦 **Within-family, still top-3** — true cause at #2–3, a sibling "
                f"merely leads · {len(sib_in)}: {', '.join(r['fault'] for r in sib_in)}"]
    return out


def sec_lockin(g: dict) -> list[str]:
    locks = [r["lock_in"] for r in g["rows"] if r["lock_in"] is not None]
    never = sum(1 for r in g["rows"] if r["lock_in"] is None)
    edges = [(1, 4), (5, 8), (9, 12), (13, 16), (17, DEPTH)]
    counts = [sum(1 for v in locks if lo <= v <= hi) for lo, hi in edges]
    scale = max([*counts, never, 1])
    tiers = ["🟩", "🟨", "🟧", "🟥", "🟥"]  # fast → slow, one per bucket
    out = ["## Lock-in speed",
           "",
           f"Questions needed to lock a fault into the top-3 and hold it "
           f"(🟩 fast → 🟥 slow · ⬛ never). median **{statistics.median(locks):g}** · "
           f"mean **{statistics.fmean(locks):.1f}**.",
           "",
           "```"]
    for tier, (lo, hi), n in zip(tiers, edges, counts):
        out.append(f"{tier} {f'{lo}–{hi}':>6} {hbar(n, scale)} {n}")
    out.append(f"⬛ {'never':>6} {hbar(never, scale)} {never}")
    out.append("```")
    return out


def sec_scorecard(g: dict) -> list[str]:
    """Behavioural: what each question *did* across the simulated runs."""
    qs = g["qstats"]
    n_runs = len(g["rows"])
    out = ["## Question scorecard",
           "",
           "What each question *did* across the 29 runs. **work** = average "
           "rank-improvement it gives the true fault (+ = toward #1; the median is 0 "
           "for most, since rank rarely moves on a single step) — "
           "🟩 ≥1.0 strong · 🟨 ≥0.1 helps · ⬜ idle · 🟥 hurts. **when** = median "
           "position. _Caveat: Q1 always goes first, so its work also credits "
           "unwinding the no-answer prior (an a-priori-unlikely fault jumps a long "
           "way on Q1); read early-position work as partly triage, not pure "
           "discrimination._",
           "",
           "```",
           f"   {'q':5s}{'asked':18s}{'when':>5s}{'work':>6s}"]
    for qid, d in sorted(qs.items(), key=lambda kv: -kv[1]["mean_work"]):
        pct = d["asked"] / n_runs * 100
        asked = f"{pct:3.0f}% {hbar(d['asked'], n_runs, 9)}"
        out.append(f"{work_cell(d['mean_work'])} {qid:5s}{asked:18s}"
                   f"{d['med_pos']:5.0f}{d['mean_work']:+6.1f}")
    out.append("```")

    # thresholds match work_cell exactly: 🟥 hurts (< -0.05), ⬜ idle ([-0.05, 0.1))
    neg = sorted((q for q, d in qs.items() if d["mean_work"] < -0.05),
                 key=lambda q: qs[q]["mean_work"])
    idle = sorted((q for q, d in qs.items() if -0.05 <= d["mean_work"] < 0.1),
                  key=lambda q: qs[q]["med_pos"], reverse=True)
    out.append("")
    out.append("**Questions that don't pull their weight**")
    if neg:
        late = statistics.fmean(qs[q]["med_pos"] for q in neg)
        out.append(f"- 🟥 _cost rank on average_ — {', '.join(neg)}: asked ~pos "
                   f"{late:.0f}, after the ranking has usually settled, so a stray "
                   "answer here mostly reshuffles ties the wrong way.")
    if idle:
        out.append(f"- ⬜ _≈ no movement_ — {', '.join(idle)}: their answer rarely "
                   "separates the causes still live at that point (redundant with "
                   "earlier questions, or too narrow to matter).")
    return out


def sec_character(g: dict) -> list[str]:
    """Structural: what each question *is*, from its effect weights — several
    independent axes, of which triage-vs-narrow is only one."""
    prof = g["profile"]
    pos = {q: d["med_pos"] for q, d in g["qstats"].items()}
    out = ["## Question character",
           "",
           "A structural read of each question from its effect weights (no "
           "simulation). **scope** = families it can move · **force** = strongest "
           "single push (hard ≥1.5 · firm ≥0.9 · nudge else) · **rule-out** = share "
           "of evidence that *subtracts* to exonerate a cause vs only adds · "
           "**shape** = how its weight spreads across answers (decisive = one loud "
           "answer · even = graded across all).",
           "",
           "Bars scale each axis for scanning (more filled = broader / harder / "
           "more rule-out / more decisive).",
           "",
           "```",
           f"{'q':5s}{'scope':>9s} {'force':>10s} {'rule-out':>10s} {'shape':>11s}"]
    for qid, p in sorted(prof.items(), key=lambda kv: (-kv[1]["families"], -kv[1]["max_push"])):
        scope = f"{minibar(p['families'] / 9)} {p['families']}"
        force = f"{minibar(p['max_push'] / 1.6)} {force_label(p['max_push'])}"
        rout = f"{minibar(p['ruleout'] / 0.5)} {p['ruleout']*100:.0f}%"
        shape = f"{minibar((p['top_share'] - 0.3) / 0.55)} {shape_label(p['top_share'])}"
        out.append(f"{qid:5s}{scope:>9s} {force:>10s} {rout:>10s} {shape:>11s}")
    out.append("```")

    def names(pred, by=None, rev=False, cap=8):
        sel = [q for q, p in prof.items() if pred(p)]
        sel.sort(key=(by or (lambda q: q)), reverse=rev)
        return ", ".join(sel[:cap]) + (" …" if len(sel) > cap else "")

    out += ["",
            "Several independent axes — examples, not an exhaustive taxonomy:",
            f"- **scope** — triage across families (≥6): {names(lambda p: p['families'] >= 6, lambda q: pos.get(q, 99))}; "
            f"narrows within one (≤2): {names(lambda p: p['families'] <= 2, lambda q: pos.get(q, 99))}",
            f"- **force** — pushes hard (±1.5+): {names(lambda p: p['max_push'] >= 1.5)}; "
            f"only nudges (≤±0.6): {names(lambda p: p['max_push'] <= 0.6)}",
            f"- **direction** — pure rule-in / only adds: {names(lambda p: p['ruleout'] <= 0.05)}; "
            f"also punishes / rules-out (≥35%): {names(lambda p: p['ruleout'] >= 0.35, lambda q: prof[q]['ruleout'], rev=True)}",
            f"- **shape** — decisive, one loud answer (≥55%): {names(lambda p: p['top_share'] >= 0.55, lambda q: prof[q]['top_share'], rev=True)}; "
            f"even / graded across answers (≤40%): {names(lambda p: p['top_share'] <= 0.40)}",
            "",
            "Triage questions sit early in the funnel and the single-family "
            "confirmers come last — the intended broad-to-narrow shape.",
            "",
            "_Note: scope/force/shape describe a question's **potential**; the "
            "scorecard's `work` is what it **actually** delivered in the sims. A "
            "high-force question that lands late (e.g. Q15, Q16, Q20) shows little "
            "work simply because the ranking has usually settled before it._"]
    return out


def sec_robustness(g: dict) -> list[str]:
    rob = g["robustness"]
    clean = {r["fault"]: r for r in g["rows"]}
    recov = [v["recovery"] for v in rob.values()]
    strong = sum(1 for x in recov if x >= 0.8)
    out = ["## Robustness to answer errors",
           "",
           f"Each fault re-run **{NOISE_TRIALS}×** with **1 in 5** answers replaced by a "
           "random valid one (misclick / misread), compared to its clean run. "
           "**top-3 / #1** = share of noisy runs ending there · **lock** = median "
           "questions to lock & hold the top-3, clean → noisy (how much errors slow "
           "convergence; `·` = locks in under half the noisy runs).",
           "",
           f"**{strong}/{len(rob)}** faults still recover to the top-3 ≥80% of the time "
           f"(median recovery {statistics.median(recov)*100:.0f}%). "
           "🟩 ≥80% · 🟨 ≥50% · 🟧 ≥30% · 🟥 worse.",
           "",
           "```",
           f"  {'fault':7s}{'top-3':>6}{'#1':>5}   {'lock clean→noisy':17s}"]
    for f in sorted(rob, key=lambda k: rob[k]["recovery"]):
        v = rob[f]
        cl = clean[f]["lock_in"]
        nz = round(v["med_lockin"]) if v["med_lockin"] is not None else None
        cl_s = str(cl) if cl is not None else "—"
        nz_s = str(nz) if v["lock_rate"] >= 0.5 and nz is not None else "·"
        lock = f"{cl_s} → {nz_s}"
        if cl is not None and v["lock_rate"] >= 0.5 and nz is not None:
            lock += f"  ({nz - cl:+d})"
        out.append(f"{recov_cell(v['recovery'])} {f:7s}"
                   f"{v['recovery']*100:5.0f}%{v['at1']*100:4.0f}%   {lock}")
    out.append("```")
    out.append("")
    out.append("_The least-robust faults are the documented degeneracies "
               "(F7.3.2 / F4.4 / F7.4 / F2.5 / F5.8): with no unique fingerprint a "
               "single wrong answer tips them behind a sibling — they barely lock even "
               "clean, and rarely re-lock under noise. The robust faults (🟩) keep "
               "locking at close to their clean speed._")
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
