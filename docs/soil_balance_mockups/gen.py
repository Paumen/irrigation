#!/usr/bin/env python3
"""Soil-Balance Tool — main-screen mockup (UI interpretation partial).

Renders docs/soil_balance_mockups/svg/UI1-UI7-screen.svg and a same-named PNG.
The chart is drawn as a soil cross-section: blue = water stored in the root
zone (saturation) filling bottom-up to the day's moisture level, tan = dry
soil, grass on top, rain/watering as droplets. The moisture level is the
water-table surface. Checks UI-1 (saturation + per-day temp + daily water in/
out), UI-2/UI-4 (click-to-water dose), UI-5/UI-9 (presets), UI-6 (pan),
UI-7 (stress threshold). Illustrative data only.
"""
import os
import random
from datetime import date, timedelta
import cairosvg

W, H = 1000, 562
X0, X1 = 80, 940
N = 18
STEP = (X1 - X0) / (N - 1)
TODAY = 9
TODAY_DATE = date(2026, 6, 19)


def xi(i): return X0 + i * STEP


# --- illustrative data (18 days) ---
soil = [74, 68, 71, 63, 60, 52, 46, 40, 35, 44, 40, 36, 33, 29, 38, 34, 31, 28]  # % saturation
temp = [19, 21, 22, 24, 26, 27, 25, 28, 29, 30, 28, 27, 26, 29, 31, 28, 26, 25]
LEVEL_START = 20.0
level = [p / 4 for p in soil]
delta = [level[i] - (level[i - 1] if i else LEVEL_START) for i in range(N)]
watered = {9, 14}
rain_days = {i for i in range(N) if delta[i] > 0 and i not in watered}

# --- soil cross-section geometry ---
SKY_TOP, Y_SURF, Y_BOT = 150, 186, 398     # sky / ground surface / root-zone bottom
def ys(p): return Y_BOT - (p / 100) * (Y_BOT - Y_SURF)   # water-table y for saturation %
THR = 50
y_thr = ys(THR)

# --- colours ---
C_SKY = "#eaf4fb"; C_DRY = "#e7d9bd"; C_GRAIN = "#cdb993"
C_GRASS = "#5fae3f"; C_WTOP = "#cfe8f7"; C_WBOT = "#3f86bd"; C_WLINE = "#1f6f9e"
C_THR = "#c62828"; C_BAND = "#f7d9d6"; C_WATER = "#1e88e5"; C_RAIN = "#5aa9e0"
C_TODAY = "#fff7d6"; C_TXT = "#37474f"; C_MUT = "#78909c"
C_PANEL = "#f6f8fa"; C_LINE = "#cfd8dc"

s = []
s.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
         f'viewBox="0 0 {W} {H}" font-family="Segoe UI, Helvetica, Arial, sans-serif">')
s.append('<defs>'
         f'<linearGradient id="sat" x1="0" y1="0" x2="0" y2="1">'
         f'<stop offset="0" stop-color="{C_WTOP}"/><stop offset="1" stop-color="{C_WBOT}"/>'
         f'</linearGradient></defs>')
s.append(f'<rect width="{W}" height="{H}" fill="#ffffff"/>')

# header
s.append(f'<text x="40" y="34" font-size="20" font-weight="700" fill="{C_TXT}">Soil-Balance</text>')
s.append(f'<text x="362" y="34" font-size="13" fill="{C_MUT}">Vormersesluisweg 3A, Wijchen &#183; one zone</text>')

# control pills
def pill(x, w, label, value, sub=None):
    s.append(f'<rect x="{x}" y="52" width="{w}" height="46" rx="9" fill="{C_PANEL}" stroke="{C_LINE}"/>')
    s.append(f'<text x="{x+12}" y="70" font-size="10.5" fill="{C_MUT}">{label}</text>')
    s.append(f'<text x="{x+12}" y="89" font-size="14" font-weight="600" fill="{C_TXT}">{value}</text>')
    if sub:
        s.append(f'<text x="{x+w-12}" y="89" font-size="11" fill="{C_MUT}" text-anchor="end">{sub}</text>')

pill(40, 150, "SOIL TYPE", "Sandy ▾", "25 mm")
pill(200, 150, "PLANTING", "Turf ▾", "Kᴄ 0.9")
pill(360, 210, "WATERING DURATION", "60 min", "≈ 2.8 mm net")
pill(580, 150, "STRESS THRESHOLD", "50%", "depletion")
s.append(f'<text x="{W-40}" y="74" font-size="10.5" fill="{C_MUT}" text-anchor="end">RESERVOIR (derived)</text>')
s.append(f'<text x="{W-40}" y="91" font-size="14" font-weight="600" fill="{C_TXT}" text-anchor="end">25 mm usable</text>')

# title that says what the picture is
s.append(f'<text x="40" y="140" font-size="13" font-weight="600" fill="{C_TXT}">How much water is in the soil</text>')
s.append(f'<text x="262" y="140" font-size="11" fill="{C_MUT}">blue = water the roots can use &#183; tan = dry soil</text>')

# today highlight band
bx = xi(TODAY) - STEP / 2
s.append(f'<rect x="{bx:.1f}" y="{SKY_TOP}" width="{STEP:.1f}" height="{Y_BOT-SKY_TOP+2:.1f}" fill="{C_TODAY}" opacity="0.7"/>')

# --- soil cross-section ---
# sky
s.append(f'<rect x="{X0}" y="{SKY_TOP}" width="{X1-X0:.1f}" height="{Y_SURF-SKY_TOP}" fill="{C_SKY}"/>')
# dry soil body
s.append(f'<rect x="{X0}" y="{Y_SURF}" width="{X1-X0:.1f}" height="{Y_BOT-Y_SURF}" fill="{C_DRY}"/>')
# soil grain texture
random.seed(7)
grains = []
for _ in range(150):
    gx = random.uniform(X0 + 3, X1 - 3)
    gy = random.uniform(Y_SURF + 6, Y_BOT - 3)
    r = random.uniform(1.0, 2.1)
    grains.append(f'<circle cx="{gx:.1f}" cy="{gy:.1f}" r="{r:.1f}" fill="{C_GRAIN}" opacity="0.55"/>')
s.append("".join(grains))
# water saturation: area under the moisture line, down to the bottom (grains show through)
wpts = " ".join(f"{xi(i):.1f},{ys(soil[i]):.1f}" for i in range(N))
s.append(f'<polygon points="{X0},{Y_BOT} {wpts} {X1},{Y_BOT}" fill="url(#sat)" opacity="0.82"/>')
# grass strip on the surface
s.append(f'<rect x="{X0}" y="{Y_SURF-4}" width="{X1-X0:.1f}" height="4" fill="{C_GRASS}"/>')
blades = []
gx = X0 + 4
while gx < X1:
    blades.append(f'<path d="M {gx:.1f} {Y_SURF-4} l -1.6 -5 M {gx:.1f} {Y_SURF-4} l 1.6 -6" '
                  f'stroke="{C_GRASS}" stroke-width="1.1" fill="none"/>')
    gx += 7
s.append("".join(blades))

# saturation axis labels (Wet/Dry) + stress threshold (UI-7)
s.append(f'<text x="{X0-10}" y="{Y_SURF+4:.1f}" font-size="10" fill="{C_MUT}" text-anchor="end">100%</text>')
s.append(f'<text x="{X0-10}" y="{Y_BOT:.1f}" font-size="10" fill="{C_MUT}" text-anchor="end">0%</text>')
s.append(f'<text x="{X0-10}" y="{Y_SURF+16:.1f}" font-size="9" fill="{C_WLINE}" text-anchor="end">wet</text>')
s.append(f'<text x="{X0-10}" y="{Y_BOT-6:.1f}" font-size="9" fill="{C_DRY}" text-anchor="end">dry</text>')
s.append(f'<line x1="{X0}" y1="{y_thr:.1f}" x2="{X1}" y2="{y_thr:.1f}" stroke="{C_THR}" '
         f'stroke-width="1.6" stroke-dasharray="6 4"/>')
s.append(f'<text x="{X1-4}" y="{y_thr-6:.1f}" font-size="10.5" fill="{C_THR}" text-anchor="end">stress threshold &#8212; turf starts to wilt below 50%</text>')

# water-table line + day markers (UI-2)
s.append(f'<polyline points="{wpts}" fill="none" stroke="{C_WLINE}" stroke-width="2.4"/>')
for i in range(N):
    if i in watered:
        s.append(f'<circle cx="{xi(i):.1f}" cy="{ys(soil[i]):.1f}" r="5.5" fill="#fff" stroke="{C_WATER}" stroke-width="2.4"/>')
    else:
        s.append(f'<circle cx="{xi(i):.1f}" cy="{ys(soil[i]):.1f}" r="2.4" fill="{C_WLINE}"/>')

# air-temperature numbers along the top of the sky (UI-1)
s.append(f'<text x="{X0-10}" y="{SKY_TOP+13:.1f}" font-size="9" fill="{C_MUT}" text-anchor="end">air °C</text>')
for i in range(N):
    s.append(f'<text x="{xi(i):.1f}" y="{SKY_TOP+13:.1f}" font-size="10.5" fill="{C_MUT}" text-anchor="middle">{temp[i]}°</text>')

# rain / watering droplets falling from the sky (the day's water IN)
def droplet(cx, cy, col, k=1.0):
    return (f'<path d="M {cx:.1f} {cy:.1f} q {6*k:.1f} {8*k:.1f} 0 {13*k:.1f} '
            f'q {-6*k:.1f} {-5*k:.1f} 0 {-13*k:.1f} z" fill="{col}"/>')
for i in rain_days:
    for dx in (-4, 4):
        s.append(droplet(xi(i) + dx, Y_SURF - 16, C_RAIN, 0.6))
for i in watered:
    for dx in (-6, 0, 6):
        s.append(droplet(xi(i) + dx, Y_SURF - 18, C_WATER, 0.7))

# today readout callout (states the value; not a verdict)
ty = ys(soil[TODAY])
s.append(f'<rect x="{xi(TODAY)-26:.1f}" y="{ty-34:.1f}" width="52" height="22" rx="5" fill="{C_WLINE}"/>')
s.append(f'<text x="{xi(TODAY):.1f}" y="{ty-19:.1f}" font-size="12" font-weight="700" fill="#fff" text-anchor="middle">{soil[TODAY]}%</text>')
s.append(f'<path d="M {xi(TODAY)-5:.1f} {ty-12:.1f} L {xi(TODAY)+5:.1f} {ty-12:.1f} L {xi(TODAY):.1f} {ty-5:.1f} z" fill="{C_WLINE}"/>')

# --- day axis: weekday + date (UI-2) ---
AX1, AX2 = 420, 435
for i in range(N):
    d = TODAY_DATE + timedelta(days=i - TODAY)
    is_today = (i == TODAY)
    fill = C_TXT if is_today else C_MUT
    wt = "700" if is_today else "400"
    wd = "Today" if is_today else d.strftime("%a")
    s.append(f'<text x="{xi(i):.1f}" y="{AX1}" font-size="10.5" fill="{fill}" font-weight="{wt}" text-anchor="middle">{wd}</text>')
    s.append(f'<text x="{xi(i):.1f}" y="{AX2}" font-size="10" fill="{fill}" font-weight="{wt}" text-anchor="middle">{d.day} Jun</text>')

# pan (UI-6)
midy = (Y_SURF + Y_BOT) / 2
s.append(f'<text x="{X0-30}" y="{midy:.0f}" font-size="22" fill="{C_LINE}">‹</text>')
s.append(f'<text x="{X1+12}" y="{midy:.0f}" font-size="22" fill="{C_LINE}">›</text>')
s.append(f'<text x="{W/2:.0f}" y="454" font-size="10" fill="{C_MUT}" text-anchor="middle">'
         f'← scroll to the 32 run-up days &#183; or 8 more forecast days →</text>')

# --- legend ---
LY = 488
def chip(x, kind, label):
    if kind == "water":
        s.append(f'<rect x="{x}" y="{LY-12}" width="16" height="13" fill="url(#sat)"/>')
    elif kind == "dry":
        s.append(f'<rect x="{x}" y="{LY-12}" width="16" height="13" fill="{C_DRY}"/>')
        s.append(f'<circle cx="{x+5}" cy="{LY-7}" r="1.4" fill="{C_GRAIN}"/><circle cx="{x+11}" cy="{LY-4}" r="1.4" fill="{C_GRAIN}"/>')
    elif kind == "dash":
        s.append(f'<line x1="{x}" y1="{LY-5}" x2="{x+22}" y2="{LY-5}" stroke="{C_THR}" stroke-width="1.6" stroke-dasharray="5 3"/>')
    elif kind == "drop":
        s.append(droplet(x + 7, LY - 13, C_WATER, 0.7))
    s.append(f'<text x="{x+(30 if kind!="dash" else 28)}" y="{LY}" font-size="11" fill="{C_TXT}">{label}</text>')

chip(40, "water", "water in soil")
chip(180, "dry", "dry soil")
chip(300, "dash", "stress threshold")
chip(450, "drop", "rain / watering")
s.append(f'<circle cx="617" cy="{LY-5}" r="5" fill="#fff" stroke="{C_WATER}" stroke-width="2"/>')
s.append(f'<text x="628" y="{LY}" font-size="11" fill="{C_TXT}">a day you watered (click to toggle)</text>')

s.append(f'<rect x="40" y="{LY+18}" width="{W-80}" height="0.8" fill="{C_LINE}"/>')
s.append(f'<text x="40" y="{LY+44}" font-size="11" fill="{C_MUT}">'
         f'Click any day to apply / cancel a 60-min dose (past or future). '
         f'Illustrative data &#183; static page, settings reset on reload.</text>')

s.append('</svg>')
svg = "\n".join(s)

here = os.path.dirname(os.path.abspath(__file__))
svg_path = os.path.join(here, "svg", "UI1-UI7-screen.svg")
png_path = os.path.join(here, "UI1-UI7-screen.png")
with open(svg_path, "w") as f:
    f.write(svg)
cairosvg.svg2png(bytestring=svg.encode(), write_to=png_path, output_width=W * 2, output_height=H * 2)
print("wrote", svg_path)
print("wrote", png_path)
