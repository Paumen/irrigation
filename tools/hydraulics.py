"""Hydraulic calculator for the irrigation system described in setup.yaml.

setup.yaml is a node graph: a `types` catalog plus a `feeds` adjacency list of
nodes named `SCOPE.type.NN` (e.g. `MAIN.pump.well.01`, `Z1.head.rotor.01`,
`Z1.nozzle.rotor.01`). This module walks that graph and computes per-head flow,
per-head operating pressure, per-zone flow, the pump operating point, and a
min/max pressure + flow + velocity "weakest link" report. Supports what-if
adjustments (swap a nozzle, change a pump, pin an operating pressure, move the
water table).

Model (full hydraulic solve):
  pump curve  ->  static lift (per-node elevations)  ->  pipe friction
  (Hazen-Williams, summed per segment, each segment carrying the combined flow
  of the heads below it)  +  valve/swing minor losses  ->  pressure at each
  head  ->  head flow.
The head flow depends on head pressure (for unregulated I-20 rotors and the Z5
open-end stream) which depends on total flow, so each solve is a fixed-point
iteration on a tree. MP Rotators sit on PRS40 bodies (regulated to 40 PSI) so
their flow is fixed by model + arc while inlet pressure stays above the
regulation threshold. The manual zone (Z5) ends in an open stream nozzle, which
is modelled as free discharge from the 16 mm bore.

Usage as a library:
    from tools.hydraulics import report
    r = report(adjustments={"heads": [
        {"zone": 2, "match": {"nozzle": "2.5 blue"}, "set": {"nozzle": "4.0 blue"}}
    ]})

Usage as a CLI:
    python tools/hydraulics.py                 # full report, default assumptions
    echo '{"zone": 5}' | python tools/hydraulics.py
    echo '{"concurrent_zones": [2, 3]}' | python tools/hydraulics.py
    echo '{"adjustments": {"global_operating_pressure_bar": 3.5}}' | python tools/hydraulics.py
"""

from __future__ import annotations

import json
import math
import sys
from dataclasses import dataclass, field
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
G = 9.80665                     # gravitational acceleration, m/s^2

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

# Wall thickness (mm) per hose type, from the setup.yaml `desc` strings
# ("32 mm, 3 mm wall" etc.). Nominal OD is the number in the type name.
HOSE_WALL_MM: dict[str, float] = {"hose.32": 3.0, "hose.25": 2.7, "hose.16": 3.0}
STREAM_CD = 0.97        # discharge coefficient for the open-end stream nozzle

# ---------------------------------------------------------------------------
# Loss model coefficients (approximate; override via adjustments). These are
# the parts not pinned by published curves, so they are exposed as tunables.
# ---------------------------------------------------------------------------
HW_C = 150.0            # Hazen-Williams roughness, smooth PE pipe
VALVE_CV = 7.0          # Hunter PGV-101G ~1" valve, approximate flow coefficient
SJ_LOSS_BAR = 0.05      # swing joint + riser + adapter minor loss, per head
SUCTION_EXTRA_LOSS_M = 1.0   # foot valve + suction-line friction allowance

# Design rules-of-thumb used for advisory checks (not solve inputs).
VELOCITY_LIMIT_MS = 1.5         # max pipe velocity before water-hammer/erosion risk
PRESSURE_SPREAD_LIMIT_PCT = 20.0  # max in-zone pressure variation for even coverage

# Fixed-point solver tuning.
MAX_ITERS = 500
SOLVE_TOL = 1e-7
HEAD_RELAX = 0.5        # under-relaxation for chart heads (I-20 / MP)


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
    if q_m3h <= 0 or length_m <= 0 or d_m <= 0:
        return 0.0
    q = q_m3h / 3600.0  # m3/s
    return 10.67 * length_m * (q ** 1.852) / ((c ** 1.852) * (d_m ** 4.87))


def valve_loss_bar(q_m3h: float, cv: float = VALVE_CV) -> float:
    """Minor pressure loss (bar) across the zone valve from its flow coefficient."""
    if q_m3h <= 0:
        return 0.0
    gpm = q_m3h / GPM_TO_M3H
    return ((gpm / cv) ** 2) / PSI_PER_BAR


def velocity_ms(q_m3h: float, d_m: float) -> float:
    """Flow velocity (m/s) for q_m3h through a pipe of inner diameter d_m."""
    if d_m <= 0 or q_m3h <= 0:
        return 0.0
    area = math.pi * (d_m / 2.0) ** 2
    return (q_m3h / 3600.0) / area


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


def free_discharge_m3h(d_inner_m: float, pressure_bar: float, cd: float = STREAM_CD) -> float:
    """Open-end (stream nozzle) flow (m3/h): a free jet from the pipe bore.

    All remaining head converts to exit velocity, so q = Cd * A * sqrt(2 g h)
    with A the pipe cross-section and h the terminal gauge pressure in metres.
    This is what comes out of an open hose with no nozzle restriction.
    """
    h = max(pressure_bar, 0.0) * M_PER_BAR
    area = math.pi * (d_inner_m / 2.0) ** 2
    return cd * area * math.sqrt(2.0 * G * h) * 3600.0


# ---------------------------------------------------------------------------
# Graph model
# ---------------------------------------------------------------------------
@dataclass
class Node:
    id: str
    scope: str               # "MAIN", "Z1" .. "Z6"
    dtype: str               # "head.rotor", "hose.25", "valve.auto", ...
    fields: dict             # type defaults overlaid with per-node fields
    children: list[str] = field(default_factory=list)
    parent: str | None = None

    @property
    def is_nozzle(self) -> bool:
        return self.dtype.startswith("nozzle.")

    @property
    def is_leaf(self) -> bool:
        return self.is_nozzle and not self.children


def parse_id(node_id: str) -> tuple[str, str, str]:
    """`Z1.head.rotor.01` -> ('Z1', 'head.rotor', '01')."""
    parts = node_id.split(".")
    return parts[0], ".".join(parts[1:-1]), parts[-1]


def hose_nominal_mm(dtype: str) -> float:
    """`hose.25` -> 25.0."""
    return float(dtype.split(".", 1)[1])


def hose_inner_d_m(dtype: str) -> float:
    """Inner diameter (m) of a hose type, from its nominal OD and wall table."""
    nom = hose_nominal_mm(dtype)
    wall = HOSE_WALL_MM.get(dtype, 0.0)
    return (nom - 2 * wall) / 1000.0


def load_system(path: Path = SETUP_PATH) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


def build_graph(sys_data: dict) -> dict[str, Node]:
    """Build the node graph from `feeds`, merging in `types` defaults.

    Asserts the graph is a tree (each node has at most one parent) so subtree
    flows and root-to-leaf path walks are well defined.
    """
    types = sys_data.get("types", {})
    feeds = sys_data["feeds"]
    nodes: dict[str, Node] = {}
    for nid, spec in feeds.items():
        spec = spec or {}
        scope, dtype, _ = parse_id(nid)
        merged = {**(types.get(dtype) or {}),
                  **{k: v for k, v in spec.items() if k != "to"}}
        nodes[nid] = Node(id=nid, scope=scope, dtype=dtype, fields=merged,
                          children=list(spec.get("to") or []))
    for nid, n in nodes.items():
        for c in n.children:
            if c not in nodes:
                raise ValueError(f"node {nid!r} feeds unknown node {c!r}")
            if nodes[c].parent is not None:
                raise ValueError(f"node {c!r} has multiple parents "
                                 f"({nodes[c].parent!r} and {nid!r}); graph must be a tree")
            nodes[c].parent = nid
    return nodes


def _compute_heights(nodes: dict[str, Node]) -> dict[str, float]:
    """Effective elevation (m) of every node: its own height_m, else inherited
    from the nearest upstream ancestor that carries one."""
    h: dict[str, float] = {}

    def gh(nid: str) -> float:
        if nid in h:
            return h[nid]
        n = nodes[nid]
        v = n.fields.get("height_m")
        if v is not None:
            h[nid] = float(v)
        elif n.parent is not None:
            h[nid] = gh(n.parent)
        else:
            h[nid] = 0.0
        return h[nid]

    for nid in nodes:
        gh(nid)
    return h


def _find_one(nodes: dict[str, Node], dtype: str) -> Node | None:
    for n in nodes.values():
        if n.dtype == dtype:
            return n
    return None


def _zone_valve(nodes: dict[str, Node], scope: str) -> Node | None:
    for n in nodes.values():
        if n.scope == scope and n.dtype in ("valve.auto", "valve.manual"):
            return n
    return None


def zone_entry(nodes: dict[str, Node], scope: str) -> Node | None:
    """The entry node of a scope: the one whose parent is outside the scope."""
    for n in nodes.values():
        if n.scope == scope and (n.parent is None or nodes[n.parent].scope != scope):
            return n
    return None


def ordered_leaves(nodes: dict[str, Node], scope: str) -> list[Node]:
    """Nozzle leaves of a scope in physical (depth-first, child) order."""
    out: list[Node] = []
    entry = zone_entry(nodes, scope)
    if entry is None:
        return out

    def dfs(nid: str) -> None:
        n = nodes[nid]
        if n.is_leaf:
            out.append(n)
            return
        for c in n.children:
            dfs(c)

    dfs(entry.id)
    return out


def id_to_scope(zone_id: int) -> str:
    return f"Z{zone_id}"


def scope_to_id(scope: str) -> int:
    return int(scope[1:])


def known_zone_ids(nodes: dict[str, Node]) -> set[int]:
    """Zone ids that have at least one nozzle leaf (Z1..Z5; Z6 is capped)."""
    ids = set()
    for n in nodes.values():
        if n.is_leaf and n.scope.startswith("Z"):
            ids.add(scope_to_id(n.scope))
    return ids


# ---------------------------------------------------------------------------
# Adjustments
# ---------------------------------------------------------------------------
def _resolve_pump(sys_data: dict, adj: dict) -> str:
    if adj.get("pump_model"):
        if adj["pump_model"] not in PUMP_CURVES:
            raise ValueError(f"unknown pump {adj['pump_model']!r}; known: {sorted(PUMP_CURVES)}")
        return adj["pump_model"]
    rated_bar = (sys_data.get("types", {}).get("pump.well") or {}).get("max_bar")
    if rated_bar:
        target_m = rated_bar * M_PER_BAR
        return min(PUMP_CURVES, key=lambda m: abs(PUMP_CURVES[m]["h"][0] - target_m))
    return DEFAULT_PUMP


def _apply_head_adjustments(nodes: dict[str, Node], adj: dict) -> dict[str, list[str]]:
    """Mutate matched nozzle leaves per the adjustments list (by node-id `loc`,
    `match` on leaf fields, `index` into the zone's ordered leaves, or the whole
    zone). Returns per-scope human-readable notes."""
    notes: dict[str, list[str]] = {}
    for rule in adj.get("heads", []):
        zid = rule.get("zone")
        scope = id_to_scope(zid) if zid is not None else None
        leaves = ordered_leaves(nodes, scope) if scope else []
        if "index" in rule:
            i = rule["index"]
            targets = [leaves[i]] if 0 <= i < len(leaves) else []
        elif "loc" in rule:
            targets = [lf for lf in leaves if lf.id == rule["loc"]]
        elif "match" in rule:
            targets = [lf for lf in leaves
                       if all(str(lf.fields.get(k)) == str(v) for k, v in rule["match"].items())]
        else:
            targets = leaves
        for lf in targets:
            before = dict(lf.fields)
            lf.fields.update(rule.get("set", {}))
            changed = {k: (before.get(k), lf.fields.get(k)) for k in rule.get("set", {})}
            notes.setdefault(scope, []).append(
                f"zone {zid} {lf.id}: " +
                ", ".join(f"{k} {a}->{b}" for k, (a, b) in changed.items()))
    return notes


# ---------------------------------------------------------------------------
# Leaf (head) flow dispatch
# ---------------------------------------------------------------------------
def _nozzle_num(node: Node) -> str:
    return str(node.fields.get("nozzle", "")).split()[0] if node.fields.get("nozzle") else ""


def leaf_flow_at(node: Node, p_bar: float) -> tuple[float, dict]:
    """Flow (m3/h) and state for a nozzle leaf at inlet pressure p_bar.

    State carries `kind` (for weakest-link grouping and output), `regulated`
    (MP), and `in_range` (I-20).
    """
    dt = node.dtype
    if dt == "nozzle.rotor":            # I-20 rotor, unregulated
        q, in_range = i20_flow_m3h(_nozzle_num(node), p_bar)
        return q, {"kind": "I-20", "regulated": None, "in_range": in_range}
    if dt == "nozzle.rotator":          # MP rotator on a regulated spray body
        model = str(node.fields.get("nozzle"))
        q, reg = mp_flow_m3h(model, float(node.fields.get("arc_deg", 180)), p_bar)
        return q, {"kind": model, "regulated": reg, "in_range": True}
    if dt == "nozzle.stream":           # open-end manual line (Z5)
        d = node.fields.get("_feed_d_m") or hose_inner_d_m("hose.16")
        return free_discharge_m3h(d, p_bar), {"kind": "stream", "regulated": None, "in_range": True}
    raise ValueError(f"unknown nozzle type {dt!r}")


def _seed_flow(node: Node) -> float:
    if node.dtype == "nozzle.rotor":
        return i20_flow_m3h(_nozzle_num(node), 3.0)[0]
    if node.dtype == "nozzle.rotator":
        return mp_flow_m3h(str(node.fields.get("nozzle")),
                           float(node.fields.get("arc_deg", 180)), MP_REG_BAR)[0]
    if node.dtype == "nozzle.stream":
        return 0.3
    return 0.0


# ---------------------------------------------------------------------------
# Tree flow + pressure propagation
# ---------------------------------------------------------------------------
def subtree_flows(nodes: dict[str, Node], leaf_q: dict[str, float]) -> dict[str, float]:
    """Flow through the edge feeding each node = sum of active leaf flows below
    it. Inactive leaves are simply absent from leaf_q (treated as 0)."""
    memo: dict[str, float] = {}

    def f(nid: str) -> float:
        if nid in memo:
            return memo[nid]
        n = nodes[nid]
        v = leaf_q.get(nid, 0.0) if n.is_leaf else sum(f(c) for c in n.children)
        memo[nid] = v
        return v

    for nid in nodes:
        f(nid)
    return memo


def _edge_friction_m(child: Node, q_m3h: float, env: dict) -> float:
    if child.dtype.startswith("hose."):
        return hazen_williams_m(q_m3h, hose_inner_d_m(child.dtype),
                                float(child.fields.get("length_m", 0.0)), env["hw_c"])
    return 0.0


def _edge_minor_m(child: Node, q_m3h: float, env: dict) -> float:
    if child.dtype in ("valve.auto", "valve.manual"):
        return valve_loss_bar(q_m3h, env["valve_cv"]) * M_PER_BAR
    if child.dtype == "fitting.swing":
        return env["sj_loss_bar"] * M_PER_BAR
    return 0.0


def _propagate(nodes: dict[str, Node], start: str, p_head: dict[str, float],
               sub: dict[str, float], heights: dict[str, float], env: dict) -> None:
    """Fill p_head (gauge head, m) for every node downstream of `start`."""
    stack = [start]
    while stack:
        nid = stack.pop()
        for c in nodes[nid].children:
            child = nodes[c]
            loss = ((heights[c] - heights[nid])
                    + _edge_friction_m(child, sub.get(c, 0.0), env)
                    + _edge_minor_m(child, sub.get(c, 0.0), env))
            p_head[c] = p_head[nid] - loss
            stack.append(c)


def _solve_stream_q(leaf: Node, leaf_q: dict[str, float], pressures, nodes: dict[str, Node]) -> float:
    """Exact open-end flow given every other leaf's current flow.

    The free-discharge balance `available head at the leaf == head required to
    push q out the open bore` is monotonic in q (available falls, required
    rises), so a bisection is unconditionally stable — unlike the stiff
    q = f(p) fixed-point, which oscillates. Returns q in m3/h.
    """
    d = leaf.fields.get("_feed_d_m") or hose_inner_d_m("hose.16")
    area = math.pi * (d / 2.0) ** 2

    def resid(q: float) -> float:
        lq = dict(leaf_q)
        lq[leaf.id] = q
        p_head, _, _ = pressures(lq)
        avail_m = max(p_head.get(leaf.id, 0.0), 0.0)
        v_eff = (q / 3600.0) / (STREAM_CD * area) if area > 0 else 0.0
        required_m = v_eff * v_eff / (2.0 * G)
        return avail_m - required_m

    if resid(0.0) <= 0.0:
        return 0.0
    hi = 6.0
    while resid(hi) > 0.0 and hi < 60.0:
        hi *= 1.5
    lo = 0.0
    for _ in range(60):
        mid = 0.5 * (lo + hi)
        if resid(mid) > 0.0:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


def _solve_state(active_scopes: set[str], nodes: dict[str, Node],
                 heights: dict[str, float], env: dict) -> dict:
    """Fixed-point solve for a set of simultaneously-running zones.

    Chart heads (I-20 / MP) use under-relaxed Picard iteration; the open-end
    stream is solved exactly by bisection given the other flows. Returns the
    converged leaf flows, the node pressure-head map (None in pinned mode), the
    pump head, and the per-edge subtree flows.
    """
    pump = env["pump_model"]
    z_well = env["well_water_level_m_asl"]
    pump_node = _find_one(nodes, "pump.well")
    z_pump = heights[pump_node.id]
    pinned = env.get("global_operating_pressure_bar")

    leaves = [n for n in nodes.values() if n.is_leaf and n.scope in active_scopes]
    leaf_q = {lf.id: _seed_flow(lf) for lf in leaves}

    if pinned is not None:
        for lf in leaves:
            leaf_q[lf.id] = leaf_flow_at(lf, pinned)[0]
        return {"leaf_q": leaf_q, "p_head": None, "pump_head_m": None,
                "sub": subtree_flows(nodes, leaf_q), "converged": True}

    def pressures(lq: dict[str, float]) -> tuple[dict[str, float], dict[str, float], float]:
        sub = subtree_flows(nodes, lq)
        head_pump = pump_head_m(pump, sum(lq.values()))
        p_head = {pump_node.id: head_pump - (z_pump - z_well) - env["suction_extra_loss_m"]}
        _propagate(nodes, pump_node.id, p_head, sub, heights, env)
        return p_head, sub, head_pump

    chart = [lf for lf in leaves if lf.dtype != "nozzle.stream"]
    streams = [lf for lf in leaves if lf.dtype == "nozzle.stream"]
    converged = False
    for _ in range(MAX_ITERS):
        p_head, _, _ = pressures(leaf_q)
        max_delta = 0.0
        for lf in chart:
            p_bar = max(p_head.get(lf.id, 0.0), 0.0) / M_PER_BAR
            q_new = leaf_flow_at(lf, p_bar)[0]
            relaxed = (1 - HEAD_RELAX) * leaf_q[lf.id] + HEAD_RELAX * q_new
            max_delta = max(max_delta, abs(relaxed - leaf_q[lf.id]))
            leaf_q[lf.id] = relaxed
        for lf in streams:
            q_new = _solve_stream_q(lf, leaf_q, pressures, nodes)
            max_delta = max(max_delta, abs(q_new - leaf_q[lf.id]))
            leaf_q[lf.id] = q_new
        if max_delta < SOLVE_TOL:
            converged = True
            break

    p_head, sub, head_pump = pressures(leaf_q)
    return {"leaf_q": leaf_q, "p_head": p_head, "pump_head_m": head_pump,
            "sub": sub, "converged": converged}


# ---------------------------------------------------------------------------
# Per-zone result assembly
# ---------------------------------------------------------------------------
def _path_to(nodes: dict[str, Node], leaf_id: str, stop_id: str):
    """Yield each node from leaf up to (excluding) stop_id."""
    nid = leaf_id
    while nid != stop_id and nodes[nid].parent is not None:
        yield nodes[nid]
        nid = nodes[nid].parent


def _pressure_uniformity(zone_id: int, head_out: list[dict]) -> tuple[float | None, list[str]]:
    """In-zone inlet-pressure spread (%) plus a coverage flag. The flag fires
    only on unregulated I-20 rotors, whose output tracks pressure."""
    ps = [h["pressure_bar"] for h in head_out if h.get("pressure_bar")]
    if not ps or max(ps) <= 0:
        return None, []
    spread = round((max(ps) - min(ps)) / max(ps) * 100, 1)
    flags: list[str] = []
    i20 = [h["pressure_bar"] for h in head_out if h["kind"] == "I-20" and h.get("pressure_bar")]
    if len(i20) >= 2 and max(i20) > 0:
        i20_spread = (max(i20) - min(i20)) / max(i20) * 100
        if i20_spread > PRESSURE_SPREAD_LIMIT_PCT:
            flags.append(f"zone {zone_id} unregulated-head pressure spread "
                         f"{i20_spread:.0f}% exceeds {PRESSURE_SPREAD_LIMIT_PCT:.0f}% "
                         f"(uneven coverage)")
    return spread, flags


def _head_output(scope: str, nodes: dict[str, Node], state: dict,
                 heights: dict[str, float], valve_id: str | None, env: dict) -> tuple[list[dict], list[str]]:
    """Render a zone's nozzle leaves to output dicts plus flags. When pressures
    are known (full solve) each head also carries a loss breakdown that
    reconciles head pressure = after_valve - elevation - friction - swing."""
    p_head = state["p_head"]
    sub = state["sub"]
    pinned = env.get("global_operating_pressure_bar")
    head_out: list[dict] = []
    flags: list[str] = []
    for lf in ordered_leaves(nodes, scope):
        q = state["leaf_q"].get(lf.id, 0.0)
        if pinned is not None:
            p_bar = pinned
        else:
            p_bar = round(max(p_head.get(lf.id, 0.0), 0.0) / M_PER_BAR, 3)
        _, st = leaf_flow_at(lf, p_bar)
        kind = st["kind"]
        if lf.dtype == "nozzle.rotor":
            spec = lf.fields.get("nozzle")
        elif lf.dtype == "nozzle.rotator":
            spec = f"{kind}@{lf.fields.get('arc_deg')}"
        else:
            spec = "single stream"
        lateral_m = sum(float(n.fields.get("length_m", 0.0))
                        for n in _path_to(nodes, lf.id, valve_id or lf.id)
                        if n.dtype.startswith("hose."))
        item = {
            "loc": lf.id,
            "kind": kind,
            "spec": spec,
            "arc_deg": lf.fields.get("arc_deg"),
            "elevation_m": lf.fields.get("height_m"),
            "lateral_m": round(lateral_m, 2),
            "flow_m3h": round(q, 3),
            "pressure_bar": p_bar,
        }
        if p_head is not None and valve_id is not None:
            elev = fric = minor = 0.0
            for n in _path_to(nodes, lf.id, valve_id):
                elev += heights[n.id] - heights[nodes[n.id].parent]
                fric += _edge_friction_m(n, sub.get(n.id, 0.0), env)
                minor += _edge_minor_m(n, sub.get(n.id, 0.0), env)
            item["loss_breakdown_bar"] = {
                "elevation_rise": round(elev / M_PER_BAR, 3),
                "lateral_friction": round(fric / M_PER_BAR, 3),
                "swing_joint": round(minor / M_PER_BAR, 3),
            }
        if kind == "I-20" and not st.get("in_range", True):
            flags.append(f"{lf.id} I-20 pressure {p_bar} bar outside 1.7-4.5 bar")
        if lf.dtype == "nozzle.rotator" and st.get("regulated") is False:
            flags.append(f"{lf.id} {kind} under-regulated "
                         f"(inlet {p_bar} bar < {MP_REG_MIN_INLET_BAR} bar)")
        head_out.append(item)
    return head_out, flags


def _zone_dict(scope: str, nodes: dict[str, Node], state: dict,
               heights: dict[str, float], env: dict, notes: list[str],
               with_pump: bool) -> dict:
    """Assemble the per-zone result dict (contract shape)."""
    zone_id = scope_to_id(scope)
    p_head = state["p_head"]
    sub = state["sub"]
    pinned = env.get("global_operating_pressure_bar")
    valve = _zone_valve(nodes, scope)
    valve_id = valve.id if valve else None
    entry = zone_entry(nodes, scope)

    head_out, flags = _head_output(scope, nodes, state, heights, valve_id, env)
    q_zone = sum(state["leaf_q"].get(lf.id, 0.0) for lf in ordered_leaves(nodes, scope))
    pressures = [h["pressure_bar"] for h in head_out]
    spread_pct, uflags = _pressure_uniformity(zone_id, head_out)
    flags = flags + uflags

    pump_pt = node_pressures = loss_breakdown = None
    if p_head is not None:
        manifold = _find_one(nodes, "fitting.manifold")
        head_pump = state["pump_head_m"]
        after_valve = p_head.get(valve_id, p_head.get(entry.id, 0.0)) if (valve_id or entry) else 0.0
        node_pressures = {
            "pump_discharge": round(head_pump / M_PER_BAR, 3),
            "manifold_inlet": round(p_head[manifold.id] / M_PER_BAR, 3),
            "after_valve": round(after_valve / M_PER_BAR, 3),
        }
        main_hose = next((n for n in nodes.values()
                          if n.scope == "MAIN" and n.dtype.startswith("hose.")), None)
        main_fric_m = _edge_friction_m(main_hose, sub.get(main_hose.id, 0.0), env) if main_hose else 0.0
        loss_breakdown = {
            "static_lift": round((heights[manifold.id] - env["well_water_level_m_asl"]) / M_PER_BAR, 3),
            "main_line_friction": round(main_fric_m / M_PER_BAR, 3),
            "suction": round(env["suction_extra_loss_m"] / M_PER_BAR, 3),
            "zone_valve": round(valve_loss_bar(q_zone, env["valve_cv"]), 3),
        }
        if with_pump:
            pump_pt = {"flow_m3h": round(q_zone, 3), "head_m": round(head_pump, 2),
                       "head_bar": round(head_pump / M_PER_BAR, 3)}

    return {
        "id": zone_id,
        "flow_m3h": round(q_zone, 3),
        "pump": pump_pt,
        "head_pressure_bar": {"min": min(pressures), "max": max(pressures)} if pressures else None,
        "pressure_spread_pct": spread_pct,
        "node_pressures_bar": node_pressures,
        "loss_breakdown_bar": loss_breakdown,
        "heads": head_out,
        "flags": flags,
        "adjustments_applied": notes,
    }


def solve_one(scope: str, nodes: dict[str, Node], heights: dict[str, float],
              env: dict, notes_by_scope: dict[str, list[str]]) -> dict:
    state = _solve_state({scope}, nodes, heights, env)
    return _zone_dict(scope, nodes, state, heights, env,
                      notes_by_scope.get(scope, []), with_pump=True)


def solve_concurrent(scopes: list[str], nodes: dict[str, Node], heights: dict[str, float],
                     env: dict, notes_by_scope: dict[str, list[str]]) -> dict:
    """Several zones running at once: shared pump + main carry the combined
    flow, each zone keeps its own valve and laterals."""
    state = _solve_state(set(scopes), nodes, heights, env)
    p_head = state["p_head"]
    manifold = _find_one(nodes, "fitting.manifold")
    head_pump = state["pump_head_m"]
    q_total = sum(state["leaf_q"].values())
    main_hose = next((n for n in nodes.values()
                      if n.scope == "MAIN" and n.dtype.startswith("hose.")), None)
    main_fric_m = _edge_friction_m(main_hose, state["sub"].get(main_hose.id, 0.0), env) if main_hose else 0.0
    zones_out = [_zone_dict(s, nodes, state, heights, env,
                            notes_by_scope.get(s, []), with_pump=False) for s in scopes]
    return {
        "zones_running": [scope_to_id(s) for s in scopes],
        "combined_flow_m3h": round(q_total, 3),
        "pump": {"flow_m3h": round(q_total, 3), "head_m": round(head_pump, 2),
                 "head_bar": round(head_pump / M_PER_BAR, 3)},
        "manifold_inlet_bar": round(p_head[manifold.id] / M_PER_BAR, 3),
        "shared_losses_bar": {
            "static_lift": round((heights[manifold.id] - env["well_water_level_m_asl"]) / M_PER_BAR, 3),
            "main_line_friction": round(main_fric_m / M_PER_BAR, 3),
            "suction": round(env["suction_extra_loss_m"] / M_PER_BAR, 3),
        },
        "zones": zones_out,
    }


# ---------------------------------------------------------------------------
# Ratings / weakest links
# ---------------------------------------------------------------------------
def _ratings(sys_data: dict) -> dict:
    types = sys_data.get("types", {})

    def g(t: str, *keys):
        cur: Any = types.get(t) or {}
        for k in keys:
            cur = (cur or {}).get(k) if isinstance(cur, dict) else None
        return cur

    return {
        "pump_max_bar": g("pump.well", "max_bar"),
        "pump_flow": g("pump.well", "max_flow_m3h"),
        "main_bar": g("hose.32", "max_bar"),
        "lat_bar": g("hose.25", "max_bar"),
        "manifold_bar": g("fitting.manifold", "max_bar"),
        "manifold_flow": g("fitting.manifold", "max_flow_m3h"),
        "valve_min_bar": g("valve.auto", "min_bar"),
        "valve_max_bar": g("valve.auto", "max_bar"),
        "valve_max_flow": g("valve.auto", "max_flow_m3h"),
        "sj_bar": g("fitting.swing", "max_bar"),
        "sj_rotor_flow": g("fitting.swing", "by_feeds", "head.rotor", "max_flow_m3h"),
        "sj_mp_flow": g("fitting.swing", "by_feeds", "head.spray", "max_flow_m3h"),
    }


def _busiest_lateral(nodes: dict[str, Node], zones: list[dict]) -> dict | None:
    """Across the reported zones, the hose segment (not the main line) running
    the highest velocity, using its segment flow (sum of the heads below it)."""
    best = None
    for z in zones:
        lq = {h["loc"]: h["flow_m3h"] for h in z["heads"]}
        sub = subtree_flows(nodes, lq)
        scope = id_to_scope(z["id"])
        for n in nodes.values():
            if n.scope == scope and n.dtype.startswith("hose."):
                v = velocity_ms(sub.get(n.id, 0.0), hose_inner_d_m(n.dtype))
                if best is None or v > best["velocity_ms"]:
                    best = {"segment": "zone_laterals", "size_mm": hose_nominal_mm(n.dtype),
                            "flow_m3h": round(sub.get(n.id, 0.0), 3), "velocity_ms": round(v, 2),
                            "scope": "busiest lateral (per segment)"}
    return best


def weakest_links(sys_data: dict, nodes: dict[str, Node], zones: list[dict], env: dict,
                  pump_manifold_load: float | None = None) -> dict:
    r = _ratings(sys_data)
    max_zone_flow = max((z["flow_m3h"] for z in zones), default=0.0)
    pm_load = pump_manifold_load if pump_manifold_load is not None else max_zone_flow
    pm_scope = "all running zones" if pump_manifold_load is not None else "per zone"
    rotor_peak = max((h["flow_m3h"] for z in zones for h in z["heads"] if h["kind"] == "I-20"),
                     default=0.0)
    mp_peak = max((h["flow_m3h"] for z in zones for h in z["heads"]
                   if str(h["kind"]).startswith("MP")), default=0.0)

    # --- pressure window ---
    max_ratings = {
        "pump (max deliverable)": r["pump_max_bar"],
        "main_line": r["main_bar"],
        "zone_laterals": r["lat_bar"],
        "manifold": r["manifold_bar"],
        "zone_valves": r["valve_max_bar"],
        "swing_joints_rotor": r["sj_bar"],
        "swing_joints_mp": r["sj_bar"],
    }
    max_ratings = {k: v for k, v in max_ratings.items() if v is not None}
    min_ratings = {
        "zone_valves": r["valve_min_bar"],
        "I-20 heads": I20_OP_RANGE_BAR[0],
        "MP regulation": MP_REG_MIN_INLET_BAR,
    }
    min_ratings = {k: v for k, v in min_ratings.items() if v is not None}
    upper_by = min(max_ratings, key=max_ratings.get)
    lower_by = max(min_ratings, key=min_ratings.get)

    # The open-end stream (Z5) discharges to atmosphere, so its near-zero
    # terminal pressure is by design — it has no minimum inlet requirement and
    # is excluded from the pressure-window analysis.
    all_head_pressures = [h["pressure_bar"] for z in zones for h in z["heads"]
                          if h["pressure_bar"] is not None and h["kind"] != "stream"]
    pressure_violations = []
    for name, lim in max_ratings.items():
        if all_head_pressures and max(all_head_pressures) > lim:
            pressure_violations.append(f"head pressure {max(all_head_pressures)} bar exceeds {name} {lim} bar")
    if r["valve_min_bar"] is not None:
        for z in zones:
            for h in z["heads"]:
                if (h["pressure_bar"] is not None and h["kind"] != "stream"
                        and h["pressure_bar"] < r["valve_min_bar"]):
                    pressure_violations.append(
                        f"zone {z['id']} {h['loc']} {h['pressure_bar']} bar below valve min "
                        f"{r['valve_min_bar']} bar")

    # --- flow series path ---
    flow_items = [
        {"component": "pump", "rating_m3h": r["pump_flow"],
         "load_m3h": round(pm_load, 3), "scope": pm_scope},
        {"component": "manifold", "rating_m3h": r["manifold_flow"],
         "load_m3h": round(pm_load, 3), "scope": pm_scope},
        {"component": "zone_valves", "rating_m3h": r["valve_max_flow"],
         "load_m3h": round(max_zone_flow, 3), "scope": "per zone"},
        {"component": "swing_joints_rotor", "rating_m3h": r["sj_rotor_flow"],
         "load_m3h": round(rotor_peak, 3), "scope": "per head"},
        {"component": "swing_joints_mp", "rating_m3h": r["sj_mp_flow"],
         "load_m3h": round(mp_peak, 3), "scope": "per head"},
    ]
    for it in flow_items:
        if it["rating_m3h"]:
            it["margin_m3h"] = round(it["rating_m3h"] - it["load_m3h"], 3)
    rated = [it for it in flow_items if it.get("rating_m3h")]
    rated.sort(key=lambda it: it["margin_m3h"])
    flow_violations = [f"{it['component']} load {it['load_m3h']} > rating {it['rating_m3h']} m3/h"
                       for it in rated if it["margin_m3h"] < 0]

    # --- flow velocity check (water hammer / erosion) ---
    main_hose = next((n for n in nodes.values()
                      if n.scope == "MAIN" and n.dtype.startswith("hose.")), None)
    main_d = hose_inner_d_m(main_hose.dtype) if main_hose else 0.0
    main_mm = hose_nominal_mm(main_hose.dtype) if main_hose else 0.0
    velocity_items = [
        {"segment": "main_line", "size_mm": main_mm,
         "flow_m3h": round(pm_load, 3), "velocity_ms": round(velocity_ms(pm_load, main_d), 2),
         "scope": pm_scope},
    ]
    busiest = _busiest_lateral(nodes, zones)
    if busiest:
        velocity_items.append(busiest)
    velocity_items.sort(key=lambda it: it["velocity_ms"], reverse=True)
    velocity_violations = [
        f"{it['segment']} velocity {it['velocity_ms']} m/s exceeds {VELOCITY_LIMIT_MS} m/s"
        for it in velocity_items if it["velocity_ms"] > VELOCITY_LIMIT_MS]

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
        "velocity": {
            "limit_ms": VELOCITY_LIMIT_MS,
            "items": velocity_items,
            "fastest": velocity_items[0] if velocity_items else None,
            "violations": velocity_violations,
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
                 "MP Rotators are 40 PSI regulated (Hunter MP chart); the Z5 "
                 "stream nozzle is modelled as free discharge from the 16 mm "
                 "bore. Loss coefficients are approximate and overridable."),
    }
    if extra:
        a.update(extra)
    return a


_SEVERITY = {"ok": 0, "warning": 1, "violation": 2}

_FRIENDLY = {
    "pump": "Pump capacity",
    "manifold": "Manifold",
    "zone_valves": "Zone valves",
    "swing_joints_rotor": "Rotor swing joints",
    "swing_joints_mp": "MP swing joints",
    "main_line": "Main line",
    "zone_laterals": "Zone laterals",
}


def _health(zones: list[dict], wl: dict) -> dict:
    """Roll the pressure / flow / velocity / uniformity analysis up into an
    at-a-glance status card. Pure synthesis of values already in `zones` and
    `weakest_links` (`wl`); adds no new physics."""
    def r1(x):
        return round(x, 1) if x is not None else None

    checks: dict[str, dict] = {}

    # pressure -- a band gauge: heads should sit inside the safe window
    pv = wl["pressure"]["violations"]
    obs = wl["pressure"]["observed_head_pressure_bar"]
    win = wl["pressure"]["safe_window_bar"]
    if obs:
        headroom = min(obs[0] - win[0], win[1] - obs[1])
        near_lower = (obs[0] - win[0]) <= (win[1] - obs[1])
        bound = wl["pressure"]["lower_bound_by"] if near_lower else wl["pressure"]["upper_bound_by"]
        if pv:
            status = "violation"
        elif headroom < 0.1 * (win[1] - win[0]):
            status = "warning"
        else:
            status = "ok"
        checks["pressure"] = {
            "label": "Head pressure", "status": status, "unit": "bar", "kind": "band",
            "value": [r1(obs[0]), r1(obs[1])], "min": r1(win[0]), "max": r1(win[1]),
            "note": f"{r1(headroom)} bar headroom (nearest: {bound})",
        }
    else:
        checks["pressure"] = {"label": "Head pressure", "status": "ok", "unit": "bar",
                              "kind": "band", "value": None, "min": r1(win[0]), "max": r1(win[1]),
                              "note": "no head pressures"}

    # flow -- a fill gauge on the tightest (binding) component
    fv = wl["flow"]["violations"]
    tight = wl["flow"]["tightest"]
    if tight and tight.get("rating_m3h"):
        frac = tight["margin_m3h"] / tight["rating_m3h"]
        status = "violation" if fv else ("warning" if frac < 0.1 else "ok")
        checks["flow"] = {
            "label": _FRIENDLY.get(tight["component"], tight["component"]),
            "status": status, "unit": "m3/h", "kind": "fill",
            "value": r1(tight["load_m3h"]), "min": 0.0, "max": r1(tight["rating_m3h"]),
            "note": f"{r1(tight['margin_m3h'])} m3/h spare ({tight['scope']})",
        }
    else:
        checks["flow"] = {"label": "Flow", "status": "ok", "unit": "m3/h", "kind": "fill",
                          "value": None, "min": 0.0, "max": None, "note": "—"}

    # velocity -- a ceiling gauge. Pipe velocity over the limit is a design
    # guideline (erosion / water-hammer risk), not a hard equipment-rating
    # breach like pressure or flow, so it is advisory: it warns, never escalates
    # the whole system to "violation".
    vv = wl["velocity"]["violations"]
    fast = wl["velocity"]["fastest"]
    limit = wl["velocity"]["limit_ms"]
    if fast:
        status = "warning" if (vv or fast["velocity_ms"] >= 0.8 * limit) else "ok"
        checks["velocity"] = {
            "label": "Pipe velocity", "status": status, "unit": "m/s", "kind": "ceiling",
            "value": r1(fast["velocity_ms"]), "min": 0.0, "max": r1(limit),
            "note": f"fastest: {_FRIENDLY.get(fast['segment'], fast['segment'])}",
        }
    else:
        checks["velocity"] = {"label": "Pipe velocity", "status": "ok", "unit": "m/s",
                              "kind": "ceiling", "value": None, "min": 0.0, "max": r1(limit),
                              "note": "—"}

    # uniformity -- a ceiling gauge on the worst in-zone pressure spread
    spread_flags = [f for z in zones for f in z.get("flags", []) if "pressure spread" in f]
    worst_spread = max((z.get("pressure_spread_pct") or 0.0 for z in zones), default=0.0)
    checks["uniformity"] = {
        "label": "Coverage evenness", "status": "warning" if spread_flags else "ok",
        "unit": "%", "kind": "ceiling", "value": r1(worst_spread), "min": 0.0,
        "max": PRESSURE_SPREAD_LIMIT_PCT,
        "note": "lower is better" + ("; " + "; ".join(spread_flags) if spread_flags else ""),
    }

    head_flags = [f for z in zones for f in z.get("flags", []) if "pressure spread" not in f]

    pump_item = next((it for it in wl["flow"]["items"] if it["component"] == "pump"), None)
    capacity = None
    if pump_item and pump_item.get("rating_m3h"):
        capacity = {
            "pump_load_m3h": r1(pump_item["load_m3h"]),
            "pump_rating_m3h": r1(pump_item["rating_m3h"]),
            "pump_load_pct": round(pump_item["load_m3h"] / pump_item["rating_m3h"] * 100),
            "spare_flow_m3h": r1(pump_item["margin_m3h"]),
        }

    statuses = [c["status"] for c in checks.values()] + (["warning"] if head_flags else [])
    overall = max(statuses, key=lambda s: _SEVERITY[s]) if statuses else "ok"

    all_violations = pv + fv  # velocity is advisory (see the velocity check above)
    all_flags = [f for z in zones for f in z.get("flags", [])]
    if overall == "violation":
        headline = f"{len(all_violations)} limit violation(s): " + "; ".join(all_violations)
    elif overall == "warning":
        cautions = [c["label"] for c in checks.values() if c["status"] == "warning"]
        if head_flags:
            cautions.append("head flags")
        headline = "Within limits, watch: " + ", ".join(cautions)
    else:
        headline = f"Healthy — all {len(zones)} zone(s) within pressure, flow, velocity and coverage limits"

    zone_cards = []
    for z in zones:
        hp = z.get("head_pressure_bar")
        zone_cards.append({
            "id": z["id"],
            "status": "warning" if z.get("flags") else "ok",
            "flow_m3h": r1(z["flow_m3h"]),
            "head_pressure_bar": [r1(hp["min"]), r1(hp["max"])] if hp else None,
            "spread_pct": r1(z.get("pressure_spread_pct")),
            "flags": z.get("flags", []),
        })

    return {
        "status": overall,
        "headline": headline,
        "checks": checks,
        "capacity": capacity,
        "zones": zone_cards,
        "flags": all_flags,
        "violations": all_violations,
    }


def report(adjustments: dict | None = None, zone: int | None = None,
           concurrent_zones: list[int] | None = None, path: Path = SETUP_PATH) -> dict:
    """Run the full hydraulic solve and weakest-link analysis.

    Args:
        adjustments: optional what-if overrides:
            pump_model: str                    swap the pump curve
            well_water_level_m_asl: float      water table elevation (default = pump elevation)
            global_operating_pressure_bar: float  pin every head to this pressure (skip the
                                               pump/friction solve)
            valve_cv, sj_loss_bar, suction_extra_loss_m: tune the loss model
            heads: list of head edits, each {zone, (index|loc|match), set}, where `loc` is a
                node id (e.g. "Z1.nozzle.rotor.01") and `match` matches nozzle-leaf fields, e.g.
                {"zone": 2, "match": {"nozzle": "2.5 blue"}, "set": {"nozzle": "4.0 blue"}}
        zone: restrict the solve to one zone id (one zone at a time).
        concurrent_zones: list of zone ids to run simultaneously (shared pump + main).

    Returns a dict whose first key is `health` (an at-a-glance status card),
    then assumptions, per-zone results, and weakest_links. In concurrent mode a
    top-level `concurrent` block reports the shared operating point. Zones Z1-Z4
    are automatic; Z5 is the manual open-end line (estimated); Z6 is capped and
    excluded.
    """
    adjustments = adjustments or {}
    sys_data = load_system(path)
    nodes = build_graph(sys_data)
    heights = _compute_heights(nodes)
    pump_model = _resolve_pump(sys_data, adjustments)

    # attach the feeding-hose bore to each stream leaf (for the free-discharge model)
    for n in nodes.values():
        if n.dtype == "nozzle.stream" and n.parent and nodes[n.parent].dtype.startswith("hose."):
            n.fields["_feed_d_m"] = hose_inner_d_m(nodes[n.parent].dtype)

    pump_node = _find_one(nodes, "pump.well")
    z_pump = heights[pump_node.id]
    env = {
        "pump_model": pump_model,
        "well_water_level_m_asl": adjustments.get("well_water_level_m_asl", z_pump),
        "valve_cv": adjustments.get("valve_cv", VALVE_CV),
        "sj_loss_bar": adjustments.get("sj_loss_bar", SJ_LOSS_BAR),
        "suction_extra_loss_m": adjustments.get("suction_extra_loss_m", SUCTION_EXTRA_LOSS_M),
        "global_operating_pressure_bar": adjustments.get("global_operating_pressure_bar"),
        "hw_c": HW_C,
    }
    notes_by_scope = _apply_head_adjustments(nodes, adjustments)
    known = known_zone_ids(nodes)

    if concurrent_zones:
        unknown = [i for i in concurrent_zones if i not in known]
        if unknown:
            raise ValueError(f"unknown zone id(s) {unknown}; known: {sorted(known)}")
        scopes = [id_to_scope(i) for i in concurrent_zones]
        con = solve_concurrent(scopes, nodes, heights, env, notes_by_scope)
        wl = weakest_links(sys_data, nodes, con["zones"], env,
                           pump_manifold_load=con["combined_flow_m3h"])
        return {
            "health": _health(con["zones"], wl),
            "assumptions": _assumptions(pump_model, env, "concurrent",
                                        {"concurrent_zones": con["zones_running"]}),
            "concurrent": {k: con[k] for k in
                           ("zones_running", "combined_flow_m3h", "pump",
                            "manifold_inlet_bar", "shared_losses_bar")},
            "zones": con["zones"],
            "weakest_links": wl,
        }

    if zone is not None and zone not in known:
        raise ValueError(f"unknown zone id {zone}; known: {sorted(known)}")
    mode = "pinned-pressure" if env["global_operating_pressure_bar"] else "full-solve"
    scopes = [id_to_scope(zone)] if zone is not None else [id_to_scope(i) for i in sorted(known)]
    zones = [solve_one(s, nodes, heights, env, notes_by_scope) for s in scopes]
    wl = weakest_links(sys_data, nodes, zones, env)
    return {
        "health": _health(zones, wl),
        "assumptions": _assumptions(pump_model, env, mode),
        "zones": zones,
        "weakest_links": wl,
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
