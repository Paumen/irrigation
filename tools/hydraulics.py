"""Hydraulic calculator for the irrigation system described in setup.yaml.

Computes per-head flow, per-head operating pressure, per-zone flow, the pump
operating point, and a min/max pressure + flow "weakest link" report. Supports
what-if adjustments (swap a nozzle, change a pump, pin an operating pressure,
move the water table) so questions like "what's the flow if I change nozzle
2.5 to 4.0?" can be answered.

Model (full hydraulic solve):
  pump curve  ->  static lift (elevations)  ->  pipe friction (Hazen-Williams)
  + valve/fitting minor losses  ->  pressure at each head  ->  head flow.
The head flow depends on head pressure (for unregulated I-20 rotors) which
depends on total flow, so the zone is solved by fixed-point iteration. MP
Rotators sit on PRS40 bodies (regulated to 40 PSI) so their flow is fixed by
model + arc as long as inlet pressure stays above the regulation threshold.

Usage as a library:
    from tools.hydraulics import report
    r = report(adjustments={"heads": [
        {"zone": 2, "match": {"nozzle": "2.5 blue"}, "set": {"nozzle": "4.0 blue"}}
    ]})

Usage as a CLI:
    python tools/hydraulics.py                 # full report, default assumptions
    echo '{"zone": 2}' | python tools/hydraulics.py
    echo '{"concurrent_zones": [2, 3]}' | python tools/hydraulics.py
    echo '{"adjustments": {"global_operating_pressure_bar": 3.5}}' | python tools/hydraulics.py
"""

from __future__ import annotations

import json
import math
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

import yaml

SETUP_PATH = Path(__file__).resolve().parent.parent / "setup.yaml"

# ---------------------------------------------------------------------------
# Unit conversions
# ---------------------------------------------------------------------------
GPM_TO_M3H = 0.2271247          # 1 US gal/min -> m3/h
M_PER_BAR = 10.197              # metres of water column per bar
PSI_PER_BAR = 14.5038

# ---------------------------------------------------------------------------
# Manufacturer data
# ---------------------------------------------------------------------------
# Hunter MP Rotator flow at 40 PSI (the PRS40 body regulates to 40 PSI), GPM,
# from the Hunter MP Rotator Performance Data chart. MP Rotators are matched
# precipitation, so flow is ~linear in arc; intermediate arcs are interpolated.
MP_FLOW_40PSI_GPM: dict[str, dict[int, float]] = {
    "MP1000": {90: 0.19, 180: 0.37, 210: 0.43, 360: 0.75},
    "MP2000": {90: 0.40, 180: 0.74, 210: 0.86, 270: 1.10, 360: 1.47},
    "MP3000": {90: 0.86, 180: 1.82, 210: 2.12, 270: 2.73, 360: 3.64},
}
MP_REG_BAR = 40.0 / PSI_PER_BAR          # 40 PSI -> ~2.76 bar regulated nozzle pressure
MP_REG_MIN_INLET_BAR = 2.9               # inlet needed for the regulator to hold 40 PSI

# Hunter PGP / I-20 Blue Standard Nozzle, metric performance chart, flow in
# m3/h at the listed nozzle pressure (bar). I-20 rotors are NOT regulated, so
# flow tracks head pressure. Flow is independent of the set arc.
I20_PRESSURES_BAR = [1.7, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5]
I20_BLUE_M3H: dict[str, list[float]] = {
    "1.5": [0.27, 0.29, 0.32, 0.35, 0.38, 0.41, 0.43],
    "2.0": [0.32, 0.35, 0.39, 0.43, 0.47, 0.50, 0.53],
    "2.5": [0.39, 0.43, 0.48, 0.54, 0.58, 0.62, 0.66],
    "3.0": [0.50, 0.54, 0.61, 0.68, 0.74, 0.79, 0.84],
    "4.0": [0.68, 0.73, 0.81, 0.90, 0.97, 1.04, 1.10],
    "5.0": [0.84, 0.91, 1.02, 1.14, 1.24, 1.32, 1.41],
    "6.0": [1.01, 1.09, 1.22, 1.36, 1.47, 1.57, 1.67],
    "8.0": [1.35, 1.46, 1.63, 1.81, 1.95, 2.09, 2.22],
}
I20_OP_RANGE_BAR = (1.7, 4.5)

# DAB Jet single-phase pump curves: total head (m) vs flow (m3/h), from the DAB
# Jet selection table. setup.yaml lists a generic "DAB Jet" at 4.8 bar shutoff,
# which matches the JET 132 M (48.3 m shutoff); used as the default.
PUMP_CURVES: dict[str, dict[str, list[float]]] = {
    "JET 62 M": {"q": [0, 0.6, 1.2, 1.8, 2.4, 3.0], "h": [42, 35, 29.2, 25.6, 22.9, 21.1]},
    "JET 82 M": {"q": [0, 0.6, 1.2, 1.8, 2.4, 3.0, 3.6], "h": [47, 40, 34, 30, 26.2, 23.5, 20.3]},
    "JET 92 M": {"q": [0, 0.6, 1.2, 1.8, 2.4, 3.0, 3.6, 4.2, 4.8],
                 "h": [36.2, 33.5, 31, 28.4, 26, 24, 21.8, 19.6, 17]},
    "JET 102 M": {"q": [0, 0.6, 1.2, 1.8, 2.4, 3.0, 3.6], "h": [53.8, 47, 41, 36.3, 32.4, 28.8, 25.8]},
    "JET 112 M": {"q": [0, 0.6, 1.2, 1.8, 2.4, 3.0, 3.6], "h": [61, 54, 47.8, 42.8, 38.8, 34.8, 20]},
    "JET 132 M": {"q": [0, 0.6, 1.2, 1.8, 2.4, 3.0, 3.6, 4.2, 4.8],
                  "h": [48.3, 45.6, 42.8, 40, 37.6, 35, 32.5, 30, 27.2]},
}
DEFAULT_PUMP = "JET 132 M"

# ---------------------------------------------------------------------------
# Loss model coefficients (approximate; override via adjustments). These are
# the parts not pinned by published curves, so they are exposed as tunables.
# ---------------------------------------------------------------------------
HW_C = 150.0            # Hazen-Williams roughness, smooth PE pipe
VALVE_CV = 7.0          # Hunter PGV-101G ~1" valve, approximate flow coefficient
SJ_LOSS_BAR = 0.05      # swing joint + riser + adapter minor loss, per head
SUCTION_EXTRA_LOSS_M = 1.0   # foot valve + suction-line friction allowance


# ---------------------------------------------------------------------------
# Numerics
# ---------------------------------------------------------------------------
def _interp(x: float, xs: list[float], ys: list[float]) -> float:
    """Linear interpolation with flat clamping outside the table."""
    if x <= xs[0]:
        return ys[0]
    if x >= xs[-1]:
        return ys[-1]
    for i in range(1, len(xs)):
        if x <= xs[i]:
            t = (x - xs[i - 1]) / (xs[i] - xs[i - 1])
            return ys[i - 1] + t * (ys[i] - ys[i - 1])
    return ys[-1]


def hazen_williams_m(q_m3h: float, d_m: float, length_m: float, c: float = HW_C) -> float:
    """Head loss (m) for flow q_m3h through a pipe of inner diameter d_m."""
    if q_m3h <= 0 or length_m <= 0:
        return 0.0
    q = q_m3h / 3600.0  # m3/s
    return 10.67 * length_m * (q ** 1.852) / ((c ** 1.852) * (d_m ** 4.87))


def valve_loss_bar(q_m3h: float, cv: float = VALVE_CV) -> float:
    """Minor pressure loss (bar) across the zone valve from its flow coefficient."""
    if q_m3h <= 0:
        return 0.0
    gpm = q_m3h / GPM_TO_M3H
    return ((gpm / cv) ** 2) / PSI_PER_BAR


def pump_head_m(model: str, q_m3h: float) -> float:
    """Pump total dynamic head (m) at flow q_m3h, linearly inter/extrapolated."""
    curve = PUMP_CURVES[model]
    qs, hs = curve["q"], curve["h"]
    if q_m3h <= qs[0]:
        return hs[0]
    if q_m3h >= qs[-1]:
        # extrapolate along the last segment, never below zero
        slope = (hs[-1] - hs[-2]) / (qs[-1] - qs[-2])
        return max(0.0, hs[-1] + slope * (q_m3h - qs[-1]))
    return _interp(q_m3h, qs, hs)


# ---------------------------------------------------------------------------
# Head flow models
# ---------------------------------------------------------------------------
def i20_flow_m3h(nozzle_num: str, pressure_bar: float) -> tuple[float, bool]:
    """I-20 flow (m3/h) for a blue nozzle number at the given head pressure.

    Returns (flow, in_range). Outside the published 1.7-4.5 bar window the
    flow is extrapolated with the orifice relation q ~ sqrt(P) and flagged.
    """
    if nozzle_num not in I20_BLUE_M3H:
        raise ValueError(f"unknown I-20 blue nozzle {nozzle_num!r}; "
                         f"known: {sorted(I20_BLUE_M3H)}")
    table = I20_BLUE_M3H[nozzle_num]
    lo, hi = I20_OP_RANGE_BAR
    if pressure_bar < lo:
        return table[0] * math.sqrt(max(pressure_bar, 0.0) / lo), False
    if pressure_bar > hi:
        return table[-1] * math.sqrt(pressure_bar / hi), False
    return _interp(pressure_bar, I20_PRESSURES_BAR, table), True


def _mp_arc_flow_gpm(model: str, arc_deg: float) -> float:
    arcs = sorted(MP_FLOW_40PSI_GPM[model])
    return _interp(arc_deg, arcs, [MP_FLOW_40PSI_GPM[model][a] for a in arcs])


def mp_flow_m3h(model: str, arc_deg: float, inlet_bar: float) -> tuple[float, bool]:
    """MP Rotator flow (m3/h). Regulated to the 40 PSI value while inlet is
    above the regulation threshold; below it the regulator cannot hold and
    flow falls off (orifice approximation), which is flagged.

    Returns (flow, regulated).
    """
    if model not in MP_FLOW_40PSI_GPM:
        raise ValueError(f"unknown MP model {model!r}; known: {sorted(MP_FLOW_40PSI_GPM)}")
    base = _mp_arc_flow_gpm(model, arc_deg) * GPM_TO_M3H
    if inlet_bar >= MP_REG_MIN_INLET_BAR:
        return base, True
    nozzle_bar = max(min(inlet_bar, MP_REG_BAR), 0.0)
    return base * math.sqrt(nozzle_bar / MP_REG_BAR), False


# ---------------------------------------------------------------------------
# setup.yaml parsing
# ---------------------------------------------------------------------------
def _pipe_id_m(size_mm: float, material: str) -> float:
    """Inner diameter (m) from nominal OD and the wall thickness in the
    material string (e.g. 'Polyethylene LDPE 3mm')."""
    wall = 0.0
    for token in str(material).replace("mm", " mm").split():
        try:
            wall = float(token)
            break
        except ValueError:
            continue
    return (size_mm - 2 * wall) / 1000.0


def _flatten_heads(layout: Any, path: str = "") -> list[dict]:
    """Walk a lateral_layout tree and return its leaf heads with a path key."""
    heads: list[dict] = []
    if not isinstance(layout, dict):
        return heads
    for key, val in layout.items():
        sub = f"{path}/{key}" if path else key
        if isinstance(val, dict) and "head" in val:
            heads.append({"loc": sub, **val})
        elif isinstance(val, dict):
            heads.extend(_flatten_heads(val, sub))
    return heads


def load_system(path: Path = SETUP_PATH) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


# ---------------------------------------------------------------------------
# Adjustments
# ---------------------------------------------------------------------------
def _resolve_pump(sys_data: dict, adj: dict) -> str:
    if adj.get("pump_model"):
        if adj["pump_model"] not in PUMP_CURVES:
            raise ValueError(f"unknown pump {adj['pump_model']!r}; known: {sorted(PUMP_CURVES)}")
        return adj["pump_model"]
    rated_bar = sys_data["equipment"]["pump"].get("pressure_rating_bar")
    if rated_bar:
        target_m = rated_bar * M_PER_BAR
        return min(PUMP_CURVES, key=lambda m: abs(PUMP_CURVES[m]["h"][0] - target_m))
    return DEFAULT_PUMP


def _apply_head_adjustments(zone_id: int, heads: list[dict], adj: dict) -> list[str]:
    """Mutate `heads` per the adjustments list; return human-readable notes."""
    notes: list[str] = []
    for rule in adj.get("heads", []):
        if rule.get("zone") != zone_id:
            continue
        targets = []
        if "index" in rule:
            if 0 <= rule["index"] < len(heads):
                targets = [heads[rule["index"]]]
        elif "loc" in rule:
            targets = [h for h in heads if h["loc"] == rule["loc"]]
        elif "match" in rule:
            targets = [h for h in heads
                       if all(str(h.get(k)) == str(v) for k, v in rule["match"].items())]
        else:
            targets = heads
        for h in targets:
            before = dict(h)
            h.update(rule.get("set", {}))
            changed = {k: (before.get(k), h.get(k)) for k in rule.get("set", {})}
            notes.append(f"zone {zone_id} {h['loc']}: " +
                         ", ".join(f"{k} {a}->{b}" for k, (a, b) in changed.items()))
    return notes


# ---------------------------------------------------------------------------
# Solver
# ---------------------------------------------------------------------------
def _nozzle_num(head: dict) -> str:
    # "4.0 blue" -> "4.0"
    return str(head.get("nozzle", "")).split()[0] if head.get("nozzle") else ""


def _seed_flows(heads: list[dict]) -> None:
    """Seed each head with a starting flow guess for the fixed-point iteration."""
    for h in heads:
        if h["head"] == "I-20":
            h["q"], _ = i20_flow_m3h(_nozzle_num(h), 3.0)
        else:
            h["q"], _ = mp_flow_m3h(h["head"], float(h.get("arc_deg", 180)), MP_REG_BAR)


def _head_flow_at(h: dict, p_bar: float) -> float:
    """Record a head's pressure/regulation state at p_bar; return its flow (m3/h)."""
    if h["head"] == "I-20":
        q_new, in_range = i20_flow_m3h(_nozzle_num(h), p_bar)
        h["regulated"] = None
        h["in_range"] = in_range
    else:
        q_new, reg = mp_flow_m3h(h["head"], float(h.get("arc_deg", 180)), p_bar)
        h["regulated"] = reg
        h["in_range"] = True
    h["pressure_bar"] = round(p_bar, 3)
    return q_new


def _geometry(sys_data: dict, env: dict) -> dict:
    eq = sys_data["equipment"]
    z_well = env["well_water_level_m_asl"]
    main = sys_data["piping"]["main_line"]
    lat = sys_data["piping"]["zone_laterals"]
    return {
        "z_well": z_well,
        "z_manifold": eq["manifold"].get("height_m", eq["zone_valves"].get("height_m", z_well)),
        "d_main": _pipe_id_m(main["size_mm"], main["material"]),
        "len_main": main.get("length_m", 0.0),
        "d_lat": _pipe_id_m(lat["size_mm"], lat["material"]),
    }


def _build_head_output(heads: list[dict], p_after_valve_m: float | None,
                       g: dict, env: dict) -> tuple[list[dict], list[str]]:
    """Render heads to output dicts plus flags. When an after-valve pressure is
    known (full solve, not pinned mode) each head also gets a pressure-loss
    breakdown that reconciles head pressure = after_valve - the listed losses."""
    z_manifold = g["z_manifold"]
    head_out: list[dict] = []
    flags: list[str] = []
    for h in heads:
        spec = h.get("nozzle") if h["head"] == "I-20" else f"{h['head']}@{h.get('arc_deg')}"
        item = {
            "loc": h["loc"],
            "kind": h["head"],
            "spec": spec,
            "arc_deg": h.get("arc_deg"),
            "elevation_m": h.get("height_m"),
            "lateral_m": h.get("length_m"),
            "flow_m3h": round(h["q"], 3),
            "pressure_bar": h.get("pressure_bar"),
        }
        if p_after_valve_m is not None:
            rise_m = h.get("height_m", z_manifold) - z_manifold
            fric_m = hazen_williams_m(h["q"], g["d_lat"], h.get("length_m", 0.0))
            item["loss_breakdown_bar"] = {
                "elevation_rise": round(rise_m / M_PER_BAR, 3),
                "lateral_friction": round(fric_m / M_PER_BAR, 3),
                "swing_joint": round(env["sj_loss_bar"], 3),
            }
        if h["head"] == "I-20" and not h.get("in_range", True):
            flags.append(f"{h['loc']} I-20 pressure {h.get('pressure_bar')} bar outside 1.7-4.5 bar")
        if h["head"] != "I-20" and h.get("regulated") is False:
            flags.append(f"{h['loc']} {h['head']} under-regulated "
                         f"(inlet {h.get('pressure_bar')} bar < {MP_REG_MIN_INLET_BAR} bar)")
        head_out.append(item)
    return head_out, flags


def solve_zone(zone: dict, sys_data: dict, env: dict) -> dict:
    g = _geometry(sys_data, env)
    z_well, z_manifold = g["z_well"], g["z_manifold"]
    pinned = env.get("global_operating_pressure_bar")
    pump = env["pump_model"]

    heads = deepcopy(_flatten_heads(zone.get("lateral_layout", {})))
    notes = _apply_head_adjustments(zone["id"], heads, env["adjustments"])
    _seed_flows(heads)

    p_after_valve = 0.0
    for _ in range(200):
        q_zone = sum(h["q"] for h in heads)
        if pinned is None:
            head_pump = pump_head_m(pump, q_zone)
            p_manifold = head_pump - (z_manifold - z_well) \
                - hazen_williams_m(q_zone, g["d_main"], g["len_main"]) - env["suction_extra_loss_m"]
            p_after_valve = p_manifold - valve_loss_bar(q_zone, env["valve_cv"]) * M_PER_BAR
        max_delta = 0.0
        for h in heads:
            if pinned is not None:
                p_bar = pinned
            else:
                p_head_m = p_after_valve - (h.get("height_m", z_manifold) - z_manifold) \
                    - hazen_williams_m(h["q"], g["d_lat"], h.get("length_m", 0.0)) \
                    - env["sj_loss_bar"] * M_PER_BAR
                p_bar = max(p_head_m, 0.0) / M_PER_BAR
            q_new = _head_flow_at(h, p_bar)
            relaxed = 0.5 * h["q"] + 0.5 * q_new
            max_delta = max(max_delta, abs(relaxed - h["q"]))
            h["q"] = relaxed
        if pinned is not None or max_delta < 1e-6:
            break

    q_zone = sum(h["q"] for h in heads)
    if pinned is None:
        head_pump = pump_head_m(pump, q_zone)
        main_fric_m = hazen_williams_m(q_zone, g["d_main"], g["len_main"])
        p_manifold = head_pump - (z_manifold - z_well) - main_fric_m - env["suction_extra_loss_m"]
        valve_bar = valve_loss_bar(q_zone, env["valve_cv"])
        p_after_valve = p_manifold - valve_bar * M_PER_BAR
        pump_pt = {"flow_m3h": round(q_zone, 3), "head_m": round(head_pump, 2),
                   "head_bar": round(head_pump / M_PER_BAR, 3)}
        node_pressures = {
            "pump_discharge": round(head_pump / M_PER_BAR, 3),
            "manifold_inlet": round(p_manifold / M_PER_BAR, 3),
            "after_valve": round(p_after_valve / M_PER_BAR, 3),
        }
        shared_losses = {
            "static_lift": round((z_manifold - z_well) / M_PER_BAR, 3),
            "main_line_friction": round(main_fric_m / M_PER_BAR, 3),
            "suction": round(env["suction_extra_loss_m"] / M_PER_BAR, 3),
            "zone_valve": round(valve_bar, 3),
        }
        head_out, flags = _build_head_output(heads, p_after_valve, g, env)
    else:
        pump_pt = node_pressures = shared_losses = None
        head_out, flags = _build_head_output(heads, None, g, env)

    pressures = [h["pressure_bar"] for h in heads]
    return {
        "id": zone["id"],
        "flow_m3h": round(q_zone, 3),
        "pump": pump_pt,
        "head_pressure_bar": {"min": min(pressures), "max": max(pressures)} if pressures else None,
        "node_pressures_bar": node_pressures,
        "loss_breakdown_bar": shared_losses,
        "heads": head_out,
        "flags": flags,
        "adjustments_applied": notes,
    }


def solve_concurrent(zones_in: list[dict], sys_data: dict, env: dict) -> dict:
    """Solve several zones running simultaneously. The pump and main line carry
    the combined flow (shared); each zone's valve and laterals carry only its
    own share. Coupled because every head's flow depends on the shared manifold
    pressure, which depends on the combined flow. Pinned-pressure mode does not
    apply here and is ignored."""
    g = _geometry(sys_data, env)
    z_well, z_manifold = g["z_well"], g["z_manifold"]
    pump = env["pump_model"]

    groups = []
    for z in zones_in:
        heads = deepcopy(_flatten_heads(z.get("lateral_layout", {})))
        notes = _apply_head_adjustments(z["id"], heads, env["adjustments"])
        _seed_flows(heads)
        groups.append({"id": z["id"], "heads": heads, "notes": notes})

    head_pump = p_manifold = 0.0
    for _ in range(500):
        q_total = sum(h["q"] for grp in groups for h in grp["heads"])
        head_pump = pump_head_m(pump, q_total)
        p_manifold = head_pump - (z_manifold - z_well) \
            - hazen_williams_m(q_total, g["d_main"], g["len_main"]) - env["suction_extra_loss_m"]
        max_delta = 0.0
        for grp in groups:
            q_zone = sum(h["q"] for h in grp["heads"])
            p_av = p_manifold - valve_loss_bar(q_zone, env["valve_cv"]) * M_PER_BAR
            for h in grp["heads"]:
                p_head_m = p_av - (h.get("height_m", z_manifold) - z_manifold) \
                    - hazen_williams_m(h["q"], g["d_lat"], h.get("length_m", 0.0)) \
                    - env["sj_loss_bar"] * M_PER_BAR
                q_new = _head_flow_at(h, max(p_head_m, 0.0) / M_PER_BAR)
                relaxed = 0.5 * h["q"] + 0.5 * q_new
                max_delta = max(max_delta, abs(relaxed - h["q"]))
                h["q"] = relaxed
        if max_delta < 1e-6:
            break

    q_total = sum(h["q"] for grp in groups for h in grp["heads"])
    head_pump = pump_head_m(pump, q_total)
    main_fric_m = hazen_williams_m(q_total, g["d_main"], g["len_main"])
    p_manifold = head_pump - (z_manifold - z_well) - main_fric_m - env["suction_extra_loss_m"]

    zones_out = []
    for grp in groups:
        q_zone = sum(h["q"] for h in grp["heads"])
        valve_bar = valve_loss_bar(q_zone, env["valve_cv"])
        p_av = p_manifold - valve_bar * M_PER_BAR
        head_out, flags = _build_head_output(grp["heads"], p_av, g, env)
        pressures = [h["pressure_bar"] for h in grp["heads"]]
        zones_out.append({
            "id": grp["id"],
            "flow_m3h": round(q_zone, 3),
            "pump": None,
            "head_pressure_bar": {"min": min(pressures), "max": max(pressures)} if pressures else None,
            "node_pressures_bar": {
                "pump_discharge": round(head_pump / M_PER_BAR, 3),
                "manifold_inlet": round(p_manifold / M_PER_BAR, 3),
                "after_valve": round(p_av / M_PER_BAR, 3),
            },
            "loss_breakdown_bar": {"zone_valve": round(valve_bar, 3)},
            "heads": head_out,
            "flags": flags,
            "adjustments_applied": grp["notes"],
        })

    return {
        "zones_running": [grp["id"] for grp in groups],
        "combined_flow_m3h": round(q_total, 3),
        "pump": {"flow_m3h": round(q_total, 3), "head_m": round(head_pump, 2),
                 "head_bar": round(head_pump / M_PER_BAR, 3)},
        "manifold_inlet_bar": round(p_manifold / M_PER_BAR, 3),
        "shared_losses_bar": {
            "static_lift": round((z_manifold - z_well) / M_PER_BAR, 3),
            "main_line_friction": round(main_fric_m / M_PER_BAR, 3),
            "suction": round(env["suction_extra_loss_m"] / M_PER_BAR, 3),
        },
        "zones": zones_out,
    }


# ---------------------------------------------------------------------------
# Ratings / weakest links
# ---------------------------------------------------------------------------
def weakest_links(sys_data: dict, zones: list[dict], env: dict,
                  pump_manifold_load: float | None = None) -> dict:
    eq = sys_data["equipment"]
    pipe = sys_data["piping"]
    max_zone_flow = max((z["flow_m3h"] for z in zones), default=0.0)
    # The pump and main line carry the combined flow when zones run together;
    # otherwise (one zone at a time) the heaviest single zone is the load.
    pm_load = pump_manifold_load if pump_manifold_load is not None else max_zone_flow
    pm_scope = "all running zones" if pump_manifold_load is not None else "per zone"
    # peak flow per swing-joint type (one head per joint)
    rotor_peak = max((h["flow_m3h"] for z in zones for h in z["heads"] if h["kind"] == "I-20"),
                     default=0.0)
    mp_peak = max((h["flow_m3h"] for z in zones for h in z["heads"] if h["kind"] != "I-20"),
                  default=0.0)

    # --- pressure window ---
    max_ratings = {
        "pump (max deliverable)": eq["pump"].get("pressure_rating_bar"),
        "main_line": pipe["main_line"].get("pressure_rating_bar"),
        "zone_laterals": pipe["zone_laterals"].get("pressure_rating_bar"),
        "manifold": eq["manifold"].get("pressure_rating_bar"),
        "zone_valves": eq["zone_valves"].get("max_pressure_bar"),
        "swing_joints_rotor": eq["swing_joints_rotor"].get("pressure_rating_bar"),
        "swing_joints_mp": eq["swing_joints_mp"].get("pressure_rating_bar"),
    }
    max_ratings = {k: v for k, v in max_ratings.items() if v is not None}
    min_ratings = {
        "zone_valves": eq["zone_valves"].get("min_pressure_bar"),
        "I-20 heads": I20_OP_RANGE_BAR[0],
        "MP regulation": MP_REG_MIN_INLET_BAR,
    }
    min_ratings = {k: v for k, v in min_ratings.items() if v is not None}
    upper_by = min(max_ratings, key=max_ratings.get)
    lower_by = max(min_ratings, key=min_ratings.get)

    all_head_pressures = [h["pressure_bar"] for z in zones for h in z["heads"]
                          if h["pressure_bar"] is not None]
    pressure_violations = []
    for name, lim in max_ratings.items():
        if all_head_pressures and max(all_head_pressures) > lim:
            pressure_violations.append(f"head pressure {max(all_head_pressures)} bar exceeds {name} {lim} bar")
    for z in zones:
        for h in z["heads"]:
            if h["pressure_bar"] is not None and h["pressure_bar"] < eq["zone_valves"].get("min_pressure_bar", 0):
                pressure_violations.append(
                    f"zone {z['id']} {h['loc']} {h['pressure_bar']} bar below valve min "
                    f"{eq['zone_valves']['min_pressure_bar']} bar")

    # --- flow series path ---
    flow_items = [
        {"component": "pump", "rating_m3h": eq["pump"].get("flow_rating_m3h"),
         "load_m3h": round(pm_load, 3), "scope": pm_scope},
        {"component": "manifold", "rating_m3h": eq["manifold"].get("flow_rating_m3h"),
         "load_m3h": round(pm_load, 3), "scope": pm_scope},
        {"component": "zone_valves", "rating_m3h": eq["zone_valves"].get("max_flow_m3h"),
         "load_m3h": round(max_zone_flow, 3), "scope": "per zone"},
        {"component": "swing_joints_rotor", "rating_m3h": eq["swing_joints_rotor"].get("flow_rating_m3h"),
         "load_m3h": round(rotor_peak, 3), "scope": "per head"},
        {"component": "swing_joints_mp", "rating_m3h": eq["swing_joints_mp"].get("flow_rating_m3h"),
         "load_m3h": round(mp_peak, 3), "scope": "per head"},
    ]
    for it in flow_items:
        if it["rating_m3h"]:
            it["margin_m3h"] = round(it["rating_m3h"] - it["load_m3h"], 3)
    rated = [it for it in flow_items if it.get("rating_m3h")]
    rated.sort(key=lambda it: it["margin_m3h"])
    flow_violations = [f"{it['component']} load {it['load_m3h']} > rating {it['rating_m3h']} m3/h"
                       for it in rated if it["margin_m3h"] < 0]

    return {
        "pressure": {
            "safe_window_bar": [round(max(min_ratings.values()), 2),
                                round(min(max_ratings.values()), 2)],
            "upper_bound_by": f"{upper_by} ({max_ratings[upper_by]} bar)",
            "lower_bound_by": f"{lower_by} ({min_ratings[lower_by]} bar)",
            "observed_head_pressure_bar": (
                [round(min(all_head_pressures), 3), round(max(all_head_pressures), 3)]
                if all_head_pressures else None),
            "ratings_bar": {"min": min_ratings, "max": max_ratings},
            "violations": pressure_violations,
        },
        "flow": {
            "items": flow_items,
            "tightest": rated[0] if rated else None,
            "violations": flow_violations,
        },
    }


# ---------------------------------------------------------------------------
# Top-level report
# ---------------------------------------------------------------------------
def _assumptions(pump_model: str, env: dict, mode: str, extra: dict | None = None) -> dict:
    a = {
        "mode": mode,
        "pump_model": pump_model,
        "well_water_level_m_asl": env["well_water_level_m_asl"],
        "valve_cv": env["valve_cv"],
        "sj_loss_bar": env["sj_loss_bar"],
        "suction_extra_loss_m": env["suction_extra_loss_m"],
        "hazen_williams_C": HW_C,
        "mp_regulated_bar": round(MP_REG_BAR, 3),
        "note": ("I-20 flow tracks head pressure (Hunter Blue nozzle chart); "
                 "MP Rotators are 40 PSI regulated (Hunter MP chart). Loss "
                 "coefficients are approximate and overridable."),
    }
    if extra:
        a.update(extra)
    return a


def report(adjustments: dict | None = None, zone: int | None = None,
           concurrent_zones: list[int] | None = None, path: Path = SETUP_PATH) -> dict:
    """Run the full hydraulic solve and weakest-link analysis.

    Args:
        adjustments: optional what-if overrides:
            pump_model: str                    swap the pump curve
            well_water_level_m_asl: float      water table elevation (default = pump elevation)
            global_operating_pressure_bar: float  pin every head to this pressure (skip the
                                               pump/friction solve) to answer "what if the
                                               pressure were X bar?"
            valve_cv, sj_loss_bar, suction_extra_loss_m: tune the loss model
            heads: list of head edits, each {zone, (index|loc|match), set}, e.g.
                {"zone": 2, "match": {"nozzle": "2.5 blue"}, "set": {"nozzle": "4.0 blue"}}
        zone: restrict the solve to one zone id (one zone at a time).
        concurrent_zones: list of zone ids to run simultaneously. The pump and
            main line then carry the combined flow while each zone keeps its own
            valve and laterals. Takes precedence over `zone`; ignores pinned mode.

    Returns a dict with assumptions, per-zone results, and weakest_links. Each
    zone carries a node_pressures_bar profile (pump -> manifold -> after valve)
    and per-head loss_breakdown_bar. In concurrent mode a top-level `concurrent`
    block reports the shared operating point.
    """
    adjustments = adjustments or {}
    sys_data = load_system(path)
    pump_model = _resolve_pump(sys_data, adjustments)
    env = {
        "adjustments": adjustments,
        "pump_model": pump_model,
        "well_water_level_m_asl": adjustments.get(
            "well_water_level_m_asl", sys_data["equipment"]["pump"].get("height_m", 0.0)),
        "valve_cv": adjustments.get("valve_cv", VALVE_CV),
        "sj_loss_bar": adjustments.get("sj_loss_bar", SJ_LOSS_BAR),
        "suction_extra_loss_m": adjustments.get("suction_extra_loss_m", SUCTION_EXTRA_LOSS_M),
        "global_operating_pressure_bar": adjustments.get("global_operating_pressure_bar"),
    }

    if concurrent_zones:
        known = {z["id"] for z in sys_data["zones"]}
        unknown = [i for i in concurrent_zones if i not in known]
        if unknown:
            raise ValueError(f"unknown zone id(s) {unknown}; known: {sorted(known)}")
        zones_in = [z for z in sys_data["zones"] if z["id"] in concurrent_zones]
        con = solve_concurrent(zones_in, sys_data, env)
        return {
            "assumptions": _assumptions(pump_model, env, "concurrent",
                                        {"concurrent_zones": con["zones_running"]}),
            "concurrent": {k: con[k] for k in
                           ("zones_running", "combined_flow_m3h", "pump",
                            "manifold_inlet_bar", "shared_losses_bar")},
            "zones": con["zones"],
            "weakest_links": weakest_links(sys_data, con["zones"], env,
                                           pump_manifold_load=con["combined_flow_m3h"]),
        }

    mode = "pinned-pressure" if env["global_operating_pressure_bar"] else "full-solve"
    zones_in = [z for z in sys_data["zones"] if zone is None or z["id"] == zone]
    zones = [solve_zone(z, sys_data, env) for z in zones_in]
    return {
        "assumptions": _assumptions(pump_model, env, mode),
        "zones": zones,
        "weakest_links": weakest_links(sys_data, zones, env),
    }


def main() -> None:
    raw = sys.stdin.read().strip() if not sys.stdin.isatty() else ""
    payload = json.loads(raw) if raw else {}
    result = report(payload.get("adjustments"), payload.get("zone"),
                    payload.get("concurrent_zones"))
    json.dump(result, sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
