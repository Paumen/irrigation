from __future__ import annotations

import json
import random
import statistics
from dataclasses import dataclass, field
from pathlib import Path

from engine import Engine

DEPTH = 18

DATA = json.loads((Path(__file__).resolve().parent.parent / "data.json").read_text())
ENG = Engine(DATA)
PARENT: dict[str, str] = {c["id"]: c["parent"] for c in DATA["causes"]}
LABEL: dict[str, str] = {c["id"]: c.get("label", c["id"]) for c in DATA["causes"]}

# a/b/c/d -> option index 0/1/2/3 ; '-' = skip
T1_COLS = ["Q1", "Q2", "Q2q", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8"]
T2_COLS = ["Q12", "Q13", "Q14", "Q15", "Q16", "Q17", "Q18", "Q19", "Q20", "Q21", "Q22", "Q23"]

T1 = {
    "F1.5":   "a d - c b a d c a",
    "F1.8":   "a d - c b a d c c",
    "F2.1":   "a d - c d c d c c",
    "F2.5":   "a d - c d c d a c",
    "F2.6":   "a b a c a c a c a",
    "F2.8":   "a d - c d c d c a",
    "F3.1.1": "c d - a a a d c a",
    "F3.1.2": "a d - a a a d c a",
    "F3.1.3": "c d - a a a c c c",
    "F3.4":   "c d - a a a c c c",
    "F4.1":   "a d - c a c a c c",
    "F4.4":   "a d - c a c a c a",
    "F5.1":   "a d b b a c a c b",
    "F5.3":   "a d c d a c a b c",
    "F5.8":   "a a c d a b a b c",
    "F6.1":   "a a b d a b a c a",
    "F6.3":   "a a b a a b a c a",
    "F7.1.1": "c d - a a a d c a",
    "F7.1.2": "c a b a a a a c b",
    "F7.1.3": "c a b a a a a c b",
    "F7.3.1": "c d - a a a b c a",
    "F7.3.2": "c d b a a a a c a",
    "F7.4":   "c a b a a a a c a",
    "F8.1":   "c a b a a a a c a",
    "F8.3":   "c a b a a a a c a",
    "F9.1.1": "d a a a a a a c a",
    "F9.1.2": "d a a a a a a c b",  # gradual, not sudden
    "F9.3":   "d a a a a a a c a",
    "F9.4":   "d a a a a a a c a",
}
T2 = {
    "F1.5":   "a a a a a a d a a a c a",
    "F1.8":   "a a a a a a d a a a c a",
    "F2.1":   "c b a a a a d b d a - a",
    "F2.5":   "c b a a a a d b d a - a",
    "F2.6":   "a b a a a a d a d a a a",
    "F2.8":   "c b a a a a d b d a - a",
    "F3.1.1": "a c b d a a d b a a - a",  # high-resistance break reads low/fluctuating
    "F3.1.2": "a c b d a a d b a a - a",  # high-resistance break reads low/fluctuating
    "F3.1.3": "a a c d a a d b a b - a",
    "F3.4":   "a a c d a a d b a c a a",
    "F4.1":   "c a a a a a d b b a - a",
    "F4.4":   "c a a a a a d b b a - a",
    "F5.1":   "c a a a a a d b c a - a",
    "F5.3":   "c a a a a a d b a a - a",
    "F5.8":   "b a a a a a d b a a - a",
    "F6.1":   "b a a a a a a b a a c a",
    "F6.3":   "b a a a a a d b a a c a",
    "F7.1.1": "a a b b b a d b a a - a",
    "F7.1.2": "b a a a b b b b a a b b",
    "F7.1.3": "b a a a b b b b a a b c",
    "F7.3.1": "a a a a b b d b a a - a",
    "F7.3.2": "a a a a b b d b a a - a",
    "F7.4":   "b a a a b b b b a a b a",
    "F8.1":   "b a a a a a c b a a c a",
    "F8.3":   "b a a a a a d b a a c a",
    "F9.1.1": "a a a a a a d b a a c a",
    "F9.1.2": "a a a a a a d a a a c a",
    "F9.3":   "a a a a a a d a a a c a",
    "F9.4":   "a a a a a a d b a a c a",
}

# Age step 4 = 12+ yrs; "right" = "started right after". Cells with no effect on
# the target cause are omitted, not filled.
CTX = {
    "F1.5":   {},
    "F1.8":   {"Q11b": {"outage": "right"}},
    "F2.1":   {"Q9": {"ctrl": 4}, "Q11": {"storm": "right"}},
    "F2.5":   {"Q11b": {"outage": "right"}},
    "F2.6":   {"Q10b": {"ctrl": "right"}},
    "F2.8":   {"Q11b": {"outage": "right"}},
    "F3.1.1": {"Q11b": {"dig": "right"}},
    "F3.1.2": {"Q11b": {"dig": "right"}},
    "F3.1.3": {"Q11": {"storm": "right"}},
    "F3.4":   {"Q10b": {"wiring": "right"}},
    "F4.1":   {"Q9": {"relay": 4}, "Q11": {"storm": "right"}},
    "F4.4":   {"Q10b": {"relay": "right"}},
    "F5.1":   {"Q9": {"pump": 4}},
    "F5.3":   {"Q9": {"pump": 3}, "Q11": {"heat": "right"}},
    "F5.8":   {"Q11": {"heat": "right"}},
    "F6.1":   {"Q11": {"freeze": "right"}, "Q9": {"mainHose": 4}},
    "F6.3":   {"Q10": {"hose": "right"}},
    "F7.1.1": {"Q9": {"valves": 4}},
    "F7.1.2": {"Q9": {"valves": 4}},
    "F7.1.3": {"Q11": {"freeze": "right"}, "Q9": {"valves": 4}},
    "F7.3.1": {"Q10": {"valves": "right"}},
    "F7.3.2": {"Q10": {"valves": "right"}},
    "F7.4":   {"Q10": {"valves": "right"}},
    "F8.1":   {"Q11": {"freeze": "right"}, "Q9": {"hose": 4}},
    "F8.3":   {"Q10": {"hose": "right"}},
    "F9.1.1": {"Q9": {"rotor": 4}},
    "F9.1.2": {"Q9": {"rotor": 4}},
    "F9.3":   {"Q10": {"rotor": "right"}},
    "F9.4":   {"Q10": {"rotor": "right"}},
}

LET = {"a": 0, "b": 1, "c": 2, "d": 3}

# letter -> ticked option indices. None = skipped, not an empty selection.
MULTI = {
    "Q18": {"a": [0], "b": [1], "c": [2], "d": None},
    "Q22": {"a": [0], "b": [1], "c": [2]},
    "Q23": {"a": None, "b": [0], "c": [1], "d": [0, 1]},
}

FAULTS = list(T1)


def build_key(fault: str) -> dict:
    key: dict = {}
    for col, let in zip(T1_COLS, T1[fault].split()):
        if let != "-":
            key[col] = LET[let]
    for col, let in zip(T2_COLS, T2[fault].split()):
        if let == "-":
            continue
        if col in MULTI:
            picks = MULTI[col][let]
            if picks is not None:
                key[col] = picks
        else:
            key[col] = LET[let]
    key.update(CTX[fault])
    return key


@dataclass
class Step:
    i: int            # 1-based ordinal among *answered* questions
    qid: str
    rank: int         # 1 = top
    top3: list[str]
    pct: float


@dataclass
class Trajectory:
    fault: str
    steps: list[Step]
    skipped: list[str]      # recommended but with no answer in the key
    base_rank: int          # rank before any question is answered
    # (qid, rank) per answered question; (qid, None) when recommended but skipped.
    events: list[tuple[str, int | None]] = field(default_factory=list)

    @property
    def ranks(self) -> list[int]:
        return [s.rank for s in self.steps]

    @property
    def final_rank(self) -> int:
        return self.steps[-1].rank if self.steps else self.base_rank

    def rank_at(self, n: int) -> int:
        if not self.steps:
            return self.base_rank
        return self.steps[min(n, len(self.steps)) - 1].rank

    def lock_in(self, thr: int) -> int | None:
        """Earliest count after which rank stays <= thr to the end. None if never."""
        ranks = self.ranks
        for k in range(1, len(ranks) + 1):
            if all(r <= thr for r in ranks[k - 1:]):
                return k
        return None

    def parent_lock_in(self, parent: str) -> int | None:
        """Earliest count after which the #1 cause stays in `parent`'s family to
        the end. None if never."""
        tops = [PARENT[s.top3[0]] for s in self.steps]
        for k in range(1, len(tops) + 1):
            if all(p == parent for p in tops[k - 1:]):
                return k
        return None


def simulate(fault: str, n: int = DEPTH) -> Trajectory:
    key = build_key(fault)
    answers: dict = {}
    skipped: dict = {}
    base = ENG.rank(answers)
    base_rank = next(i for i, r in enumerate(base, 1) if r["id"] == fault)
    steps: list[Step] = []
    asked_skips: list[str] = []
    events: list[tuple[str, int | None]] = []
    while len(steps) < n:
        recs = ENG.recommendations(answers, skipped)
        if not recs:
            break
        qid = recs[0]["q"]["id"]
        if qid in key:
            answers[qid] = key[qid]
            ranked = ENG.rank(answers)
            rank = next(i for i, r in enumerate(ranked, 1) if r["id"] == fault)
            pct = next(r["pct"] for r in ranked if r["id"] == fault)
            steps.append(Step(len(steps) + 1, qid, rank, [r["id"] for r in ranked[:3]], pct))
            events.append((qid, rank))
        else:
            skipped[qid] = True
            asked_skips.append(qid)
            events.append((qid, None))
    return Trajectory(fault, steps, asked_skips, base_rank, events)


def simulate_all(n: int = DEPTH) -> dict[str, Trajectory]:
    return {f: simulate(f, n) for f in FAULTS}


def _question_choices(q: dict) -> list[dict[str, float]]:
    """Effect dict per selectable choice. Matrix: each row at its max column;
    ages: each non-empty age step."""
    t = q["type"]
    if t in ("options", "multi"):
        return [dict(o["effects"]) for o in q["options"]]
    if t == "matrix":
        mx = max(c["mult"] for c in q["columns"])
        return [{c: v * mx for c, v in r["effects"].items()} for r in q["rows"]]
    if t == "ages":
        return [dict(s["effects"]) for r in q["rows"] for s in r["steps"] if s["effects"]]
    return []


def question_profile() -> dict[str, dict]:
    prof: dict[str, dict] = {}
    for q in ENG.questions:
        chs = _question_choices(q)
        alld = [v for ch in chs for v in ch.values()]
        absall = [abs(v) for v in alld]
        masses = [sum(abs(v) for v in ch.values()) for ch in chs]
        tot = sum(absall)
        prof[q["id"]] = {
            "type": q["type"],
            "families": len({PARENT[c] for ch in chs for c in ch if c in PARENT}),
            "causes": len({c for ch in chs for c in ch}),
            "max_push": max(absall) if absall else 0.0,
            "ruleout": (sum(-v for v in alld if v < 0) / tot) if tot else 0.0,
            "top_share": (max(masses) / sum(masses)) if sum(masses) else 0.0,
        }
    return prof


def random_answer(q: dict, rng: random.Random):
    t = q["type"]
    if t == "options":
        return rng.randrange(len(q["options"]))
    if t == "multi":
        n = len(q["options"])
        return sorted(rng.sample(range(n), rng.randint(1, n)))
    if t == "matrix":
        cols = [c["id"] for c in q["columns"]]
        return {r["id"]: rng.choice(cols) for r in q["rows"]}
    if t == "ages":
        return {r["id"]: rng.randrange(len(r["steps"])) for r in q["rows"]}
    return None


def simulate_noisy(fault: str, noise_rate: float, rng: random.Random,
                   n: int = DEPTH) -> Trajectory:
    key = build_key(fault)
    answers: dict = {}
    skipped: dict = {}
    base = ENG.rank(answers)
    base_rank = next(i for i, r in enumerate(base, 1) if r["id"] == fault)
    steps: list[Step] = []
    asked_skips: list[str] = []
    while len(steps) < n:
        recs = ENG.recommendations(answers, skipped)
        if not recs:
            break
        qid = recs[0]["q"]["id"]
        if qid in key:
            if rng.random() < noise_rate:
                answers[qid] = random_answer(ENG.q_by_id[qid], rng)
            else:
                answers[qid] = key[qid]
            ranked = ENG.rank(answers)
            rank = next(i for i, r in enumerate(ranked, 1) if r["id"] == fault)
            pct = next(r["pct"] for r in ranked if r["id"] == fault)
            steps.append(Step(len(steps) + 1, qid, rank, [r["id"] for r in ranked[:3]], pct))
        else:
            skipped[qid] = True
            asked_skips.append(qid)
    return Trajectory(fault, steps, asked_skips, base_rank)


def robustness(fault: str, trials: int = 50, noise_rate: float = 0.2,
               seed: int = 0, top: int = 3) -> dict:
    fi = FAULTS.index(fault)
    finals, lockins, runs = [], [], []
    for t in range(trials):
        rng = random.Random(seed * 1_000_000 + fi * 1000 + t)
        traj = simulate_noisy(fault, noise_rate, rng)
        finals.append(traj.final_rank)
        lockins.append(traj.lock_in(top))
        runs.append(traj.ranks)
    locked = [k for k in lockins if k is not None]
    # stop once fewer than half the trials reach this step
    med_ranks: list[float] = []
    for i in range(max((len(r) for r in runs), default=0)):
        col = [r[i] for r in runs if len(r) > i]
        if len(col) < trials / 2:
            break
        med_ranks.append(statistics.median(col))
    return {
        "recovery": sum(1 for r in finals if r <= top) / len(finals),
        "at1": sum(1 for r in finals if r == 1) / len(finals),
        "lock_rate": len(locked) / len(lockins),
        "med_lockin": statistics.median(locked) if locked else None,
        "median_final": statistics.median(finals),
        "median_ranks": med_ranks,
    }


def robustness_all(trials: int = 50, noise_rate: float = 0.2,
                   seed: int = 0) -> dict[str, dict]:
    return {f: robustness(f, trials, noise_rate, seed) for f in FAULTS}
