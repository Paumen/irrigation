"""MCP server exposing the irrigation diagnostic engine as a tool.

Launch as stdio MCP server for Claude Code / Claude Desktop. Register via
.mcp.json at the repo root (Claude Code picks it up automatically).
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent))

from mcp.server.fastmcp import FastMCP

from diagnose import diagnose as _diagnose

mcp = FastMCP("irrigation-diagnostic")


@mcp.tool()
def diagnose_irrigation(
    answers: dict[str, Any] | None = None,
    skipped: dict[str, bool] | None = None,
) -> dict:
    """Run the irrigation troubleshooting engine.

    Call repeatedly to drive a question-and-answer loop with a homeowner:
    pass the answers collected so far, take the top entry from `next` as
    the next question to ask, render its options via AskUserQuestion,
    add the user's pick to `answers`, and call again. Stop when
    `next[0].relevancy` is "low" or null.

    Args:
        answers: Mapping of question id (Q1..Q19) to the user's answer.
            - options-type questions: integer index into the question's options
            - matrix-type questions: dict mapping row_id -> column_id
              (omit a row to mean "no"; column ids come from the question)
            - ages-type questions (Q9): dict mapping equipment row_id -> step index
              (0 = unknown, 1..4 = age bucket per stepLabels)
        skipped: Mapping of question id -> True for questions the user
            explicitly declined to answer. Skipped questions are excluded
            from the next-question recommendations.

    Returns:
        {
          "ranked": top 5 causes [{id, label, pct, score}, ...] sorted by score,
          "next": top 5 recommended questions [
            {id, text, type, stage, optional, relevancy, D, options|rows|columns|stepLabels}, ...
          ] sorted by discriminator D (highest first),
          "answered_count": number of answered questions,
          "skipped_count": number of skipped questions,
          "total_questions": total main questions in the flow,
        }
    """
    return _diagnose(answers or {}, skipped or {})


if __name__ == "__main__":
    mcp.run()
