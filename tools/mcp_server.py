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


@mcp.tool()
def irrigation_hydraulics(
    adjustments: dict[str, Any] | None = None,
    zone: int | None = None,
    concurrent_zones: list[int] | None = None,
) -> dict:
    """Compute flows, head pressures and weakest links for setup.yaml.

    Args:
        adjustments: optional what-if overrides:
            heads: list of {zone, set, and one of index|loc|match}. `loc` is a
                node id ("Z1.nozzle.rotor.01"); `match` matches nozzle-leaf
                fields; `index` indexes the zone's heads in physical order.
            global_operating_pressure_bar: pin every head to this pressure and
                skip the pump/friction solve.
            pump_model: swap the pump curve (e.g. "JET 112 M").
            well_water_level_m_asl: water-table elevation (default = pump elevation).
            valve_cv, sj_loss_bar, suction_extra_loss_m: tune the loss model.
        zone: restrict to a single zone id.
        concurrent_zones: zone ids run simultaneously; pump and main line carry
            the combined flow. Takes precedence over `zone` and ignores
            global_operating_pressure_bar.
    """
    return _hydraulics(adjustments or {}, zone, concurrent_zones)


if __name__ == "__main__":
    mcp.run()
