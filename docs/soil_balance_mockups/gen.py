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
import math
import random
from datetime import date, timedelta
import cairosvg

W, H = 1000, 568
X0, X1 = 80, 940
N = 18
STEP = (X1 - X0) / (N - 1)
TODAY = 9
TODAY_DATE = date(2026, 6, 19)


def xi(i): return X0 + i * STEP


# --- illustrative data (18 days), as the day's water components in mm ---
temp  = [23, 25, 27, 29, 32, 33, 30, 34, 35, 36, 33, 32, 31, 35, 37, 34, 31, 30]  # daily max °C
decl  = [1.5, 1.5, 1.3, 2.0, 1.5, 2.0, 1.5, 1.5, 1.25, 1.5, 1.0, 1.0, 0.75, 1.0, 1.5, 1.0, 0.75, 0.75]  # ET demand out
rain  = [0, 0, 2.0, 0, 0.75, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]                                      # effective rain in
water = [0, 0, 0, 0, 0, 0, 0, 0, 0, 2.85, 0, 0, 0, 0, 2.85, 0, 0, 0]                                     # watering in (net)
LEVEL_START = 20.0                          # mm at end of the day before the window
level, _L = [], LEVEL_START
for i in range(N):
    _L = max(0.0, min(25.0, _L + rain[i] + water[i] - decl[i]))
    level.append(_L)
soil = [L / 25 * 100 for L in level]        # % saturation
watered = {i for i in range(N) if water[i] > 0}
rain_days = {i for i in range(N) if rain[i] > 0}

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
C_PANEL = "#f6f8fa"; C_LINE = "#cfd8dc"; C_SUN = "#f6b73c"

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
# sun on top of the scene (UI-1 — the day's energy that drives ET out)
sun_x, sun_y, sun_r = X1 - 22, SKY_TOP + 19, 8
rays = []
for ang in range(0, 360, 45):
    a = math.radians(ang)
    rays.append(f'<line x1="{sun_x+(sun_r+2)*math.cos(a):.1f}" y1="{sun_y+(sun_r+2)*math.sin(a):.1f}" '
                f'x2="{sun_x+(sun_r+6)*math.cos(a):.1f}" y2="{sun_y+(sun_r+6)*math.sin(a):.1f}" '
                f'stroke="{C_SUN}" stroke-width="1.8" stroke-linecap="round"/>')
s.append("".join(rays))
s.append(f'<circle cx="{sun_x}" cy="{sun_y}" r="{sun_r}" fill="{C_SUN}"/>')
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

# planting: turf + flowers + leafy plants, each with roots into the soil (UI-9 / MOD-7)
C_ROOT = "#6b4f2a"; C_STEM = "#3f8a2e"
plants = [  # (x, kind, petal-colour, root-depth fraction of root zone)
    (X0 + 55, "flower", "#e57399", 0.46),
    (X0 + 175, "plant",  None,      0.40),
    (X0 + 320, "flower", "#b06fd6", 0.52),
    (X0 + 470, "plant",  None,      0.44),
    (X0 + 615, "flower", "#e8743b", 0.50),
    (X0 + 745, "plant",  None,      0.42),
    (X0 + 860, "flower", "#e57399", 0.48),
]
ROOTZ = Y_BOT - Y_SURF

def roots(x, frac):
    d = ROOTZ * frac
    return (f'<path d="M {x:.1f} {Y_SURF} C {x-4:.1f} {Y_SURF+d*0.3:.1f} {x+5:.1f} {Y_SURF+d*0.6:.1f} {x:.1f} {Y_SURF+d:.1f}" stroke="{C_ROOT}" stroke-width="1.6" fill="none" opacity="0.6"/>'
            f'<path d="M {x:.1f} {Y_SURF+d*0.28:.1f} q -12 {d*0.22:.1f} -16 {d*0.46:.1f}" stroke="{C_ROOT}" stroke-width="1" fill="none" opacity="0.45"/>'
            f'<path d="M {x:.1f} {Y_SURF+d*0.48:.1f} q 12 {d*0.16:.1f} 15 {d*0.4:.1f}" stroke="{C_ROOT}" stroke-width="1" fill="none" opacity="0.45"/>')

# roots first (over the water, under the surface greenery)
s.append("".join(roots(x, frac) for x, _, _, frac in plants))

# grass strip + blades on the surface
s.append(f'<rect x="{X0}" y="{Y_SURF-4}" width="{X1-X0:.1f}" height="4" fill="{C_GRASS}"/>')
blades = []
gx = X0 + 4
while gx < X1:
    blades.append(f'<path d="M {gx:.1f} {Y_SURF-4} l -1.6 -5 M {gx:.1f} {Y_SURF-4} l 1.6 -6" '
                  f'stroke="{C_GRASS}" stroke-width="1.1" fill="none"/>')
    gx += 7
s.append("".join(blades))

def flower(x, petal):
    cy = Y_SURF - 32
    out = [f'<line x1="{x:.1f}" y1="{Y_SURF-4}" x2="{x:.1f}" y2="{cy+5:.1f}" stroke="{C_STEM}" stroke-width="1.7"/>',
           f'<path d="M {x:.1f} {Y_SURF-15:.1f} q -9 -2 -12 -9 q 9 -1 12 5 z" fill="{C_STEM}"/>']
    for ang in range(0, 360, 72):
        rx = x + 6.5 * math.cos(math.radians(ang)); ry = cy + 6.5 * math.sin(math.radians(ang))
        out.append(f'<circle cx="{rx:.1f}" cy="{ry:.1f}" r="4.2" fill="{petal}"/>')
    out.append(f'<circle cx="{x:.1f}" cy="{cy:.1f}" r="3.3" fill="#f6c344"/>')
    return "".join(out)

def plant(x):
    out = [f'<line x1="{x:.1f}" y1="{Y_SURF-4}" x2="{x:.1f}" y2="{Y_SURF-22:.1f}" stroke="{C_STEM}" stroke-width="1.7"/>']
    for dx, dy in [(-9, -11), (9, -13), (-7, -19), (7, -21), (0, -26)]:
        rot = -32 if dx < 0 else (32 if dx > 0 else 0)
        out.append(f'<ellipse cx="{x+dx:.1f}" cy="{Y_SURF+dy:.1f}" rx="6.5" ry="3.6" fill="{C_STEM}" '
                   f'transform="rotate({rot} {x+dx:.1f} {Y_SURF+dy:.1f})"/>')
    return "".join(out)

for x, kind, petal, _ in plants:
    s.append(flower(x, petal) if kind == "flower" else plant(x))

# saturation axis labels (Wet/Dry) + stress threshold (UI-7)
s.append(f'<text x="{X0-10}" y="{Y_SURF+4:.1f}" font-size="10" fill="{C_MUT}" text-anchor="end">100%</text>')
s.append(f'<text x="{X0-10}" y="{Y_BOT:.1f}" font-size="10" fill="{C_MUT}" text-anchor="end">0%</text>')
s.append(f'<text x="{X0-10}" y="{Y_SURF+16:.1f}" font-size="9" fill="{C_WLINE}" text-anchor="end">wet</text>')
s.append(f'<text x="{X0-10}" y="{Y_BOT-6:.1f}" font-size="9" fill="{C_DRY}" text-anchor="end">dry</text>')
s.append(f'<line x1="{X0}" y1="{y_thr:.1f}" x2="{X1}" y2="{y_thr:.1f}" stroke="{C_THR}" '
         f'stroke-width="1.6" stroke-dasharray="6 4"/>')
s.append(f'<text x="{X1-4}" y="{y_thr-6:.1f}" font-size="10.5" fill="{C_THR}" text-anchor="end">stress threshold &#8212; turf starts to wilt below 50%</text>')

# daily water in / out as separate bars near the root-zone floor (UI-1)
BZ = Y_BOT - 28
BPMM = 7.5
BARW = STEP * 0.30
C_DECL = "#b9722e"; C_RAINB = "#7fc3ec"; C_WATB = "#0d47a1"
s.append(f'<line x1="{X0}" y1="{BZ}" x2="{X1}" y2="{BZ}" stroke="#ffffff" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.75"/>')
s.append(f'<text x="{X1+8}" y="{BZ-12:.1f}" font-size="9" fill="{C_MUT}">in</text>')
s.append(f'<text x="{X1+8}" y="{BZ+14:.1f}" font-size="9" fill="{C_MUT}">out</text>')
for i in range(N):
    cx = xi(i)
    # decline (ET demand) — downward, left of centre
    s.append(f'<rect x="{cx-BARW:.1f}" y="{BZ:.1f}" width="{BARW:.1f}" height="{decl[i]*BPMM:.1f}" '
             f'fill="{C_DECL}" stroke="#fff" stroke-width="0.5"/>')
    # gains — upward, right of centre, rain then watering stacked
    base = BZ
    if rain[i] > 0:
        h = rain[i] * BPMM
        s.append(f'<rect x="{cx:.1f}" y="{base-h:.1f}" width="{BARW:.1f}" height="{h:.1f}" fill="{C_RAINB}" stroke="#fff" stroke-width="0.5"/>')
        base -= h
    if water[i] > 0:
        h = water[i] * BPMM
        s.append(f'<rect x="{cx:.1f}" y="{base-h:.1f}" width="{BARW:.1f}" height="{h:.1f}" fill="{C_WATB}" stroke="#fff" stroke-width="0.5"/>')

# water-table line + day markers (UI-2)
s.append(f'<polyline points="{wpts}" fill="none" stroke="{C_WLINE}" stroke-width="2.4"/>')
for i in range(N):
    if i in watered:
        s.append(f'<circle cx="{xi(i):.1f}" cy="{ys(soil[i]):.1f}" r="5.5" fill="#fff" stroke="{C_WATER}" stroke-width="2.4"/>')
    else:
        s.append(f'<circle cx="{xi(i):.1f}" cy="{ys(soil[i]):.1f}" r="2.4" fill="{C_WLINE}"/>')

# daily-max temperature numbers along the top of the sky (UI-11)
s.append(f'<text x="{X0-10}" y="{SKY_TOP+13:.1f}" font-size="9" fill="{C_MUT}" text-anchor="end">max °C</text>')
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
s.append(f'<text x="{xi(TODAY):.1f}" y="{ty-19:.1f}" font-size="12" font-weight="700" fill="#fff" text-anchor="middle">{round(soil[TODAY])}%</text>')
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

# --- legend (two rows) ---
def sw(x, y, fill):
    s.append(f'<rect x="{x}" y="{y-11}" width="15" height="12" fill="{fill}" stroke="#fff" stroke-width="0.5"/>')

def lbl(x, y, t):
    s.append(f'<text x="{x}" y="{y}" font-size="11" fill="{C_TXT}">{t}</text>')

R1 = 484
sw(40, R1, "url(#sat)"); lbl(62, R1, "water in soil")
s.append(f'<rect x="180" y="{R1-11}" width="15" height="12" fill="{C_DRY}"/>')
s.append(f'<circle cx="185" cy="{R1-6}" r="1.4" fill="{C_GRAIN}"/><circle cx="190" cy="{R1-3}" r="1.4" fill="{C_GRAIN}"/>')
lbl(202, R1, "dry soil")
s.append(f'<path d="M 300 {R1-12} C 297 {R1-7} 304 {R1-4} 300 {R1+1}" stroke="{C_ROOT}" stroke-width="1.6" fill="none"/>')
lbl(312, R1, "plant roots")
s.append(f'<line x1="410" y1="{R1-5}" x2="432" y2="{R1-5}" stroke="{C_THR}" stroke-width="1.6" stroke-dasharray="5 3"/>')
lbl(438, R1, "stress threshold")

R2 = 506
sw(40, R2, C_DECL); lbl(62, R2, "decline (ET out)")
sw(180, R2, C_RAINB); lbl(202, R2, "rain in")
sw(290, R2, C_WATB); lbl(312, R2, "watering in")
s.append(droplet(412, R2 - 13, C_WATER, 0.7)); lbl(424, R2, "rain / watering droplets")
s.append(f'<circle cx="600" cy="{R2-5}" r="5" fill="#fff" stroke="{C_WATER}" stroke-width="2"/>')
lbl(612, R2, "a day you watered (click to toggle)")

s.append(f'<rect x="40" y="{R2+16}" width="{W-80}" height="0.8" fill="{C_LINE}"/>')
s.append(f'<text x="40" y="{R2+40}" font-size="11" fill="{C_MUT}">'
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
