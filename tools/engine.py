"""Pure scoring engine for the irrigation diagnostic.

Source of truth for the questionnaire scoring algorithm. Reads the catalogue
(causes, questions, weights, stages, slider curves) from data.json via
tools/diagnose.py. No I/O of its own.
"""

from __future__ import annotations

from typing import Any

BREADTH_WEIGHT = 1.0
EASE_WEIGHT = 0.5
MATRIX_EXPECTED_FILLED = 1


class Engine:
    def __init__(self, data: dict[str, Any]):
        self._data = data
        w = data.get("effortWeight")
        self._effort_weight: float = float(w) if isinstance(w, (int, float)) else 0.0
        self.causes: dict[str, dict] = {c["id"]: c for c in data["causes"]}
        self.all_ids: list[str] = list(self.causes.keys())

        self._cause_children: dict[str, list[str]] = {}
        for c in data["causes"]:
            self._cause_children.setdefault(c["parent"], []).append(c["id"])

        self.questions: list[dict] = self._build_questions()
        self.main_questions = [q for q in self.questions if not q.get("optional")]
        self.optional_questions = [q for q in self.questions if q.get("optional")]
        self.ages_q = next((q for q in self.questions if q["type"] == "ages"), None)
        self.q_by_id = {q["id"]: q for q in self.questions}

        self.stages: list[int] = [s["id"] for s in data["stages"]]
        self.stage_labels: dict[int, str] = {s["id"]: s["label"] for s in data["stages"]}
        self.stage_qs: dict[int, list[dict]] = {
            s: [q for q in self.questions if q.get("stage") == s] for s in self.stages
        }

    def _expand_effects(self, effects: dict | None) -> dict | None:
        if not effects:
            return effects
        out: dict[str, float] = {}
        for k, v in effects.items():
            kids = self._cause_children.get(k)
            if not kids:
                out[k] = v
                continue
            for cid in kids:
                if cid not in effects:
                    out[cid] = v
        return out

    def _expand_step_rows(self, q: dict) -> list[dict]:
        curves = self._data.get("sliderCurves", {})
        labels = q.get("stepLabels", [])
        result = []
        for row in q["rows"]:
            if row.get("steps"):
                result.append(row)
                continue
            curve = curves.get(row.get("curve"), [])
            causes = row.get("causes", [])
            steps = []
            for i, label in enumerate(labels):
                if i == 0:
                    effects: dict[str, float] = {}
                else:
                    val = curve[i - 1] if i - 1 < len(curve) else 0
                    effects = {cid: val for cid in causes}
                steps.append({"label": label, "effects": effects})
            result.append({**row, "steps": steps})
        return result

    def _build_questions(self) -> list[dict]:
        result = []
        for q in self._data["questions"]:
            base_type = q.get("type") or ("multi" if q.get("multiselect") else "options")
            nxt = {**q, "type": base_type}
            if nxt["type"] == "matrix":
                nxt["colMul"] = {c["id"]: c["mult"] for c in nxt["columns"]}
                nxt["rows"] = [
                    {**r, "effects": self._expand_effects(r.get("effects"))} for r in nxt["rows"]
                ]
            elif nxt["type"] == "ages":
                expanded = self._expand_step_rows(nxt)
                nxt["rows"] = [
                    {
                        **r,
                        "steps": [
                            {**s, "effects": self._expand_effects(s.get("effects"))}
                            for s in r["steps"]
                        ],
                    }
                    for r in expanded
                ]
            else:
                nxt["options"] = [
                    {**o, "effects": self._expand_effects(o.get("effects"))} for o in nxt["options"]
                ]
            result.append(nxt)
        result.sort(key=lambda q: q.get("stage") if q.get("stage") is not None else float("inf"))
        return result

    def _score(self, q: dict, ans: Any, s: dict[str, float]) -> None:
        t = q["type"]
        if t == "options":
            if not isinstance(ans, int) or isinstance(ans, bool) or ans < 0 or ans >= len(q["options"]):
                return
            for cid, delta in q["options"][ans]["effects"].items():
                s[cid] = s.get(cid, 0) + delta
        elif t == "multi":
            if not isinstance(ans, list):
                return
            for i in ans:
                if not isinstance(i, int) or isinstance(i, bool) or i < 0 or i >= len(q["options"]):
                    continue
                for cid, delta in q["options"][i]["effects"].items():
                    s[cid] = s.get(cid, 0) + delta
        elif t == "matrix":
            if not isinstance(ans, dict):
                return
            col_mul = q["colMul"]
            for row in q["rows"]:
                m = col_mul.get(ans.get(row["id"], "no"), 0)
                if m == 0:
                    continue
                for cid, delta in row["effects"].items():
                    s[cid] = s.get(cid, 0) + delta * m
        elif t == "ages":
            if not isinstance(ans, dict):
                return
            for row in q["rows"]:
                idx = ans.get(row["id"])
                if idx is None or not isinstance(idx, int) or idx < 0 or idx >= len(row["steps"]):
                    continue
                for cid, delta in row["steps"][idx]["effects"].items():
                    s[cid] = s.get(cid, 0) + delta

    def _cause_terms(self, q: dict, ids: list[str]) -> tuple[float, float]:
        """The two cause-based factors of the score: isolation (how sharply
        answers separate specific causes) and the weighted breadth (how many
        causes the question moves at all). Computed per question type."""
        t = q["type"]
        if t == "options":
            iso = 0.0
            breadth = 0
            for cause_id in ids:
                deltas = [o["effects"].get(cause_id, 0) for o in q["options"]]
                spread = max(deltas) - min(deltas)
                if spread > 0:
                    breadth += 1
                iso += spread
            return iso, BREADTH_WEIGHT * breadth
        if t == "multi":
            iso = 0.0
            breadth = 0
            for cause_id in ids:
                sum_abs = sum(abs(o["effects"].get(cause_id, 0)) for o in q["options"])
                if sum_abs > 0:
                    breadth += 1
                iso += sum_abs
            return iso, BREADTH_WEIGHT * breadth
        if t == "matrix":
            mults = [c["mult"] for c in q["columns"]]
            mult_spread = max(mults) - min(mults)
            n_rows = len(q["rows"])
            p = (MATRIX_EXPECTED_FILLED / n_rows) if n_rows > 0 else 0
            iso = 0.0
            rows_affecting: dict[str, int] = {}
            for row in q["rows"]:
                for cause_id in ids:
                    e = abs(row["effects"].get(cause_id, 0))
                    if e > 0:
                        iso += e * mult_spread * p
                        rows_affecting[cause_id] = rows_affecting.get(cause_id, 0) + 1
            breadth = sum(1 - (1 - p) ** k for k in rows_affecting.values())
            return iso, BREADTH_WEIGHT * breadth
        if t == "ages":
            iso = 0.0
            affected = set()
            for row in q["rows"]:
                for cause_id in ids:
                    deltas = [st["effects"].get(cause_id, 0) for st in row["steps"]]
                    spread = max(deltas) - min(deltas)
                    if spread > 0:
                        iso += spread
                        affected.add(cause_id)
            return iso, BREADTH_WEIGHT * len(affected)
        return 0.0, 0.0

    def discriminator_terms(self, q: dict, ids: list[str]) -> dict[str, float]:
        """The three factors behind question q's score: isolation and breadth
        (how sharply / how broadly it separates the live causes) and effort
        (ease of answering). The score ranks on isolation+breadth, with effort
        as a bounded tie-breaker; see discriminators()."""
        iso, breadth = self._cause_terms(q, ids)
        effort = self._effort_term(q)
        return {"isolation": iso, "breadth": breadth, "effort": effort}

    def _ans_is_present(self, q: dict, ans: Any) -> bool:
        t = q["type"]
        if t == "options":
            return True
        if t == "multi":
            return isinstance(ans, list) and len(ans) > 0
        if t == "matrix":
            return isinstance(ans, dict)
        if t == "ages":
            return isinstance(ans, dict)
        return False

    def is_answered(self, qid: str, ans: Any) -> bool:
        if ans is None:
            return False
        q = self.q_by_id.get(qid)
        if not q:
            return False
        return self._ans_is_present(q, ans)

    def is_completed(self, qid: str, answers: dict | None = None, skipped: dict | None = None) -> bool:
        answers = answers or {}
        skipped = skipped or {}
        return self.is_answered(qid, answers.get(qid)) or bool(skipped.get(qid))

    def rank(self, answers: dict | None = None) -> list[dict]:
        answers = answers or {}
        s: dict[str, float] = {cid: self.causes[cid]["baseline"] for cid in self.all_ids}
        for q in self.questions:
            ans = answers.get(q["id"])
            if ans is None:
                continue
            self._score(q, ans, s)
        pos_total = sum(max(0, v) for v in s.values())
        result = [
            {
                "id": cid,
                "score": s[cid],
                "pct": (max(0, s[cid]) / pos_total * 100) if pos_total > 0 else 0,
            }
            for cid in self.all_ids
        ]
        result.sort(key=lambda r: -r["score"])
        return result

    def contending_ids(self, answers: dict | None = None) -> list[str]:
        ranked = self.rank(answers)
        if not ranked:
            return []
        leader = ranked[0]["pct"]
        cutoff = max(2, leader * 0.3)
        ids = [r["id"] for r in ranked if r["pct"] >= cutoff]
        if len(ids) >= 3:
            return ids
        return [r["id"] for r in ranked[:3]]

    def _effort_term(self, q: dict) -> float:
        lvl = q.get("effort")
        return float(lvl) * self._effort_weight if isinstance(lvl, (int, float)) else 0.0

    def _requires_met(self, q: dict, answers: dict | None) -> bool:
        req = q.get("requires")
        if not req:
            return True
        for dep_qid, allowed in req.items():
            ans = (answers or {}).get(dep_qid)
            if not isinstance(ans, int) or isinstance(ans, bool):
                return False
            if ans not in allowed:
                return False
        return True

    def discriminators(self, answers: dict | None = None, skipped: dict | None = None) -> dict:
        ids = self.contending_ids(answers)
        cands: list[tuple[str, float, float]] = []
        max_effort = 0.0
        for q in self.questions:
            if self.is_completed(q["id"], answers, skipped):
                continue
            if not self._requires_met(q, answers):
                continue
            t = self.discriminator_terms(q, ids)
            # Gate: only surface a question that actually separates a contending
            # cause, so a cheap-but-uninformative question can't ride onto the list.
            info = t["isolation"] + t["breadth"]
            if info <= 0:
                continue
            effort = t["effort"]
            if effort > max_effort:
                max_effort = effort
            cands.append((q["id"], info, effort))
        m: dict[str, float] = {}
        mx = 0.0
        for qid, info, effort in cands:
            # Rank by how sharply a question separates the live causes; ease only
            # nudges within a bounded band (EASE_WEIGHT), breaking ties between
            # comparably-informative questions without ever outweighing separation.
            ease = (effort / max_effort) if max_effort > 0 else 0.0
            D = info * (1 + EASE_WEIGHT * ease)
            m[qid] = D
            if D > mx:
                mx = D
        return {"map": m, "max": mx}

    def recommendations(self, answers: dict | None = None, skipped: dict | None = None) -> list[dict]:
        d = self.discriminators(answers, skipped)
        items = [
            {"q": self.q_by_id[qid], "D": D}
            for qid, D in d["map"].items()
            if D > 0
        ]
        items.sort(key=lambda x: -x["D"])
        return items

    def relevancy_level(
        self, qid: str, answers: dict | None = None, skipped: dict | None = None
    ) -> str | None:
        d = self.discriminators(answers, skipped)
        D = d["map"].get(qid)
        if D is None or D <= 0 or d["max"] <= 0:
            return None
        ratio = D / d["max"]
        if ratio >= 2 / 3:
            return "high"
        if ratio >= 1 / 3:
            return "mid"
        return "low"

    def stage_progress(
        self, answers: dict | None = None, skipped: dict | None = None
    ) -> dict[int, dict]:
        out = {}
        for s in self.stages:
            qs = self.stage_qs[s]
            out[s] = {
                "total": len(qs),
                "answered": sum(
                    1 for q in qs if self.is_completed(q["id"], answers, skipped)
                ),
            }
        return out
