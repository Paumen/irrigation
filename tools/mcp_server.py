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
    settings: dict[str, str] | None = None,
    concurrent_zones: list[int] | None = None,
    pump_on: bool | None = None,
) -> dict:
    """Predict what the system does under a fault set, from graph.yaml.

    Unlike irrigation_hydraulics (a healthy-system calculator), this runs a
    fault simulation: it energises the controller circuit, resolves each valve's
    pilot loop, then solves the coupled hydraulics so a fault on one branch
    (leak, stuck-open valve) draws the shared supply down and can weaken *other*
    zones. Returns per-head behaviour (full / weak / won't-pop / dead), where
    water leaks, each coil energised or not, and whether the pump is running.

    Args:
        commanded_zones: CONTROLLER stations the schedule is calling (Z1-Z4,
            automatic solenoid valves). Z5 is a manual valve -- it is not
            commanded; run it via settings ({"Z5.valve.handle": "open"}).
        conditions: {node_id: "broken"|"clogged"|"misconfigured"} fault set.
            Node ids are graph.yaml sub-parts, e.g. "Z1.valve.metering_port",
            "cond.common", "Z1.hose1", "Z4.head1.regulator". A condition must be
            in that node's allowed fail axis (validated; an error lists the
            allowed set).
        settings: {node_id: op} deliberate manual operations (NOT faults), e.g.
            {"Z5.valve.handle": "open"} (manual valve), {"Z1.valve.bleed_screw":
            "open"} or {"Z1.valve.coil": "bleed"} (manually open a solenoid valve
            without power), {"Z2.valve.flow_control": "shut"/"throttled"} (valve
            flow-control stem), {"Z1.head2.flow_control": "shut"} (close one
            rotor head). Each must be in that part's op axis.
        concurrent_zones: which commanded zones run simultaneously (shared
            pump/main). Defaults to all commanded zones.
        pump_on: drive the pump/master-valve output explicitly. None (default) =
            it follows the schedule (runs when a zone is called); True = run the
            pump even with every valve shut (dead-head / pump test); False = hold
            the pump off while a zone is called.
    """
    return _simulate(commanded_zones or [], conditions or {}, settings or {},
                     concurrent_zones, pump_on)


if __name__ == "__main__":
    mcp.run()
