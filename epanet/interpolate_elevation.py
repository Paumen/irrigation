#!/usr/bin/env python3
"""Interpolate ground elevations (h_m) for irrigation flow nodes that lack a
measured value.

The flow network in graph.yaml is a tree rooted at the well. A sparse set of
nodes carry a measured `h_m` (pump, manifold, zone valves, sprinkler heads).
EPANET needs an elevation at every junction, so this fills the gaps by linear
interpolation along each pipe run between the nearest measured anchors, using
cumulative pipe length (hose `length_m`; fittings are zero-length) as the
distance coordinate. Trunk nodes shared by several anchor->anchor paths get the
average of their per-path estimates. Dead ends with no downstream anchor inherit
the nearest upstream anchor (flat).

Usage: python3 epanet/interpolate_elevation.py [--write epanet/elevations.yaml]
"""
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
FLOW = yaml.safe_load((ROOT / "graph.yaml").read_text())["flow"]


def span(node):
    """Pipe length represented by a node (hoses), else 0 for fittings."""
    return float(FLOW[node].get("length_m", 0) or 0)


def build_tree():
    root = next(k for k, v in FLOW.items() if v["kind"] == "supply")
    parent = {root: None}
    order = [root]
    i = 0
    while i < len(order):
        u = order[i]
        i += 1
        for v in FLOW[u].get("to", []):
            if v in FLOW and v not in parent:
                parent[v] = u
                order.append(v)
    return root, parent, order


def coordinates(parent, order):
    """Cumulative distance from root to each node's midpoint."""
    outlet, coord = {}, {}
    for u in order:
        p = parent[u]
        inlet = 0.0 if p is None else outlet[p]
        outlet[u] = inlet + span(u)
        coord[u] = inlet + span(u) / 2.0
    return coord


def interpolate():
    root, parent, order = build_tree()
    coord = coordinates(parent, order)
    anchor = {k: float(v["h_m"]) for k, v in FLOW.items() if "h_m" in v}

    est = {n: [] for n in FLOW}
    for d in anchor:
        # walk up to the nearest ancestor anchor U; interpolate the chain U..D
        chain = [d]
        p = parent[d]
        while p is not None and p not in anchor:
            chain.append(p)
            p = parent[p]
        if p is None:
            continue
        u = p
        cu, cd, hu, hd = coord[u], coord[d], anchor[u], anchor[d]
        for n in chain[1:]:  # skip D (an anchor); U is not in chain
            t = 0.0 if cd == cu else (coord[n] - cu) / (cd - cu)
            est[n].append(hu + t * (hd - hu))

    def up_anchor(n):
        p = parent[n]
        while p is not None:
            if p in anchor:
                return p
            p = parent[p]
        return None

    result = {}
    for n in order:
        if n in anchor:
            result[n] = {"h_m": round(anchor[n], 2), "source": "measured"}
        elif est[n]:
            result[n] = {"h_m": round(sum(est[n]) / len(est[n]), 2),
                         "source": "interp"}
        else:
            u = up_anchor(n)
            if u is not None:
                result[n] = {"h_m": round(anchor[u], 2), "source": "interp_flat"}
            # root supply (well) carries water_level_m, not h_m: skip
    return order, coord, result


def main():
    order, coord, result = interpolate()
    width = max(len(n) for n in result)
    print(f"{'node':<{width}}  {'dist_m':>7}  {'h_m':>6}  source")
    for n in order:
        if n not in result:
            continue
        r = result[n]
        print(f"{n:<{width}}  {coord[n]:7.1f}  {r['h_m']:6.2f}  {r['source']}")

    if "--write" in sys.argv:
        out = Path(sys.argv[sys.argv.index("--write") + 1])
        out.write_text(yaml.safe_dump(
            {n: result[n] for n in order if n in result}, sort_keys=False))
        print(f"\nwrote {out}")


if __name__ == "__main__":
    main()
