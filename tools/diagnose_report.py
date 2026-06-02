from __future__ import annotations

import json
import re
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from diagnose_sim import (
    DEPTH, ENG, FAULTS, LABEL, PARENT, build_key, question_profile,
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
            "final_top3": t.steps[-1].top3 if t.steps else [],
            "lock_in": t.lock_in(DEFAULT_MAX), "parent_lock": t.parent_lock_in(parent),
            "ranks": t.ranks, "events": t.events,
            "confusers": confusers, "siblings": siblings, "cross": cross, "kind": kind,
        })

    qstats: dict[str, dict] = {}
    for f in FAULTS:
        t = trajs[f]
        prev = t.base_rank
        for s in t.steps:
            d = qstats.setdefault(s.question_id, {"asked": 0, "positions": [], "deltas": []})
            d["asked"] += 1
            d["positions"].append(s.i)
            d["deltas"].append(prev - s.rank)
            prev = s.rank

    for question_id, d in qstats.items():
        d["med_pos"] = statistics.median(d["positions"])
        d["mean_work"] = statistics.fmean(d["deltas"])

    return {
        "rows": rows, "family_mix": family_mix, "qstats": qstats,
        "profile": question_profile(),
        "robustness": robustness_all(NOISE_TRIALS, NOISE_RATE, seed=0),
    }


RANK_LEGEND = "✅ #1 · 🟩 #2–3 · 🟨 #4–5 · 🟧 #6–7 · 🟥 #8+"


def rank_cell(r: int) -> str:
    return ("✅" if r == 1 else "🟩" if r <= 3 else "🟨" if r <= 5
            else "🟧" if r <= 7 else "🟥")


def short_label(f: str) -> str:
    return LABEL.get(f, f).split("(")[0].strip()


def work_cell(m: float) -> str:
    return "🟩" if m >= 1.0 else "🟨" if m >= 0.1 else "🟥" if m < -0.05 else "⬜"


def recovery_cell(x: float) -> str:
    return "🟢" if x >= 0.8 else "🟡" if x >= 0.5 else "🟠" if x >= 0.3 else "🔴"


def fcode_key(f: str) -> list[int]:
    return [int(x) for x in re.findall(r"\d+", f)]


def hbar(n: float, scale: float, width: int = 12) -> str:
    return "█" * max(0, round(n / scale * width)) if scale else ""


def minibar(frac: float, width: int = 5) -> str:
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


def _headline_stats(g: dict) -> dict:
    rows = g["rows"]
    locks = [r["lock_in"] for r in rows if r["lock_in"] is not None]
    plocks = [r["parent_lock"] for r in rows if r["parent_lock"] is not None]
    recovery = [v["recovery"] for v in g["robustness"].values()]
    return {
        "n": len(rows),
        "locks": locks, "plocks": plocks, "recovery": recovery,
        "at1": sum(1 for r in rows if r["final_rank"] == 1),
        "robust": sum(1 for x in recovery if x >= 0.8),
    }


def sec_dashboard(g: dict) -> list[str]:
    s = _headline_stats(g)
    n = s["n"]
    out = [
        "# Diagnostic questionnaire — analysis report",
        "",
        f"*{n} fault modes · {DEPTH} questions deep.* How reliably the engine walks "
        "to the true failure mode, and where it struggles.",
        "",
        "| | Score | |",
        "|---|:--:|---|",
        f"| 🧭 Finds the right component | **{len(s['plocks'])}/{n}** | "
        f"median {statistics.median(s['plocks']):g} questions to lead & hold |",
        f"| 🎯 Locks the specific failure mode into top-3 | **{len(s['locks'])}/{n}** | "
        f"median {statistics.median(s['locks']):g}, range {min(s['locks'])}–{max(s['locks'])} |",
        f"| 🥇 Lands it at #1 outright | **{s['at1']}/{n}** | |",
        f"| 🛡️ Survives a 1-in-5 user error | **{s['robust']}/{n}** | "
        f"stays top-3 in ≥80% of noisy runs (median {statistics.median(s['recovery'])*100:.0f}%) |",
    ]

    # lock-in distribution
    locks = s["locks"]
    never = sum(1 for r in g["rows"] if r["lock_in"] is None)
    edges = [(1, 4), (5, 8), (9, 12), (13, 16), (17, DEPTH)]
    counts = [sum(1 for v in locks if lo <= v <= hi) for lo, hi in edges]
    scale = max([*counts, never, 1])
    out += [
        "",
        f"**Questions to lock a fault into the top-3** — median "
        f"**{statistics.median(locks):g}** · mean **{statistics.fmean(locks):.1f}**",
        "",
        "| Questions | Faults | |",
        "|:--:|:--:|---|",
    ]
    for (lo, hi), c in zip(edges, counts):
        out.append(f"| {lo}–{hi} | {c} | {hbar(c, scale)} |")
    if never:
        out.append(f"| never | {never} | {hbar(never, scale)} |")
    return out


def force_meter(m: float) -> str:
    return "●●●" if m >= 1.5 else "●●○" if m >= 0.9 else "●○○"


def ruleout_sign(x: float) -> str:
    return "➖" if x >= 0.35 else "➕" if x <= 0.10 else "±"


def shape_spark(x: float) -> str:
    return "▁▁█" if x >= 0.55 else "▆▆▆" if x <= 0.40 else "▁▄█"


def sec_faults(g: dict) -> list[str]:
    rob = g["robustness"]
    rows = sorted(g["rows"], key=lambda r: fcode_key(r["fault"]))
    out = [
        "## Per-fault diagnosis",
        "",
        "Every fault's rank as the engine asks questions — the **clean** run over "
        "the median path under **1-in-5 user errors**.",
        "",
        f"Rank each step: {RANK_LEGEND}.",
        "",
        "The ● after each fault is its **recovery tier** — how robust it is to "
        "answer errors: 🟢 ≥80% of noisy runs still end top-3 · 🟡 50–79% · 🟠 30–49% "
        "· 🔴 <30% (the exact `recover` % follows). `lock` = questions to pin top-3 "
        "(clean→noisy) · `behind ⚠️` = a *different* component still outranking it "
        "at the end — a triage gap (same-family siblings in front are expected "
        "and not shown).",
        "",
        "```",
    ]
    for r in rows:
        f = r["fault"]
        v = rob[f]
        cl = r["lock_in"]
        nz = round(v["med_lockin"]) if v["med_lockin"] is not None else None
        cl_s = str(cl) if cl is not None else "—"
        nz_s = str(nz) if (v["lock_rate"] >= 0.5 and nz is not None) else "·"
        fr = r["final_rank"]
        leaders = r["final_top3"][:fr - 1] if fr <= 3 else r["final_top3"]
        cross = [c for c in leaders if PARENT[c] != r["parent"]]
        hdr = (f"{f:<7}{recovery_cell(v['recovery'])} {v['recovery']*100:>3.0f}%  "
               f"lock {cl_s}→{nz_s}")
        if fr > 1 and cross:
            names = ", ".join(cross[:2]) + (" …" if len(cross) > 2 else "")
            hdr += f"  behind ⚠️ {names}"
        hdr += f"   {short_label(f)}"
        clean = "".join(rank_cell(x) for x in r["ranks"])
        noise = "".join(rank_cell(round(x)) for x in v["median_ranks"])
        out += [hdr, f"  clean {clean}", f"  noisy {noise}"]
    out.append("```")

    miss = [r["fault"] for r in rows if r["parent_lock"] is None]
    fragile = sorted(
        ((f, v["recovery"]) for f, v in rob.items() if v["recovery"] < 0.5),
        key=lambda kv: kv[1],
    )
    notes = []
    if miss:
        notes.append(
            f"**{', '.join(miss)}** never gets its *component* to lead and hold — "
            "a different family stays on top (the one true triage gap)."
        )
    if fragile:
        frag = ", ".join(f"{f} ({x*100:.0f}%)" for f, x in fragile)
        notes.append(
            f"Most error-fragile: {frag} — one wrong answer keeps them behind a "
            "rival failure mode. Everything 🟩 tracks its clean path under noise."
        )
    if notes:
        out += ["", "> " + "  \n> ".join(notes)]
    return out


def sec_questions(g: dict) -> list[str]:
    qs = g["qstats"]
    prof = g["profile"]
    n_runs = len(g["rows"])
    out = [
        "## Questions",
        "",
        "What each question **did** (work = avg rank-gain for the true fault · "
        "🟩 ≥1.0 strong · 🟨 helps · ⬜ idle · 🟥 hurts) beside what it **can do** — "
        "**scope** ▆ families it moves · **force** ● strongest push · **rule-out** "
        "➖ exonerates / ➕ only adds · **shape** ▁▄█ one loud answer vs graded. "
        "Sorted by work.",
        "",
        "| Q | Work | Asked | Scope | Force | Rule-out | Shape |",
        "|---|:--:|:--:|:--|:--|:--:|:--|",
    ]
    for question_id, d in sorted(qs.items(), key=lambda kv: -kv[1]["mean_work"]):
        p = prof[question_id]
        work = f"{work_cell(d['mean_work'])} {d['mean_work']:+.1f}"
        scope = f"{minibar(p['families'] / 9)} {p['families']}"
        force = f"{force_meter(p['max_push'])} {force_label(p['max_push'])}"
        rout = f"{ruleout_sign(p['ruleout'])} {p['ruleout']*100:.0f}%"
        shape = f"{shape_spark(p['top_share'])} {shape_label(p['top_share'])}"
        out.append(
            f"| {question_id} | {work} | {d['asked']/n_runs*100:.0f}% | {scope} | {force} | "
            f"{rout} | {shape} |"
        )

    neg = sorted((q for q, d in qs.items() if d["mean_work"] < -0.05),
                 key=lambda q: qs[q]["mean_work"])
    idle = sorted((q for q, d in qs.items() if -0.05 <= d["mean_work"] < 0.1),
                  key=lambda q: qs[q]["med_pos"], reverse=True)
    out += ["", "**Not pulling their weight**"]
    if neg:
        late = statistics.fmean(qs[q]["med_pos"] for q in neg)
        out.append(f"- 🟥 *cost rank* — {', '.join(neg)}: asked late (~pos {late:.0f}), "
                   "so a stray answer mostly reshuffles already-settled ties.")
    if idle:
        out.append(f"- ⬜ *idle* — {', '.join(idle)}: rarely separate the failure modes still "
                   "live by then (redundant or too narrow).")
    out += ["", "_Q1 always goes first, so its work also credits unwinding the "
            "no-answer prior. Triage (high-scope) questions sit early; single-family "
            "confirmers come last — the intended broad-to-narrow funnel._"]
    return out


SECTIONS = [sec_dashboard, sec_faults, sec_questions]


def render(g: dict) -> str:
    return "\n\n".join("\n".join(fn(g)) for fn in SECTIONS) + "\n"


def as_json(g: dict) -> str:
    payload = {
        "depth": DEPTH,
        "family_mix": g["family_mix"],
        "faults": [dict(r) for r in g["rows"]],
        "questions": {
            question_id: {
                "asked": d["asked"],
                "median_position": d["med_pos"],
                "mean_work": round(d["mean_work"], 3),
                **{k: round(v, 3) if isinstance(v, float) else v
                   for k, v in g["profile"][question_id].items()},
            }
            for question_id, d in g["qstats"].items()
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
