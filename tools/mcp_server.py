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
from hydraulics import report as _hydraulics

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
        answers: Mapping of question id to the user's answer. The shape
            depends on each question's returned `type`:
            - options: integer index into the question's options
            - multi (multiselect options): list of selected option indices
            - matrix: dict mapping row_id -> column_id
              (omit a row to mean "no"; column ids come from the question)
            - ages: dict mapping equipment row_id -> step index
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


@mcp.tool()
def irrigation_hydraulics(
    adjustments: dict[str, Any] | None = None,
    zone: int | None = None,
) -> dict:
    """Compute flows, head pressures and weakest links for the system in setup.yaml.

    Runs a full hydraulic solve: DAB Jet pump curve -> static lift (elevations)
    -> pipe friction -> per-head pressure -> per-head flow, iterated because
    unregulated I-20 rotor flow depends on pressure. MP Rotators are 40 PSI
    regulated (fixed flow per model + arc). Use it to answer capacity and
    what-if questions ("what's the flow if I change nozzle 2.5 to 4.0?",
    "what if the pressure were 3.5 bar?") and to find binding constraints.

    Args:
        adjustments: optional what-if overrides (all optional):
            heads: list of head edits, each {zone, set, and one of index|loc|match}.
                e.g. swap a nozzle:
                {"zone": 2, "match": {"nozzle": "2.5 blue"}, "set": {"nozzle": "4.0 blue"}}
                or change an arc: {"zone": 1, "index": 0, "set": {"arc_deg": 180}}
            global_operating_pressure_bar: pin every head to this pressure and skip
                the pump/friction solve (answers "what if pressure were X bar?").
            pump_model: swap the pump curve (e.g. "JET 112 M").
            well_water_level_m_asl: water-table elevation (default = pump elevation).
            valve_cv, sj_loss_bar, suction_extra_loss_m: tune the loss model.
        zone: restrict to a single zone id.

    Returns:
        {
          "assumptions": {mode, pump_model, well_water_level_m_asl, loss coefficients, ...},
          "zones": [{id, flow_m3h, pump:{flow_m3h,head_m,head_bar},
                     head_pressure_bar:{min,max},
                     heads:[{loc,kind,spec,arc_deg,elevation_m,lateral_m,flow_m3h,pressure_bar}],
                     flags, adjustments_applied}],
          "weakest_links": {
             "pressure": {safe_window_bar, upper_bound_by, lower_bound_by,
                          observed_head_pressure_bar, ratings_bar, violations},
             "flow": {items:[{component,rating_m3h,load_m3h,margin_m3h,scope}], tightest, violations}
          }
        }
    """
    return _hydraulics(adjustments or {}, zone)


if __name__ == "__main__":
    mcp.run()
