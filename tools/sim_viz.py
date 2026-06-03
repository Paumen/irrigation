#!/usr/bin/env python3
"""Render fault-simulation scenarios as a static SVG of the full flow graph.

Runs `simulate.simulate` for a baseline plus fault scenarios and lays out every
node of the `flow` graph (well -> pump -> manifold -> per-zone hoses, tees,
swing joints, valves, heads) as a layered tree, painting the live result:
wetted vs dry, valve state, leak sites, and per-head grade. No physics here --
every painted value is a simulate() response. stdlib only.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import simulate
try:
    import yaml
except ImportError:
    yaml = None

GRADE_COLOR = {
    "full": "#2e9e4f",
    "weak": "#e0a106",
    "won't-pop": "#e8590c",
    "dead": "#9aa0a6",
}
VALVE_COLOR = {"open": "#2e9e4f", "shut": "#9aa0a6", "weeping": "#e0a106"}
WET = "#7fa8e8"
DRY = "#dfe3e8"

SCENARIOS = [
    ("Baseline  -  Z1+Z2 commanded, no faults",
     {"commanded_zones": [1, 2]}),
    ("S1 Electrical  -  cond.common broken (shared coil return)",
     {"commanded_zones": [1, 2, 3, 4], "conditions": {"cond.common": "broken"}}),
    ("S2 Valve pilot loop  -  Z1 metering_port clogged (only Z2 commanded)",
     {"commanded_zones": [2], "conditions": {"Z1.valve.metering_port": "clogged"}}),
    ("S3 Hydraulic leak  -  Z1.hose1 burst (Z1 commanded)",
     {"commanded_zones": [1], "conditions": {"Z1.hose1": "broken"}}),
]

DX = 56          # px per graph depth level
LANE = 26        # px per leaf lane
LEFT = 30
TOP = 56
HEADER = 50


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def load_flow():
    if yaml is None:
        raise SystemExit("pyyaml required")
    g = yaml.safe_load(open(os.path.join(os.path.dirname(__file__), "..", "graph.yaml")))
    return {k: (v.get("to") or []) for k, v in g["flow"].items()}


def layout(flow):
    """Tree layout: x by depth from well, y by leaf lanes (internal = mean child)."""
    root = "well"
    depth = {root: 0}
    order = [root]
    i = 0
    while i < len(order):
        n = order[i]; i += 1
        for c in flow.get(n, []):
            depth[c] = depth[n] + 1
            order.append(c)
    lane = {}
    counter = [0]

    def assign(n):
        kids = flow.get(n, [])
        if not kids:
            lane[n] = counter[0]; counter[0] += 1
        else:
            for c in kids:
                assign(c)
            lane[n] = sum(lane[c] for c in kids) / len(kids)
    assign(root)
    pos = {n: (LEFT + depth[n] * DX, TOP + lane[n] * LANE) for n in depth}
    nleaves = counter[0]
    return pos, nleaves


def kind_of(n):
    last = n.split(".")[-1]
    if n in ("well",):
        return "well"
    if n == "pump":
        return "pump"
    if n == "mani":
        return "mani"
    if last.startswith("valve"):
        return "valve"
    if last.startswith("head") or last == "nozzle":
        return "head"
    if last == "cap":
        return "cap"
    if last.startswith("tee"):
        return "tee"
    return "node"   # hoses, junctions (j*), swing joints (sw*), trunk joints


def is_wet(n, wetted):
    return n in wetted or any(w == n or w.startswith(n + ".") for w in wetted)


def panel(title, res, flow, pos, oy):
    e = []
    e.append(f'<text x="{LEFT}" y="{oy+20}" font-size="15" font-weight="700" '
             f'fill="#1a1a1a">{esc(title)}</text>')
    s = res["summary"]
    sub = f'{s["headline"]}   |   pump {"ON" if s["pump_running"] else "OFF"}   |   total {s["total_flow_m3h"]} m3/h'
    e.append(f'<text x="{LEFT}" y="{oy+38}" font-size="12.5" fill="#444">{esc(sub)}</text>')

    wetted = set(res.get("wetted", []))
    grade = {h["loc"]: h["grade"] for z in res["zones"] for h in z["heads"]}
    leakset = {lk["loc"]: lk for lk in res["leaks"]}
    valves = res["valves"]
    zmeta = {z["id"]: z for z in res["zones"]}

    # edges first (under nodes)
    for n, kids in flow.items():
        if n not in pos:
            continue
        x0, y0 = pos[n]
        for c in kids:
            if c not in pos:
                continue
            x1, y1 = pos[c]
            col = WET if is_wet(c, wetted) else DRY
            e.append(f'<path d="M{x0:.0f},{oy+y0:.0f} L{x0+DX*0.5:.0f},{oy+y0:.0f} '
                     f'L{x0+DX*0.5:.0f},{oy+y1:.0f} L{x1:.0f},{oy+y1:.0f}" '
                     f'fill="none" stroke="{col}" stroke-width="2"/>')

    # nodes
    for n, (x, y) in pos.items():
        yy = oy + y
        k = kind_of(n)
        wet = is_wet(n, wetted)
        base = WET if wet else DRY
        last = n.split(".")[-1]
        if k == "head":
            g = grade.get(n, "dead")
            e.append(f'<circle cx="{x}" cy="{yy}" r="8" fill="{GRADE_COLOR.get(g,DRY)}" stroke="#555" stroke-width="0.7"/>')
            e.append(f'<text x="{x}" y="{yy-11}" font-size="7.5" text-anchor="middle" fill="#333">{esc(last)}</text>')
        elif k == "valve":
            zid = int(n[1]) if n[1].isdigit() else None
            vs = valves.get(f"Z{zid}", {})
            vc = VALVE_COLOR.get(vs.get("state"), DRY)
            zm = zmeta.get(zid, {})
            unc = zm and (not zm.get("commanded")) and vs.get("state") == "open" and not zm.get("manual")
            stroke = "#d11" if unc else "#555"
            sw = 2.2 if unc else 0.7
            e.append(f'<rect x="{x-7}" y="{yy-7}" width="14" height="14" rx="2" '
                     f'transform="rotate(45 {x} {yy})" fill="{vc}" stroke="{stroke}" stroke-width="{sw}"/>')
            e.append(f'<text x="{x}" y="{yy-12}" font-size="7.5" text-anchor="middle" fill="#333">valve</text>')
        elif k == "pump":
            pc = "#2e9e4f" if res["electrical"]["pump_running"] else "#9aa0a6"
            e.append(f'<rect x="{x-9}" y="{yy-9}" width="18" height="18" rx="4" fill="{pc}"/>'
                     f'<text x="{x}" y="{yy+4}" font-size="10" text-anchor="middle" fill="white" font-weight="700">P</text>'
                     f'<text x="{x}" y="{yy-13}" font-size="8" text-anchor="middle" fill="#333">pump</text>')
        elif k == "mani":
            e.append(f'<rect x="{x-6}" y="{yy-30}" width="12" height="60" rx="3" fill="{base}" stroke="#888"/>'
                     f'<text x="{x}" y="{yy-34}" font-size="8" text-anchor="middle" fill="#333">manifold</text>')
        elif k == "well":
            e.append(f'<circle cx="{x}" cy="{yy}" r="8" fill="#4c8bf5"/>'
                     f'<text x="{x}" y="{yy-12}" font-size="8" text-anchor="middle" fill="#333">well</text>')
        elif k == "cap":
            e.append(f'<rect x="{x-5}" y="{yy-5}" width="10" height="10" fill="{base}" stroke="#888"/>'
                     f'<text x="{x}" y="{yy-9}" font-size="7" text-anchor="middle" fill="#999">cap</text>')
        elif k == "tee":
            e.append(f'<rect x="{x-4}" y="{yy-4}" width="8" height="8" fill="{base}" stroke="#9aa0a6"/>')
        else:  # hose / junction / swing joint
            e.append(f'<circle cx="{x}" cy="{yy}" r="3.5" fill="{base}" stroke="#b6bcc4" stroke-width="0.6"/>')
        # leak marker: red warning triangle + flow (drawn, not a font glyph)
        if n in leakset:
            tx, ty = x, yy - 13
            e.append(f'<polygon points="{tx},{ty-7} {tx-7},{ty+6} {tx+7},{ty+6}" '
                     f'fill="#d11" stroke="#7a0000" stroke-width="0.6"/>'
                     f'<text x="{tx}" y="{ty+5}" font-size="9" text-anchor="middle" fill="white" font-weight="700">!</text>'
                     f'<text x="{x+10}" y="{yy+4}" font-size="7.5" fill="#d11">{leakset[n]["flow_m3h"]} m3/h</text>')
    return "\n".join(e), e


def render(scenarios):
    flow = load_flow()
    pos, nleaves = layout(flow)
    maxx = max(x for x, _ in pos.values()) + 70
    panel_h = TOP + nleaves * LANE + 16
    parts = []
    for i, (title, req) in enumerate(scenarios):
        res = simulate.simulate(**req)
        frag, _ = panel(title, res, flow, pos, 0)
        parts.append(f'<g transform="translate(0,{HEADER + i*panel_h})">'
                     f'<rect x="2" y="2" width="{maxx-4}" height="{panel_h-6}" rx="9" '
                     f'fill="#fbfbfd" stroke="#d4d7dc"/>{frag}</g>')
    total_h = HEADER + panel_h * len(scenarios) + 6
    legend = (
        '<text x="18" y="24" font-size="19" font-weight="800" fill="#111">'
        'Irrigation fault simulator &#8212; full flow graph, 3 scenarios vs baseline</text>'
        f'<text x="18" y="42" font-size="11.5" fill="#555">'
        'Every node of the flow graph painted from a live simulate() result. '
        'Edge/node colour: blue = wetted, grey = dry. Diamond = valve (green open / grey shut / '
        'red outline = open while not commanded). Big circle = head (grade colour). '
        '&#9889; = leak. Squares = tee/cap; small dots = hoses, junctions, swing joints.</text>'
    )
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{maxx}" height="{total_h}" '
            f'font-family="Segoe UI, Arial, sans-serif">'
            f'<rect width="{maxx}" height="{total_h}" fill="white"/>'
            f'{legend}{"".join(parts)}</svg>')


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "scenarios.svg"
    with open(out, "w") as f:
        f.write(render(SCENARIOS))
    print("wrote", out)
