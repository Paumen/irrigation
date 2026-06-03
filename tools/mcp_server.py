from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent))

from mcp.server.fastmcp import FastMCP

from diagnose import diagnose as _diagnose
from hydraulics import report as _hydraulics
from simulate import simulate as _simulate

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


@mcp.tool()
def simulate_irrigation(
    commanded_zones: list[int] | None = None,
    conditions: dict[str, str] | None = None,
    concurrent_zones: list[int] | None = None,
) -> dict:
    """Predict what the system does under a fault set, from graph.yaml.

    Unlike irrigation_hydraulics (a healthy-system calculator), this runs a
    fault simulation: it energises the controller circuit, resolves each valve's
    pilot loop, then solves the coupled hydraulics so a fault on one branch
    (leak, stuck-open valve) draws the shared supply down and can weaken *other*
    zones. Returns per-head behaviour (full / weak / won't-pop / dead), where
    water leaks, each coil energised or not, and whether the pump is running.

    Args:
        commanded_zones: zone ids (1-5) the controller is told to run. Z1-Z4 are
            automatic (solenoid); Z5 is the manual line.
        conditions: {node_id: "broken"|"clogged"|"misconfigured"} fault set.
            Node ids are graph.yaml sub-parts, e.g. "Z1.valve.metering_port",
            "cond.common", "Z1.hose1", "Z4.head1.regulator". A condition must be
            in that node's allowed fail axis (validated; an error lists the
            allowed set).
        concurrent_zones: which commanded zones run simultaneously (shared
            pump/main). Defaults to all commanded zones.
    """
    return _simulate(commanded_zones or [], conditions or {}, concurrent_zones)


if __name__ == "__main__":
    mcp.run()
