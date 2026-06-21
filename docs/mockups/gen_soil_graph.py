#!/usr/bin/env python3
"""Generate 3 competing mockups of the Soil-Balance graph (UIX-1,2,4).

Reads soil/example_data.json (the fixture) — no maths in here, just drawing.
Each mockup is one SVG rendered to PNG. They share the data and the
calm/natural palette (UIX-3); they differ only in HOW the cross-section
metaphor is drawn.
"""
import json
import math
import os
import random

import cairosvg

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, "..", "..", "soil", "example_data.json")) as f:
    DATA = json.load(f)

S = DATA["series"]
N = len(S)
TANK = DATA["tankSize"]
TODAY_DATE = "2026-06-21"
try:
    TODAY = next(d["index"] for d in S if d["date"] == TODAY_DATE)
except StopIteration:
    raise ValueError(f"Today's date {TODAY_DATE} not found in the series data.")
MAXRAIN = max(d["rain"] for d in S) or 1
MAXLOSS = max(d["loss"] for d in S) or 1

# ---- calm & natural palette (UIX-3) ----
SKY      = "#eaf3f5"
SKY_FC   = "#f1f5f3"   # forecast sky, even softer
SOIL_DRY = "#e3d2b4"   # parched earth
SOIL_WET = "#9bb07a"   # moist, green-tinged earth
WATER    = "#a7c4a0"
LINE     = "#4a7c59"   # surface moisture line (green)
RAIN     = "#6fa3c0"   # soft blue
SUN      = "#e0a85a"   # warm amber (ET loss)
CAN      = "#5a8a6f"   # watering-can glyph
INK      = "#4f4636"   # earthy text
FAINT    = "#9a8f7a"
FULL_LN  = "#cdbfa3"

W = 384
H = 360
PL, PR = 14, W - 14
SOIL_TOP, SOIL_BOT = 132, 300
SKY_TOP = 40
PLOTW = PR - PL
DAYW = PLOTW / N

def cx(i): return PL + (i + 0.5) * DAYW
def y_of(level): return SOIL_BOT - (level / TANK) * (SOIL_BOT - SOIL_TOP)

def header(title):
    return (
        f'<text x="{PL}" y="24" font-family="Segoe UI,Helvetica,sans-serif" '
        f'font-size="15" font-weight="600" fill="{INK}">{title}</text>'
    )

def today_divider():
    x = PL + TODAY * DAYW
    return (
        f'<line x1="{x:.1f}" y1="{SKY_TOP-4}" x2="{x:.1f}" y2="{SOIL_BOT}" '
        f'stroke="{FAINT}" stroke-width="1" stroke-dasharray="2 3"/>'
        f'<text x="{x+3:.1f}" y="{SKY_TOP+6}" font-family="Segoe UI,sans-serif" '
        f'font-size="9" fill="{FAINT}">today</text>'
    )

def forecast_wash():
    x = PL + TODAY * DAYW
    return (f'<rect x="{x:.1f}" y="{SKY_TOP-4}" width="{PR-x:.1f}" '
            f'height="{SOIL_BOT-(SKY_TOP-4)}" fill="#000000" opacity="0.025"/>')

def axis_labels():
    # tank full / empty + a few weekday ticks
    out = [
        f'<text x="{PR}" y="{SOIL_TOP-3}" text-anchor="end" font-size="9" '
        f'font-family="Segoe UI,sans-serif" fill="{FAINT}">full {TANK:.0f} mm</text>',
        f'<text x="{PR}" y="{SOIL_BOT+12}" text-anchor="end" font-size="9" '
        f'font-family="Segoe UI,sans-serif" fill="{FAINT}">empty</text>',
    ]
    for i in range(0, N, 7):
        out.append(
            f'<text x="{cx(i):.1f}" y="{SOIL_BOT+24}" text-anchor="middle" '
            f'font-size="8.5" font-family="Segoe UI,sans-serif" fill="{FAINT}">'
            f'{S[i]["weekday"][:2]} {S[i]["date"][8:]}</text>')
    return "".join(out)

def svg_open():
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
            f'viewBox="0 0 {W} {H}">'
            f'<rect width="{W}" height="{H}" fill="#fcfbf7"/>')

def surface_pts():
    return [(cx(i), y_of(S[i]["level"])) for i in range(N)]

def smooth_path(pts):
    # simple Catmull-Rom -> cubic bezier for a gentle natural line
    if len(pts) < 2:
        return ""
    d = f'M {pts[0][0]:.1f} {pts[0][1]:.1f} '
    for i in range(len(pts) - 1):
        p0 = pts[i-1] if i > 0 else pts[0]
        p1, p2 = pts[i], pts[i+1]
        p3 = pts[i+2] if i+2 < len(pts) else p2
        c1x = p1[0] + (p2[0]-p0[0])/6
        c1y = p1[1] + (p2[1]-p0[1])/6
        c2x = p2[0] - (p3[0]-p1[0])/6
        c2y = p2[1] - (p3[1]-p1[1])/6
        d += f'C {c1x:.1f} {c1y:.1f} {c2x:.1f} {c2y:.1f} {p2[0]:.1f} {p2[1]:.1f} '
    return d

# ----------------------------------------------------------------------
# Mockup A — continuous cross-section ribbon
#   one soil block, moisture as a flowing filled area, rain as droplet
#   bars hanging from the sky, ET as warm sun ticks at the surface.
# ----------------------------------------------------------------------
def mockup_A():
    pts = surface_pts()
    area = (f'<defs><linearGradient id="soilA" x1="0" y1="0" x2="0" y2="1">'
            f'<stop offset="0" stop-color="{SOIL_WET}"/>'
            f'<stop offset="1" stop-color="{SOIL_DRY}"/></linearGradient></defs>')
    p = smooth_path(pts)
    fill = (f'<path d="{p} L {pts[-1][0]:.1f} {SOIL_BOT} L {pts[0][0]:.1f} '
            f'{SOIL_BOT} Z" fill="url(#soilA)"/>')
    line = f'<path d="{p}" fill="none" stroke="{LINE}" stroke-width="2.5"/>'
    # rain droplet bars from sky band
    rain = []
    for i in range(N):
        r = S[i]["rain"]
        if r <= 0: continue
        h = (r / MAXRAIN) * (SOIL_TOP - SKY_TOP - 6)
        x = cx(i)
        rain.append(f'<line x1="{x:.1f}" y1="{SKY_TOP:.1f}" x2="{x:.1f}" '
                    f'y2="{SKY_TOP+h:.1f}" stroke="{RAIN}" stroke-width="3" '
                    f'stroke-linecap="round" opacity="0.8"/>')
    # ET sun ticks: small amber marks just above the surface line
    et = []
    for i in range(N):
        l = S[i]["loss"]
        x = cx(i)
        ys = y_of(S[i]["level"])
        ln = (l / MAXLOSS) * 9
        et.append(f'<line x1="{x:.1f}" y1="{ys-3:.1f}" x2="{x:.1f}" '
                  f'y2="{ys-3-ln:.1f}" stroke="{SUN}" stroke-width="2" opacity="0.7"/>')
    block = (f'<rect x="{PL}" y="{SOIL_TOP}" width="{PLOTW}" '
             f'height="{SOIL_BOT-SOIL_TOP}" fill="none" stroke="{FULL_LN}"/>')
    legend = (f'<g font-family="Segoe UI,sans-serif" font-size="9.5" fill="{INK}">'
              f'<line x1="{PL}" y1="346" x2="{PL+14}" y2="346" stroke="{RAIN}" '
              f'stroke-width="3"/><text x="{PL+18}" y="349">rain in</text>'
              f'<line x1="{PL+78}" y1="346" x2="{PL+92}" y2="346" stroke="{SUN}" '
              f'stroke-width="3"/><text x="{PL+96}" y="349">ET loss</text>'
              f'<rect x="{PL+158}" y="341" width="12" height="9" fill="{SOIL_WET}"/>'
              f'<text x="{PL+174}" y="349">water held</text></g>')
    return (svg_open() + area + header("Soil moisture &#183; 4-week window")
            + f'<rect x="{PL}" y="{SKY_TOP}" width="{PLOTW}" height="{SOIL_TOP-SKY_TOP}" fill="{SKY}"/>'
            + forecast_wash() + fill + "".join(rain) + line + "".join(et)
            + block + today_divider() + axis_labels() + legend + "</svg>")

# ----------------------------------------------------------------------
# Mockup B — daily soil cores (discrete)
#   29 vertical cores, each filled to its level; surface line connects the
#   tops; rain droplet above each core; watering-can glyph on watered days.
# ----------------------------------------------------------------------
def mockup_B():
    bw = DAYW * 0.7
    cores = []
    for i in range(N):
        d = S[i]
        x = cx(i) - bw/2
        yt = y_of(d["level"])
        frac = d["level"] / TANK
        # wet cores greener, dry cores tan
        col = SOIL_WET if frac > 0.45 else (SOIL_DRY if frac < 0.2 else "#c4c193")
        op = "1" if i < TODAY else "0.55"
        cores.append(f'<rect x="{x:.1f}" y="{yt:.1f}" width="{bw:.1f}" '
                     f'height="{SOIL_BOT-yt:.1f}" rx="1.5" fill="{col}" opacity="{op}"/>')
    line = f'<path d="{smooth_path(surface_pts())}" fill="none" stroke="{LINE}" stroke-width="2"/>'
    glyphs = []
    for i in range(N):
        d = S[i]
        x = cx(i)
        if d["rain"] > 0:
            rr = 1.4 + (d["rain"]/MAXRAIN)*3.2
            gy = SKY_TOP + 18 - (d["rain"]/MAXRAIN)*10
            glyphs.append(f'<circle cx="{x:.1f}" cy="{gy:.1f}" r="{rr:.1f}" '
                          f'fill="{RAIN}" opacity="0.85"/>')
        if d["applied"] > 0:
            glyphs.append(f'<text x="{x:.1f}" y="{SOIL_TOP-3:.1f}" text-anchor="middle" '
                          f'font-size="11" fill="{CAN}">&#128688;</text>')
    block = (f'<rect x="{PL}" y="{SOIL_TOP}" width="{PLOTW}" '
             f'height="{SOIL_BOT-SOIL_TOP}" fill="none" stroke="{FULL_LN}"/>')
    legend = (f'<g font-family="Segoe UI,sans-serif" font-size="9.5" fill="{INK}">'
              f'<circle cx="{PL+6}" cy="346" r="3.5" fill="{RAIN}"/>'
              f'<text x="{PL+14}" y="349">rain (size = mm)</text>'
              f'<rect x="{PL+128}" y="341" width="10" height="9" fill="{SOIL_WET}"/>'
              f'<rect x="{PL+140}" y="341" width="10" height="9" fill="{SOIL_DRY}"/>'
              f'<text x="{PL+154}" y="349">wet &#8594; dry</text></g>')
    return (svg_open() + header("Soil moisture &#183; day by day")
            + f'<rect x="{PL}" y="{SKY_TOP}" width="{PLOTW}" height="{SOIL_TOP-SKY_TOP}" fill="{SKY}"/>'
            + forecast_wash() + "".join(cores) + line + "".join(glyphs)
            + block + today_divider() + axis_labels() + legend + "</svg>")

# ----------------------------------------------------------------------
# Mockup C — layered flux (why-focused)
#   soil block with a depth-graded moisture fill; at the surface each day
#   shows the push/pull: blue inflow wedge coming down (rain+water) and
#   amber outflow wedge going up (ET) — the "why" reads as arrows.
# ----------------------------------------------------------------------
def mockup_C():
    pts = surface_pts()
    grad = (f'<defs><linearGradient id="soilC" x1="0" y1="0" x2="0" y2="1">'
            f'<stop offset="0" stop-color="{WATER}"/>'
            f'<stop offset="0.55" stop-color="{SOIL_WET}"/>'
            f'<stop offset="1" stop-color="#7d8a5a"/></linearGradient></defs>')
    p = smooth_path(pts)
    fill = (f'<path d="{p} L {pts[-1][0]:.1f} {SOIL_BOT} L {pts[0][0]:.1f} '
            f'{SOIL_BOT} Z" fill="url(#soilC)"/>')
    line = f'<path d="{p}" fill="none" stroke="{LINE}" stroke-width="2.5"/>'
    flux = []
    for i in range(N):
        d = S[i]
        x = cx(i)
        ys = y_of(d["level"])
        inflow = d["gain"]
        outflow = d["loss"]
        # blue inflow wedge above surface pointing down
        if inflow > 0.05:
            hh = min(26, inflow * 3.0)
            flux.append(f'<path d="M {x-2.6:.1f} {ys-hh-4:.1f} L {x+2.6:.1f} '
                        f'{ys-hh-4:.1f} L {x:.1f} {ys-4:.1f} Z" fill="{RAIN}" opacity="0.85"/>')
        # amber outflow wedge above pointing up
        if outflow > 0.05:
            hh = min(26, outflow * 3.0)
            xo = x + 0.0
            flux.append(f'<path d="M {xo-2.6:.1f} {ys-6:.1f} L {xo+2.6:.1f} '
                        f'{ys-6:.1f} L {xo:.1f} {ys-6-hh:.1f} Z" fill="{SUN}" opacity="0.55"/>')
    block = (f'<rect x="{PL}" y="{SOIL_TOP}" width="{PLOTW}" '
             f'height="{SOIL_BOT-SOIL_TOP}" fill="none" stroke="{FULL_LN}"/>')
    legend = (f'<g font-family="Segoe UI,sans-serif" font-size="9.5" fill="{INK}">'
              f'<path d="M {PL}  342 L {PL+10} 342 L {PL+5} 350 Z" fill="{RAIN}"/>'
              f'<text x="{PL+15}" y="349">water in</text>'
              f'<path d="M {PL+80} 350 L {PL+90} 350 L {PL+85} 342 Z" fill="{SUN}" opacity="0.7"/>'
              f'<text x="{PL+95}" y="349">water out (ET)</text></g>')
    return (svg_open() + grad + header("Soil moisture &#183; in vs out")
            + f'<rect x="{PL}" y="{SKY_TOP}" width="{PLOTW}" height="{SOIL_TOP-SKY_TOP}" fill="{SKY}"/>'
            + forecast_wash() + fill + "".join(flux) + line
            + block + today_divider() + axis_labels() + legend + "</svg>")

# ----------------------------------------------------------------------
# Mockup D — weather sky (literal)
#   the moisture line/area stays clean; the daily "why" lives in the sky as
#   real weather: blue rain falling (water in) and a warm sun (heat that
#   dries the soil out). In vs out reads at a glance — rain is blue and
#   falls, the sun is amber and glows. Nothing sits on the line.
# ----------------------------------------------------------------------
def sun_glyph(x, y, r, op):
    rays = []
    for k in range(8):
        a = k * math.pi / 4
        rays.append(
            f'<line x1="{x+math.cos(a)*(r+1.5):.1f}" y1="{y+math.sin(a)*(r+1.5):.1f}" '
            f'x2="{x+math.cos(a)*(r+4):.1f}" y2="{y+math.sin(a)*(r+4):.1f}" '
            f'stroke="{SUN}" stroke-width="1.1" stroke-linecap="round" opacity="{op}"/>')
    return (f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{SUN}" '
            f'opacity="{op}"/>' + "".join(rays))

def raindrop(x, y, s, op, color=RAIN):
    # small teardrop: a circle with a pointed top
    return (f'<path d="M {x:.1f} {y-2*s:.1f} Q {x+s:.1f} {y-s*0.3:.1f} {x:.1f} {y:.1f} '
            f'Q {x-s:.1f} {y-s*0.3:.1f} {x:.1f} {y-2*s:.1f} Z" '
            f'fill="{color}" opacity="{op}"/>')

def watering_can(x, gy, scale=1.0):
    # compact watering can tipped to pour, with green water falling from the
    # rose down toward the soil. gy is the can's top edge; x its centre.
    c = CAN
    u = scale
    body = (f'<path d="M {x-3.5*u:.1f} {gy:.1f} h {7*u:.1f} v {5*u:.1f} '
            f'q 0 {2*u:.1f} {-2*u:.1f} {2*u:.1f} h {-3*u:.1f} '
            f'q {-2*u:.1f} 0 {-2*u:.1f} {-2*u:.1f} z" fill="{c}"/>')
    rim = (f'<rect x="{x-4.2*u:.1f}" y="{gy-1.6*u:.1f}" width="{8.4*u:.1f}" '
           f'height="{2*u:.1f}" rx="{u:.1f}" fill="{c}"/>')
    handle = (f'<path d="M {x-2*u:.1f} {gy-0.8*u:.1f} q {3*u:.1f} {-5.5*u:.1f} '
              f'{6*u:.1f} 0" stroke="{c}" stroke-width="{1.3*u:.1f}" fill="none"/>')
    spout = (f'<path d="M {x+3*u:.1f} {gy+1.5*u:.1f} l {5*u:.1f} {-3*u:.1f} '
             f'l {1*u:.1f} {2*u:.1f} l {-4.5*u:.1f} {3*u:.1f} z" fill="{c}"/>')
    # water from the rose tip (upper-right) falling down to the soil
    tipx = x + 8.5 * u
    drops = "".join(
        raindrop(tipx, gy + 2 + k * 4.5, 1.6 * u, "0.9", color=c) for k in range(3))
    return body + rim + handle + spout + drops

def soil_texture(seed=7):
    # deterministic earthy speckle + a few pebbles + faint strata, so the
    # block reads as real soil rather than a flat fill. Clipped to the block.
    rnd = random.Random(seed)
    out = []
    for fy in (0.30, 0.56, 0.80):
        y = SOIL_TOP + fy * (SOIL_BOT - SOIL_TOP)
        out.append(f'<line x1="{PL}" y1="{y:.1f}" x2="{PR}" y2="{y:.1f}" '
                   f'stroke="#6f5236" stroke-width="1" opacity="0.06"/>')
    shades = ["#6f5236", "#7d5d3e", "#b9966a", "#caa878", "#8a6a45"]
    for _ in range(240):
        x = rnd.uniform(PL + 1, PR - 1)
        y = rnd.uniform(SOIL_TOP + 1, SOIL_BOT - 1)
        r = rnd.uniform(0.5, 1.5)
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.2f}" '
                   f'fill="{rnd.choice(shades)}" opacity="{rnd.uniform(0.15, 0.4):.2f}"/>')
    for _ in range(7):
        x = rnd.uniform(PL + 8, PR - 8)
        y = rnd.uniform(SOIL_TOP + 36, SOIL_BOT - 8)
        rx = rnd.uniform(2.4, 3.8)
        out.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{rx:.1f}" '
                   f'ry="{rx*rnd.uniform(0.6,0.8):.1f}" fill="#9b8b76" opacity="0.5"/>')
    return "".join(out)

def roots(x, gy):
    # a taproot + laterals reaching down into the root zone (the block)
    col = "#6b5235"
    rd = 0.6 * (SOIL_BOT - SOIL_TOP)
    tap = (f'<path d="M {x:.1f} {gy:.1f} C {x+3:.1f} {gy+rd*0.35:.1f} '
           f'{x-3:.1f} {gy+rd*0.7:.1f} {x+1:.1f} {gy+rd:.1f}" stroke="{col}" '
           f'stroke-width="1.4" fill="none" opacity="0.75" stroke-linecap="round"/>')
    lats = []
    for fy, dxn in [(0.28, -1), (0.5, 1), (0.72, -1)]:
        y0 = gy + rd * fy
        lats.append(f'<path d="M {x:.1f} {y0:.1f} q {dxn*7:.1f} 5 {dxn*12:.1f} 11" '
                    f'stroke="{col}" stroke-width="1" fill="none" opacity="0.6" '
                    f'stroke-linecap="round"/>')
    return tap + "".join(lats)

def flower(x, gy, health):
    # a flower on the surface whose vigour tracks the day's moisture: upright
    # and bright when wet, bowed and faded when the root zone runs dry.
    health = max(0.0, min(1.0, health))
    dr = 1.0 - health
    stem_col = "#6f9a5b" if health > 0.35 else "#9a9a6e"
    if health > 0.5:
        petal_col = "#e6967c"
    elif health > 0.2:
        petal_col = "#d8a98f"
    else:
        petal_col = "#bcab95"
    ctr_col = "#ecc766" if health > 0.3 else "#cdbb8c"
    h = 23
    tipx = x + dr * 10
    tipy = gy - h + dr * 16
    c1x = x + dr * 3
    c1y = gy - h * 0.55
    stem = (f'<path d="M {x:.1f} {gy:.1f} Q {c1x:.1f} {c1y:.1f} {tipx:.1f} {tipy:.1f}" '
            f'stroke="{stem_col}" stroke-width="2" fill="none" stroke-linecap="round"/>')
    lx, ly = (x + c1x) / 2 - 2, (gy + c1y) / 2
    leaf = (f'<ellipse cx="{lx:.1f}" cy="{ly:.1f}" rx="3.6" ry="1.8" fill="{stem_col}" '
            f'opacity="0.9" transform="rotate({-35 + dr*40:.0f} {lx:.1f} {ly:.1f})"/>')
    hr = 3.4 + 1.8 * health
    petals = []
    for k in range(6):
        a = k * math.pi / 3 + dr * 0.4
        px = tipx + math.cos(a) * hr
        py = tipy + math.sin(a) * hr
        petals.append(
            f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{hr*0.62:.1f}" ry="{hr*0.34:.1f}" '
            f'fill="{petal_col}" opacity="0.92" '
            f'transform="rotate({math.degrees(a):.0f} {px:.1f} {py:.1f})"/>')
    center = f'<circle cx="{tipx:.1f}" cy="{tipy:.1f}" r="{hr*0.5:.1f}" fill="{ctr_col}"/>'
    fallen = ""
    if health < 0.15:
        fallen = (f'<ellipse cx="{x+5:.1f}" cy="{gy-1:.1f}" rx="2" ry="1" '
                  f'fill="{petal_col}" opacity="0.7"/>'
                  f'<ellipse cx="{x-4:.1f}" cy="{gy:.1f}" rx="1.8" ry="0.9" '
                  f'fill="{petal_col}" opacity="0.55"/>')
    return stem + leaf + "".join(petals) + center + fallen

def mockup_D():
    pts = surface_pts()
    defs = (
        '<defs>'
        '<linearGradient id="earth" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#8b6a47"/>'
        '<stop offset="0.3" stop-color="#a37f55"/>'
        '<stop offset="1" stop-color="#c8ad83"/></linearGradient>'
        '<linearGradient id="water" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#86bcd8"/>'
        '<stop offset="1" stop-color="#5e94b3"/></linearGradient>'
        f'<clipPath id="blk"><rect x="{PL}" y="{SOIL_TOP}" width="{PLOTW}" '
        f'height="{SOIL_BOT-SOIL_TOP}"/></clipPath></defs>')
    p = smooth_path(pts)
    soil_bg = (f'<rect x="{PL}" y="{SOIL_TOP}" width="{PLOTW}" '
               f'height="{SOIL_BOT-SOIL_TOP}" fill="url(#earth)"/>')
    water = (f'<path d="{p} L {pts[-1][0]:.1f} {SOIL_BOT} L {pts[0][0]:.1f} '
             f'{SOIL_BOT} Z" fill="url(#water)" opacity="0.66"/>')
    flower_idx = list(range(2, N, 4))
    roots_svg = "".join(roots(cx(i), SOIL_TOP) for i in flower_idx)
    flowers_svg = "".join(
        flower(cx(i), SOIL_TOP, S[i]["level"] / TANK) for i in flower_idx)
    soil_group = (f'<g clip-path="url(#blk)">{soil_bg}{soil_texture()}{water}'
                  f'{roots_svg}</g>')
    # the water table — top of the held water, smoothed
    water_top = (f'<path d="{p}" fill="none" stroke="#3f7e9c" stroke-width="2.5" '
                 f'clip-path="url(#blk)"/>')
    # the ground surface line (top of the soil block)
    ground = (f'<line x1="{PL}" y1="{SOIL_TOP}" x2="{PR}" y2="{SOIL_TOP}" '
              f'stroke="#6f5236" stroke-width="2" opacity="0.7"/>')

    weather = []
    sun_y = SKY_TOP + 20
    for i in range(N):
        d = S[i]
        x = cx(i)
        # sun for the heat that pulls water out — size by ET loss, only when
        # it's a meaningfully drying day so the sky stays calm on mild ones.
        if d["loss"] >= 0.35 * MAXLOSS:
            r = 2.6 + (d["loss"] / MAXLOSS) * 4.4
            op = 0.30 + (d["loss"] / MAXLOSS) * 0.45
            weather.append(sun_glyph(x, sun_y, r, f"{op:.2f}"))
        # rain falling — water in. Droplet count + size scale with mm.
        if d["rain"] > 0.2:
            drops = min(3, 1 + int(d["rain"] / 4))
            s = 1.6 + (d["rain"] / MAXRAIN) * 2.4
            for k in range(drops):
                dy = SKY_TOP + 44 + k * (s * 2.6 + 2)
                weather.append(raindrop(x, dy, s, "0.8"))
        # hose watering — a watering can pouring onto the soil that day, set
        # at ground level and clearly different from sky weather.
        if d["applied"] > 0:
            weather.append(watering_can(x, SOIL_TOP - 16))

    watered = any(d["applied"] > 0 for d in S)
    block = (f'<rect x="{PL}" y="{SOIL_TOP}" width="{PLOTW}" '
             f'height="{SOIL_BOT-SOIL_TOP}" fill="none" stroke="{FULL_LN}"/>')
    last = (f'<g font-family="Segoe UI,sans-serif" font-size="9.5" fill="{INK}">'
            + watering_can(PL + 218, 340, 0.85)
            + f'<text x="{PL+232}" y="349">you watered</text></g>') if watered else (
            f'<g font-family="Segoe UI,sans-serif" font-size="9.5" fill="{INK}">'
            + f'<rect x="{PL+218}" y="341" width="12" height="9" fill="#6fa9c9"/>'
            + f'<text x="{PL+234}" y="349">water held</text></g>')
    legend = (f'<g font-family="Segoe UI,sans-serif" font-size="9.5" fill="{INK}">'
              + sun_glyph(PL + 5, 345, 4, "0.7")
              + f'<text x="{PL+16}" y="349">sun dries it out</text>'
              + raindrop(PL + 118, 348, 2.6, "0.8")
              + f'<text x="{PL+126}" y="349">rain feeds it</text></g>' + last)
    return (svg_open() + defs + header("Soil moisture &#183; rain vs sun")
            + f'<rect x="{PL}" y="{SKY_TOP}" width="{PLOTW}" height="{SOIL_TOP-SKY_TOP}" fill="{SKY}"/>'
            + soil_group + forecast_wash() + ground + water_top
            + "".join(weather) + flowers_svg
            + block + today_divider() + axis_labels() + legend + "</svg>")

def watered_series(indices):
    # What-if: same fixture weather, but water on the given days and re-run
    # the balance by the spec's own rule (LOG-3): gain = rain*0.8 +
    # dose*0.9, level = clamp(prev + gain - loss, 0, tank). The committed
    # fixture is untouched; this only exists to show the watered state,
    # which the all-dry fixture never reaches.
    eff_rain, eff_water = 0.8, 0.9
    dose = DATA["dose"]
    wi = set(indices)
    out = []
    prev = TANK
    for d in S:
        applied = dose if d["index"] in wi else 0
        gain = d["rain"] * eff_rain + applied * eff_water
        level = max(0.0, min(TANK, prev + gain - d["loss"]))
        out.append(dict(d, start=prev, applied=applied, gain=gain, level=level))
        prev = level
    return out


def render(name, svg):
    path = os.path.join(HERE, f"soil-graph-{name}.svg")
    with open(path, "w") as out:
        out.write(svg)
    cairosvg.svg2png(bytestring=svg.encode(), write_to=path.replace(".svg", ".png"), scale=2)
    print("wrote", path.replace(".svg", ".png"))


for name, fn in [("A-ribbon", mockup_A), ("B-cores", mockup_B),
                 ("C-flux", mockup_C), ("D-weather", mockup_D)]:
    render(name, fn())

# Watered what-if on the weather-sky mockup: water through the dry spell so
# the green hose-droplets and their lift on the line are both visible.
S = watered_series([15, 17, 19, 21, 23])
render("D-watered", mockup_D())
