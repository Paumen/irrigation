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
            {id, text, type, stage, context, optional, relevancy, D,
             factors:{isolation, breadth, effort},  # isolation+breadth drive D; effort only tie-breaks
             options|rows|columns|stepLabels}, ...
          ] sorted by discriminator D (highest first),
            # factors.isolation = how sharply answers separate specific causes
            # factors.breadth   = how many causes the question moves at all
            # factors.effort    = ease of answering (higher = less homeowner work)
            # context = shared physical setup (app-run, recall, valve-box,
            #   meter, pump, controller, walk, install); questions in the same
            #   context can be batched into one prompt and answered together
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
    concurrent_zones: list[int] | None = None,
) -> dict:
    """Compute flows, head pressures and weakest links for the system in setup.yaml.

    Walks the setup.yaml node graph and runs a full hydraulic solve: DAB Jet
    pump curve -> static lift (per-node elevations) -> pipe friction summed per
    segment (each segment carries the combined flow of the heads below it) ->
    per-head pressure -> per-head flow, iterated because unregulated I-20 rotor
    flow depends on pressure. MP Rotators are 40 PSI regulated (fixed flow per
    model + arc); the Z5 manual line ends in an open stream nozzle, modelled as
    free discharge from the 16 mm bore. Zones Z1-Z4 are automatic, Z5 is the
    manual line (estimated), Z6 is capped and excluded. Use it to answer
    capacity and what-if questions ("what's the flow if I change nozzle 2.5 to
    4.0?", "what if the pressure were 3.5 bar?") and to find binding
    constraints. Pipe velocity over the 1.5 m/s guideline is advisory (warning),
    not a hard violation.

    Args:
        adjustments: optional what-if overrides (all optional):
            heads: list of head edits, each {zone, set, and one of index|loc|match}.
                `loc` is a node id ("Z1.nozzle.rotor.01"); `match` matches nozzle-leaf
                fields; `index` indexes the zone's heads in physical order. e.g.:
                {"zone": 2, "match": {"nozzle": "2.5 blue"}, "set": {"nozzle": "4.0 blue"}}
                or change an arc: {"zone": 1, "index": 0, "set": {"arc_deg": 180}}
            global_operating_pressure_bar: pin every head to this pressure and skip
                the pump/friction solve (answers "what if pressure were X bar?").
            pump_model: swap the pump curve (e.g. "JET 112 M").
            well_water_level_m_asl: water-table elevation (default = pump elevation).
            valve_cv, sj_loss_bar, suction_extra_loss_m: tune the loss model.
        zone: restrict to a single zone id (one zone at a time).
        concurrent_zones: zone ids to run simultaneously (e.g. [2, 3]). The pump
            and main line carry the combined flow; each zone keeps its own valve
            and laterals. Answers "what if two zones run at once?". Takes
            precedence over `zone` and ignores global_operating_pressure_bar.

    Returns:
        {
          "health": {status: ok|warning|violation, headline,
                     checks:{pressure,flow,velocity,uniformity:
                             {label,status,unit,kind,value,min,max,note}},  # gauge bands
                     capacity:{pump_load_m3h,pump_rating_m3h,pump_load_pct,spare_flow_m3h},
                     zones:[{id,status,flow_m3h,head_pressure_bar,spread_pct,flags}],
                     flags, violations},   # at-a-glance summary of everything below
          "assumptions": {mode, pump_model, well_water_level_m_asl, loss coefficients, ...},
          "concurrent": {zones_running, combined_flow_m3h, pump, manifold_inlet_bar,
                         shared_losses_bar},   # only present in concurrent mode
          "zones": [{id, flow_m3h, pump:{flow_m3h,head_m,head_bar},
                     head_pressure_bar:{min,max}, pressure_spread_pct,
                     node_pressures_bar:{pump_discharge,manifold_inlet,after_valve},
                     loss_breakdown_bar:{static_lift,main_line_friction,suction,zone_valve},
                     heads:[{loc,kind,spec,arc_deg,elevation_m,lateral_m,flow_m3h,pressure_bar,
                             loss_breakdown_bar:{elevation_rise,lateral_friction,swing_joint}}],
                     flags, adjustments_applied}],
          "weakest_links": {
             "pressure": {safe_window_bar, upper_bound_by, lower_bound_by,
                          observed_head_pressure_bar, ratings_bar, violations},
             "flow": {items:[{component,rating_m3h,load_m3h,margin_m3h,scope}], tightest, violations},
             "velocity": {limit_ms, items:[{segment,size_mm,flow_m3h,velocity_ms,scope}],
                          fastest, violations}
          }
        }
    """
    return _hydraulics(adjustments or {}, zone, concurrent_zones)


if __name__ == "__main__":
    mcp.run()
