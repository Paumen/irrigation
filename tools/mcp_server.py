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
    """Run the troubleshooting engine; call repeatedly, asking the top `next`
    entry each turn until `next` is empty.

    Args:
        answers: question id -> answer, shaped per the question's `type`:
            options: int index; multi: list of indices; matrix: dict
            row_id -> column_id (omit a row = "no"); ages: dict row_id ->
            step (0 = unknown, 1..4 = bucket per stepLabels).
        skipped: question id -> True; excluded from recommendations.
    """
    return _diagnose(answers or {}, skipped or {})


if __name__ == "__main__":
    mcp.run()
