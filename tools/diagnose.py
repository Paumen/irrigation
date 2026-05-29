"""Agent-facing diagnose tool: takes answers, returns ranked causes and
the next best question to ask.

Usage as a library:
    from tools.diagnose import diagnose
    result = diagnose({"Q1": 0, "Q2": 1})

Usage as a CLI:
    echo '{"answers": {"Q1": 0}}' | python tools/diagnose.py
"""

from __future__ import annotations

import json
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent))
from engine import Engine

DATA_PATH = Path(__file__).resolve().parent.parent / "data.json"


@lru_cache(maxsize=1)
def _engine() -> Engine:
    with open(DATA_PATH) as f:
        return Engine(json.load(f))


def _summarize_question(
    q: dict, relevancy: str | None, D: float, terms: dict[str, float]
) -> dict:
    out = {
        "id": q["id"],
        "text": q["text"],
        "type": q["type"],
        "stage": q.get("stage"),
        "context": q.get("context"),
        "optional": bool(q.get("optional")),
        "relevancy": relevancy,
        "D": round(D, 4),
        "factors": {
            "isolation": round(terms["isolation"], 4),
            "breadth": round(terms["breadth"], 4),
            "effort": round(terms["effort"], 4),
        },
    }
    if q["type"] in ("options", "multi"):
        out["options"] = [{"index": i, "label": o["label"]} for i, o in enumerate(q["options"])]
        if q["type"] == "multi":
            out["multiselect"] = True
    elif q["type"] == "matrix":
        out["columns"] = [{"id": c["id"], "label": c["label"]} for c in q["columns"]]
        out["rows"] = [{"id": r["id"], "label": r["label"]} for r in q["rows"]]
    elif q["type"] == "ages":
        out["rows"] = [
            {"id": r["id"], "label": r["label"], "model": r.get("model", "")} for r in q["rows"]
        ]
        out["stepLabels"] = q.get("stepLabels", [])
    return out


def diagnose(
    answers: dict[str, Any] | None = None,
    skipped: dict[str, bool] | None = None,
    top_n_causes: int = 5,
    top_n_next: int = 7,
) -> dict:
    """Run scoring and recommend the next question(s).

    Returns:
        ranked: top-N causes with id, label, pct, score
        next: top-N recommended questions with id, text, type, options,
            relevancy, score D, and the three factors behind it (isolation,
            breadth, effort); D ranks on isolation+breadth with effort as a
            bounded tie-breaker
        answered_count: how many questions have been answered (excludes skipped)
    """
    engine = _engine()
    answers = answers or {}
    skipped = skipped or {}

    ranked = engine.rank(answers)
    recs = engine.recommendations(answers, skipped)
    ids = engine.contending_ids(answers)

    return {
        "ranked": [
            {
                "id": r["id"],
                "label": engine.causes[r["id"]]["label"],
                "pct": round(r["pct"], 1),
                "score": round(r["score"], 3),
            }
            for r in ranked[:top_n_causes]
        ],
        "next": [
            _summarize_question(
                rec["q"],
                engine.relevancy_level(rec["q"]["id"], answers, skipped),
                rec["D"],
                engine.discriminator_terms(rec["q"], ids),
            )
            for rec in recs[:top_n_next]
        ],
        "answered_count": sum(1 for qid in answers if engine.is_answered(qid, answers[qid])),
        "skipped_count": len(skipped),
        "total_questions": len(engine.main_questions),
    }


def main() -> None:
    raw = sys.stdin.read().strip() or "{}"
    payload = json.loads(raw)
    answers = payload.get("answers", {})
    skipped = payload.get("skipped", {})
    result = diagnose(answers, skipped)
    json.dump(result, sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
