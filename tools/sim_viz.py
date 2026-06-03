#!/usr/bin/env python3
"""Render fault-simulation scenarios as a static SVG schematic.

Runs `simulate.run` for a list of named scenarios and paints each result onto a
simple pump -> manifold -> zone-branch schematic: head colour = grade, valve
glyph = state, leaks marked with a burst, plus the engine headline. No physics
here -- every painted value is a simulate() response. stdlib only.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import simulate

GRADE_COLOR = {
    "full": "#2e9e4f",
    "weak": "#e0a106",
    "won't-pop": "#e8590c",
    "dead": "#9aa0a6",
}
VALVE_COLOR = {"open": "#2e9e4f", "shut": "#9aa0a6", "weeping": "#e0a106"}

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

PANEL_W, PANEL_H = 980, 250
PAD = 18


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def panel(title, res, oy):
    """Return SVG fragment for one scenario panel, offset vertically by oy."""
    e = []
    e.append(f'<rect x="2" y="{oy+2}" width="{PANEL_W-4}" height="{PANEL_H-4}" '
             f'rx="10" fill="#fbfbfd" stroke="#d4d7dc"/>')
    e.append(f'<text x="{PAD}" y="{oy+24}" font-size="15" font-weight="700" '
             f'fill="#1a1a1a">{esc(title)}</text>')

    s = res["summary"]
    head = f'{s["headline"]}   |   pump {"ON" if s["pump_running"] else "OFF"}   |   total {s["total_flow_m3h"]} m3/h'
    e.append(f'<text x="{PAD}" y="{oy+42}" font-size="12.5" fill="#444">{esc(head)}</text>')

    # trunk: well -> pump -> manifold
    tx, ty = PAD + 8, oy + 120
    e.append(f'<circle cx="{tx}" cy="{ty}" r="9" fill="#4c8bf5"/>'
             f'<text x="{tx}" y="{ty+24}" font-size="10" text-anchor="middle" fill="#555">well</text>')
    px = tx + 70
    pump_on = res["electrical"]["pump_running"]
    pc = "#2e9e4f" if pump_on else "#9aa0a6"
    e.append(f'<line x1="{tx+9}" y1="{ty}" x2="{px-16}" y2="{ty}" stroke="#4c8bf5" stroke-width="3"/>')
    e.append(f'<rect x="{px-16}" y="{ty-14}" width="32" height="28" rx="5" fill="{pc}"/>'
             f'<text x="{px}" y="{ty+5}" font-size="11" text-anchor="middle" fill="white" font-weight="700">P</text>'
             f'<text x="{px}" y="{ty+30}" font-size="10" text-anchor="middle" fill="#555">pump</text>')
    mx = px + 70
    e.append(f'<line x1="{px+16}" y1="{ty}" x2="{mx}" y2="{ty}" stroke="#4c8bf5" stroke-width="3"/>')
    e.append(f'<rect x="{mx}" y="{ty-40}" width="14" height="84" rx="4" fill="#6b7280"/>'
             f'<text x="{mx+7}" y="{ty+58}" font-size="10" text-anchor="middle" fill="#555">manifold</text>')

    valves = res["valves"]
    zones = {z["id"]: z for z in res["zones"]}
    zx = mx + 60
    n = len(res["zones"])
    span = PANEL_H - 70
    for i, z in enumerate(res["zones"]):
        zid = z["id"]
        zy = oy + 60 + int(span * (i + 0.5) / n)
        e.append(f'<line x1="{mx+14}" y1="{ty}" x2="{zx}" y2="{zy}" stroke="#9bbcf7" stroke-width="2"/>')
        # valve glyph
        vstate = valves.get(f"Z{zid}", {}).get("state", "shut")
        vreason = valves.get(f"Z{zid}", {}).get("reason", "")
        vc = VALVE_COLOR.get(vstate, "#9aa0a6")
        stuck = "stuck" in vreason or "can't fill" in vreason or "uncommanded" in str(z.get("heads"))
        # detect uncommanded-open: commanded False but open
        unc = (not z["commanded"]) and vstate == "open" and not z["manual"]
        e.append(f'<rect x="{zx}" y="{zy-9}" width="18" height="18" rx="3" fill="{vc}" '
                 f'stroke="{"#d11" if unc else vc}" stroke-width="{3 if unc else 1}"/>')
        lbl = f'Z{zid}' + ('(man)' if z["manual"] else '')
        e.append(f'<text x="{zx+9}" y="{zy-13}" font-size="10" text-anchor="middle" fill="#333" font-weight="700">{lbl}</text>')
        # heads
        hx = zx + 50
        for h in z["heads"]:
            gc = GRADE_COLOR.get(h["grade"], "#9aa0a6")
            e.append(f'<line x1="{zx+18}" y1="{zy}" x2="{hx}" y2="{zy}" stroke="#cfd4da" stroke-width="1.5"/>')
            e.append(f'<circle cx="{hx+9}" cy="{zy}" r="9" fill="{gc}"/>')
            short = h["loc"].split(".")[-1]
            e.append(f'<text x="{hx+9}" y="{zy+22}" font-size="8.5" text-anchor="middle" fill="#666">{esc(short)}</text>')
            # leak burst on this node?
            hx += 95
        # leak markers (match by zone prefix)
        for lk in res["leaks"]:
            if lk["loc"].startswith(f"Z{zid}."):
                e.append(f'<text x="{zx+30}" y="{zy+4}" font-size="16" fill="#d11">&#9889;</text>'
                         f'<text x="{zx+30}" y="{zy+18}" font-size="8.5" fill="#d11">{lk["flow_m3h"]} m3/h leak</text>')
    return "\n".join(e)


def render(scenarios):
    panels = []
    for i, (title, req) in enumerate(scenarios):
        res = simulate.simulate(**req)
        panels.append(f'<g transform="translate(0,{i*PANEL_H})">{panel(title, res, 0)}</g>')
    total_h = PANEL_H * len(scenarios) + 80
    legend = (
        '<text x="18" y="28" font-size="20" font-weight="800" fill="#111">'
        'Irrigation fault simulator &#8212; 3 scenarios vs baseline</text>'
        '<text x="18" y="50" font-size="12" fill="#555">'
        'Each panel is a live simulate() result painted on the pump&#8594;manifold&#8594;zone schematic. '
        'Head colour = grade; red-outlined valve = open while not commanded.</text>'
    )
    items = [("#2e9e4f", "full / open"), ("#e0a106", "weak"),
             ("#e8590c", "won't-pop"), ("#9aa0a6", "dead / shut")]
    lx = 18
    leg = []
    for c, t in items:
        leg.append(f'<circle cx="{lx+6}" cy="64" r="6" fill="{c}"/>'
                   f'<text x="{lx+16}" y="68" font-size="11" fill="#444">{t}</text>')
        lx += 110
    inner = '<g transform="translate(0,72)">' + "\n".join(panels) + "</g>"
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{PANEL_W}" '
            f'height="{total_h}" font-family="Segoe UI, Arial, sans-serif">'
            f'<rect width="{PANEL_W}" height="{total_h}" fill="white"/>'
            f'{legend}{"".join(leg)}{inner}</svg>')


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "scenarios.svg"
    svg = render(SCENARIOS)
    with open(out, "w") as f:
        f.write(svg)
    print("wrote", out)
