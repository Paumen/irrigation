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


def _graph():
    if yaml is None:
        raise SystemExit("pyyaml required")
    return yaml.safe_load(open(os.path.join(os.path.dirname(__file__), "..", "graph.yaml")))


def load_flow():
    return {k: (v.get("to") or []) for k, v in _graph()["flow"].items()}


# Hand-placed ladder for the electrical loop (a return cycle, not a tree):
# controller taps -> field wires -> solenoid coils -> shared common return,
# It is drawn as a proper ladder (see circuit_panel) with a single horizontal
# COMMON return bus, so every coil loop reads as closed back to the transformer.
HOT = "#e8a200"      # energised
COLD = "#dfe3e8"     # de-energised


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


CLEFT, CTOP = 40, 52
# ladder column x-offsets (px from panel left) and row pitch
CX = {"xfmr": 70, "hot": 150, "tap": 235, "ts": 320, "field": 405,
      "coil": 540, "ret": 660, "bus_l": 150}
ROW_Y = 44
CIRC_W = 940
CIRC_PANEL_H = 372


def _wire(x1, y1, x2, y2, hot, w=None):
    col = HOT if hot else "#c9ced4"
    sw = (2.6 if hot else 1.6) if w is None else w
    return (f'<path d="M{x1:.0f},{y1:.0f} H{(x1+x2)/2:.0f} V{y2:.0f} H{x2:.0f}" '
            f'fill="none" stroke="{col}" stroke-width="{sw}"/>')


def _faultx(x, y, label):
    return (f'<line x1="{x-9}" y1="{y-9}" x2="{x+9}" y2="{y+9}" stroke="#d11" stroke-width="2"/>'
            f'<line x1="{x+9}" y1="{y-9}" x2="{x-9}" y2="{y+9}" stroke="#d11" stroke-width="2"/>'
            f'<text x="{x}" y="{y-15}" font-size="8.5" text-anchor="middle" fill="#d11" '
            f'font-weight="700">{esc(label)}</text>')


def circuit_panel(title, res, conditions, oy):
    e = []
    e.append(f'<rect x="2" y="{oy+2}" width="{CIRC_W-4}" height="{CIRC_PANEL_H-6}" rx="9" '
             f'fill="#fbfbfd" stroke="#d4d7dc"/>')
    e.append(f'<text x="{CLEFT}" y="{oy+22}" font-size="15" font-weight="700" fill="#1a1a1a">{esc(title)}</text>')
    el = res["electrical"]
    sub = (f'pump {"ON" if el["pump_running"] else "OFF"} ({el["pump_reason"]})   |   '
           f'coils energised: {sorted(z for z,v in el["coils"].items() if v) or "none"}')
    e.append(f'<text x="{CLEFT}" y="{oy+40}" font-size="12" fill="#444">{esc(sub)}</text>')
    live = set(el.get("energised", []))
    cond = conditions or {}

    def L(n):                       # node is live (energised)
        return n in live
    top = oy + CTOP + 24
    zy = [top + i * ROW_Y for i in range(4)]          # Z1..Z4 rungs
    bus_y = top + 4 * ROW_Y + 8                        # shared COMMON return bus
    rly_y = top + 5 * ROW_Y + 18                       # relay (pump) rung, own return
    pwr_y = top + 6 * ROW_Y + 30                       # 230 V power chain

    def node(x, y, kind, label, on, fault=None, w=22, h=16):
        fill = HOT if on else COLD
        if kind == "coil":
            e.append(f'<rect x="{x-w/2}" y="{y-h/2}" width="{w}" height="{h}" rx="3" '
                     f'fill="{fill}" stroke="#888"/>')
        elif kind == "dot":
            e.append(f'<circle cx="{x}" cy="{y}" r="5.5" fill="{fill}" stroke="#9aa0a6" stroke-width="0.7"/>')
        elif kind == "motor":
            mc = "#2e9e4f" if on else COLD
            e.append(f'<circle cx="{x}" cy="{y}" r="12" fill="{mc}" stroke="#555"/>'
                     f'<text x="{x}" y="{y+4}" font-size="10" text-anchor="middle" fill="white" font-weight="700">M</text>')
        if label:
            e.append(f'<text x="{x}" y="{y-11}" font-size="8" text-anchor="middle" fill="#555">{esc(label)}</text>')
        if fault:
            e.append(_faultx(x, y, fault))

    # ---- transformer / PSU (the source AND the return sink, on the left) ----
    tx = CLEFT + CX["xfmr"]
    psu_on = L("ctrl.psu")
    e.append(f'<rect x="{tx-20}" y="{top-14}" width="40" height="{rly_y-top+28}" rx="6" '
             f'fill="{"#fff5e0" if psu_on else "#f1f3f5"}" stroke="#b08a2e" stroke-width="1.2"/>')
    e.append(f'<text x="{tx}" y="{top-20}" font-size="9" text-anchor="middle" fill="#7a5c12" font-weight="700">24 VAC</text>')
    e.append(f'<text x="{tx}" y="{rly_y+24}" font-size="8.5" text-anchor="middle" fill="#7a5c12">transformer (PSU)</text>')
    # mains primary into the transformer
    mx = CLEFT + 6
    e.append(f'<rect x="{mx-6}" y="{top-6}" width="12" height="14" rx="2" fill="#6b7280"/>'
             f'<text x="{mx}" y="{top-12}" font-size="7.5" text-anchor="middle" fill="#555">mains</text>')
    e.append(_wire(mx, top + 1, tx - 20, top + 1, L("mains") and psu_on))
    hotx = CLEFT + CX["hot"]
    # hot distribution bus (transformer secondary "hot") feeding every tap
    e.append(_wire(tx + 20, top, hotx, top, psu_on))
    e.append(f'<text x="{hotx}" y="{top-14}" font-size="8" text-anchor="middle" fill="#555">logic/hot</text>')
    e.append(f'<line x1="{hotx}" y1="{zy[0]}" x2="{hotx}" y2="{rly_y}" '
             f'stroke="{HOT if psu_on else COLD}" stroke-width="2.6"/>')

    # ---- four zone rungs: hot tap -> triac -> field -> coil -> down to COMMON --
    headers = [(CX["tap"], "triac"), (CX["field"], "field wire"),
               (CX["coil"], "solenoid coil"), (CX["ret"], "return")]
    for cxv, txt in headers:
        e.append(f'<text x="{CLEFT+cxv}" y="{top-26}" font-size="9" text-anchor="middle" fill="#9aa0a6">{txt}</text>')
    for i, z in enumerate((1, 2, 3, 4)):
        y = zy[i]
        tap, ts = f"ctrl.tr{z}", f"ctrl.ts{z}"
        fld, spl, coil, splc = f"cond.s{z}", f"splice.Z{z}", f"Z{z}.valve.coil", f"splice.Z{z}c"
        xt, xs, xf, xc, xr = (CLEFT + CX["tap"], CLEFT + CX["ts"], CLEFT + CX["field"],
                              CLEFT + CX["coil"], CLEFT + CX["ret"])
        # hot bus -> triac
        e.append(_wire(hotx, y, xt, y, psu_on and L(tap)))
        node(xt, y, "dot", f"triac{z}", L(tap), cond.get(tap))
        # triac -> ts -> field wire -> splice -> coil
        e.append(_wire(xt, y, xf, y, L(tap) and L(fld)))
        node(xf, y, "dot", "field", L(fld), cond.get(fld))
        e.append(_wire(xf, y, xc - 12, y, L(fld) and L(coil)))
        node(xc, y, "coil", f"Z{z} coil", L(coil), cond.get(coil))
        # coil -> return splice -> down to the common bus
        e.append(_wire(xc + 12, y, xr, y, L(coil) and L(splc)))
        node(xr, y, "dot", None, L(splc), cond.get(splc))
        e.append(f'<line x1="{xr}" y1="{y}" x2="{xr}" y2="{bus_y}" '
                 f'stroke="{HOT if (L(splc) and L("cond.common")) else COLD}" stroke-width="2.2"/>')

    # ---- the shared COMMON return bus, back to the transformer common ----
    bus_on = L("cond.common")
    busx_r = CLEFT + CX["ret"]
    busx_l = CLEFT + CX["bus_l"]
    e.append(f'<line x1="{busx_l}" y1="{bus_y}" x2="{busx_r}" y2="{bus_y}" '
             f'stroke="{HOT if bus_on else COLD}" stroke-width="3.4"/>')
    e.append(f'<text x="{(busx_l+busx_r)/2}" y="{bus_y+15}" font-size="8.5" '
             f'text-anchor="middle" fill="#555">COMMON return bus (cond.common)</text>')
    # bus into the transformer common terminal
    e.append(f'<line x1="{busx_l}" y1="{bus_y}" x2="{tx+20}" y2="{bus_y}" '
             f'stroke="{HOT if bus_on else COLD}" stroke-width="3.4"/>'
             f'<line x1="{tx+20}" y1="{bus_y}" x2="{tx+20}" y2="{rly_y}" '
             f'stroke="{HOT if bus_on else COLD}" stroke-width="3.4"/>')
    if "cond.common" in cond:
        e.append(_faultx((busx_l + busx_r) / 2, bus_y, cond["cond.common"]))

    # ---- pump-start relay rung: its OWN return (cond.rcom -> ctrl.trcom -> PSU) -
    y = rly_y
    e.append(_wire(hotx, y, CLEFT + CX["tap"], y, psu_on and L("ctrl.trpmv")))
    node(CLEFT + CX["tap"], y, "dot", "pump tap", L("ctrl.trpmv"), cond.get("ctrl.trpmv"))
    e.append(_wire(CLEFT + CX["tap"], y, CLEFT + CX["field"], y, L("ctrl.trpmv") and L("cond.rsig")))
    node(CLEFT + CX["field"], y, "dot", "sig", L("cond.rsig"), cond.get("cond.rsig"))
    e.append(_wire(CLEFT + CX["field"], y, CLEFT + CX["coil"] - 12, y, L("cond.rsig") and L("relay.coil")))
    node(CLEFT + CX["coil"], y, "coil", "relay coil", L("relay.coil"), cond.get("relay.coil"))
    # relay coil return: a SEPARATE wire back to the transformer (NOT the common bus)
    rcom_on = L("relay.coil") and L("cond.rcom")
    rry = y + 16
    e.append(_wire(CLEFT + CX["coil"] + 12, y, CLEFT + CX["ret"], y, rcom_on))
    node(CLEFT + CX["ret"], y, "dot", "rcom", L("cond.rcom"), cond.get("cond.rcom"))
    e.append(f'<line x1="{CLEFT+CX["ret"]}" y1="{y}" x2="{CLEFT+CX["ret"]}" y2="{rry}" stroke="{HOT if rcom_on else COLD}" stroke-width="2"/>'
             f'<line x1="{tx+12}" y1="{rry}" x2="{CLEFT+CX["ret"]}" y2="{rry}" stroke="{HOT if rcom_on else COLD}" stroke-width="2"/>'
             f'<line x1="{tx+12}" y1="{y}" x2="{tx+12}" y2="{rry}" stroke="{HOT if rcom_on else COLD}" stroke-width="2"/>')
    e.append(f'<text x="{(tx+CLEFT+CX["ret"])/2}" y="{rry+12}" font-size="8" text-anchor="middle" '
             f'fill="#9a7" >relay common (separate return -> not shared)</text>')

    # ---- 230 V power side: deliberately an open chain (documented simplification) -
    py = pwr_y
    px0 = CLEFT + CX["hot"]
    pumpon = el["pump_running"]
    e.append(f'<rect x="{CLEFT+4}" y="{py-15}" width="{CIRC_W-CLEFT-20}" height="34" rx="6" '
             f'fill="#fbf0f0" stroke="#e2b6b6" stroke-dasharray="4 3"/>')
    e.append(f'<text x="{CLEFT+12}" y="{py-19}" font-size="8.5" fill="#b06">'
             f'230 V power side &#8212; modelled as a chain, not a closed loop (no neutral / capacitor; see sim_spec)</text>')
    e.append(f'<rect x="{CLEFT+CX["xfmr"]-30}" y="{py-7}" width="14" height="14" rx="2" fill="#6b7280"/>'
             f'<text x="{CLEFT+CX["xfmr"]-23}" y="{py-11}" font-size="7" text-anchor="middle" fill="#555">230V</text>')
    pts = [("relay.line", px0, "line"), ("relay.contactor", px0 + 150, "contactor"),
           ("pump.motor", px0 + 320, "motor")]
    e.append(_wire(CLEFT + CX["xfmr"] - 16, py, px0, py, pumpon))
    prev = px0
    for nid, x, lbl in pts:
        seg_on = pumpon
        e.append(_wire(prev, py, x, py, seg_on))
        if nid == "pump.motor":
            node(x, py, "motor", "motor", pumpon, cond.get(nid))
        else:
            node(x, py, "dot", lbl, _intact_for_viz(res, nid), cond.get(nid))
        prev = x
    e.append(f'<text x="{px0+320}" y="{py+22}" font-size="8" text-anchor="middle" fill="#b06">(open end &#8212; no modelled neutral)</text>')
    return "".join(e)


def _intact_for_viz(res, nid):
    # the power-side parts have no energised set; colour them "live" when the
    # pump is running (the engine's gate is relay-coil + all parts intact).
    return res["electrical"]["pump_running"]


CIRC_HEADER = 64


def render_circuit(scenarios):
    parts = []
    for i, (title, req) in enumerate(scenarios):
        res = simulate.simulate(**req)
        parts.append(f'<g transform="translate(0,{CIRC_HEADER + i*CIRC_PANEL_H})">'
                     f'{circuit_panel(title, res, req.get("conditions"), 0)}</g>')
    total_h = CIRC_HEADER + CIRC_PANEL_H * len(scenarios) + 6
    legend = (
        '<text x="18" y="22" font-size="19" font-weight="800" fill="#111">'
        'Irrigation fault simulator &#8212; electrical ladder (controller, relay, wiring)</text>'
        '<text x="18" y="40" font-size="11.5" fill="#555">'
        'Transformer hot bus &#8594; per-zone triac &#8594; field wire &#8594; solenoid coil, all '
        'returning on one shared COMMON bus to the transformer.</text>'
        '<text x="18" y="55" font-size="11.5" fill="#555">'
        'The relay coil has its OWN return (so a broken common drops the zones but not the pump). '
        'Gold = energised, grey = dead, red &#10005; = injected fault.</text>'
    )
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{CIRC_W}" height="{total_h}" '
            f'font-family="Segoe UI, Arial, sans-serif">'
            f'<rect width="{CIRC_W}" height="{total_h}" fill="white"/>{legend}{"".join(parts)}</svg>')


if __name__ == "__main__":
    flow_out = sys.argv[1] if len(sys.argv) > 1 else "scenarios.svg"
    with open(flow_out, "w") as f:
        f.write(render(SCENARIOS))
    print("wrote", flow_out)
    circ_out = sys.argv[2] if len(sys.argv) > 2 else "scenarios_circuit.svg"
    with open(circ_out, "w") as f:
        f.write(render_circuit(SCENARIOS))
    print("wrote", circ_out)
