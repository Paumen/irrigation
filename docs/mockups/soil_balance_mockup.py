#!/usr/bin/env python3
"""Mockup generator for the Soil-Balance webapp (separate from the sim).

Interprets the UX spec (PUR / DAT / MOD / UI / BLD) as one mobile-first,
light-UI screen: a 16-day root-zone cross-section with per-day weather and
watering, planting on the surface, sun on top.

Emits  svg/UI1-UI7-soil-balance.svg  ; render with svg2png.py.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "svg", "UI1-UI7-soil-balance.svg")

# ── palette (light UI) ───────────────────────────────────────────────────────
BG      = "#F4F7F4"
CARD    = "#FFFFFF"
INK     = "#243B2E"
MUTED   = "#6E8276"
LINE    = "#D8E2DA"
SOIL_HI = "#D8B98C"   # dry soil
SOIL_LO = "#A9824F"   # deep soil
WATER_HI= "#74C4E8"
WATER_LO= "#2E8FC0"
TURF    = "#5BAE5B"
ROOT    = "#8a6a3f"
RAIN    = "#49A6DC"
ET       = "#E0913B"
DOSE    = "#3FB28E"
SUN     = "#F4C430"
THRESH  = "#C45D5D"
TODAY_BG= "#EAF3FB"

# ── geometry ────────────────────────────────────────────────────────────────
W, H = 390, 838
L, R = 22, 14
PLOT_W = W - L - R
N = 16
COL_W = PLOT_W / N
BAR_W = COL_W - 5.0
Y_SURF = 300.0          # soil surface
Y_BOT  = 556.0          # bottom of root zone
DEPTH  = Y_BOT - Y_SURF

THRESHOLD = 50          # UI-3 watering threshold (%)
ROOT_DEPTH_LABEL = "20 cm"

# ── sample 16-day series: last 8, today(idx 8), next 7  (DAT-3) ──────────────
#                0   1   2   3   4   5   6   7  | 8 |  9  10  11  12  13  14  15
LEVEL  = [      80, 75, 84, 78, 71, 64, 73, 66,  62, 57, 52, 47, 43, 60, 55, 50]
TEMP   = [      17, 19, 16, 20, 22, 24, 20, 23,  25, 26, 27, 29, 30, 24, 25, 26]
RAIN   = [       0,  0, 9.4, 0,  0,  0, 6.1, 0,   0,  0,  0,  0,  0, 0, 4.2, 0]   # mm
WATER  = [       0,  0,  0,  0,  8, 0,  0,  0,    0,  0,  0,  0,  0, 12, 0,  0]   # mm dose (applied)
DOW    = ["Th","Fr","Sa","Su","Mo","Tu","We","Th","Fr","Sa","Su","Mo","Tu","We","Th","Fr"]
DOM    = [11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26]
TODAY  = 8

def cx(i):  # column centre x
    return L + (i + 0.5) * COL_W

def y_of(pct):
    return Y_BOT - (pct / 100.0) * DEPTH

S = []
def add(s): S.append(s)

# ── document ────────────────────────────────────────────────────────────────
add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
    f'viewBox="0 0 {W} {H}" font-family="-apple-system,Segoe UI,Roboto,sans-serif">')

add('<defs>')
add(f'<linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">'
    f'<stop offset="0" stop-color="{SOIL_HI}"/><stop offset="1" stop-color="{SOIL_LO}"/></linearGradient>')
add(f'<linearGradient id="water" x1="0" y1="0" x2="0" y2="1">'
    f'<stop offset="0" stop-color="{WATER_HI}"/><stop offset="1" stop-color="{WATER_LO}"/></linearGradient>')
add(f'<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">'
    f'<stop offset="0" stop-color="#FBFEFF"/><stop offset="1" stop-color="#EAF4F0"/></linearGradient>')
add('</defs>')

add(f'<rect width="{W}" height="{H}" fill="{BG}"/>')

# ── header (PUR / scope) ─────────────────────────────────────────────────────
add(f'<text x="{L}" y="40" font-size="22" font-weight="700" fill="{INK}">Soil Balance</text>')
add(f'<text x="{L}" y="58" font-size="11.5" fill="{MUTED}">'
    f'Vormersesluisweg 3A, Wijchen · one zone</text>')
# little water-drop badge top-right
add(f'<g transform="translate({W-44},22)">'
    f'<path d="M14 2 C19 9 22 13 22 18 a8 8 0 0 1 -16 0 C6 13 9 9 14 2 Z" '
    f'fill="url(#water)" stroke="{WATER_LO}" stroke-width="1"/>'
    f'<text x="14" y="20" font-size="9" font-weight="700" fill="#fff" text-anchor="middle">62%</text></g>')

# ── control pills (UI-5/6/7) ─────────────────────────────────────────────────
def pill(x, y, w, label, value):
    add(f'<rect x="{x}" y="{y}" width="{w}" height="46" rx="11" fill="{CARD}" stroke="{LINE}"/>')
    add(f'<text x="{x+11}" y="{y+17}" font-size="9" fill="{MUTED}" '
        f'text-transform="uppercase" letter-spacing="0.6">{label}</text>')
    add(f'<text x="{x+11}" y="{y+34}" font-size="13" font-weight="600" fill="{INK}">{value}</text>')
    add(f'<path d="M{x+w-20} {y+20} l5 6 l5 -6" fill="none" stroke="{MUTED}" '
        f'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>')

pw = (PLOT_W - 16) / 3
pill(L,              74, pw, "Planting", "Turf")
pill(L + pw + 8,     74, pw, "Soil",     "Clay loam")
pill(L + 2*pw + 16,  74, pw, "Water",    "20 min")

# ── chart card ───────────────────────────────────────────────────────────────
CARD_Y, CARD_H = 134, 470
add(f'<rect x="{L-8}" y="{CARD_Y}" width="{PLOT_W+16}" height="{CARD_H}" rx="14" '
    f'fill="{CARD}" stroke="{LINE}"/>')
add(f'<text x="{L}" y="{CARD_Y+24}" font-size="12.5" font-weight="700" fill="{INK}">'
    f'Root-zone soil moisture</text>')
add(f'<text x="{L}" y="{CARD_Y+40}" font-size="9.5" fill="{MUTED}">'
    f'last 8 days · today · next 7</text>')

# sun on top (UI-1)
sx, sy = W - 56, CARD_Y + 30
add(f'<g stroke="{SUN}" stroke-width="2" stroke-linecap="round">')
for a in range(0, 360, 45):
    import math
    dx, dy = math.cos(math.radians(a)), math.sin(math.radians(a))
    add(f'<line x1="{sx+dx*12:.1f}" y1="{sy+dy*12:.1f}" x2="{sx+dx*17:.1f}" y2="{sy+dy*17:.1f}"/>')
add('</g>')
add(f'<circle cx="{sx}" cy="{sy}" r="8.5" fill="{SUN}"/>')

# sky behind cross-section (surface → up to weather row)
SKY_TOP = CARD_Y + 52
add(f'<rect x="{L-2}" y="{SKY_TOP}" width="{PLOT_W+4}" height="{Y_SURF-SKY_TOP}" '
    f'rx="6" fill="url(#sky)"/>')

# today highlight band (UI-3)
tx = cx(TODAY) - COL_W/2
add(f'<rect x="{tx:.1f}" y="{SKY_TOP}" width="{COL_W:.1f}" height="{Y_BOT-SKY_TOP+18}" '
    f'fill="{TODAY_BG}"/>')
add(f'<text x="{cx(TODAY):.1f}" y="{SKY_TOP-2}" font-size="8.5" font-weight="700" '
    f'fill="{WATER_LO}" text-anchor="middle">TODAY</text>')

# ── per-day weather row (UI-2): temp number, rain in, ET out, watering ───────
ROW_T = SKY_TOP + 12   # temp baseline
for i in range(N):
    x = cx(i)
    add(f'<text x="{x:.1f}" y="{ROW_T}" font-size="9.5" font-weight="600" '
        f'fill="{INK}" text-anchor="middle">{TEMP[i]}°</text>')
    yb = ROW_T + 8
    # rain drop in (down)
    if RAIN[i] > 0:
        add(f'<path d="M{x:.1f} {yb} c3 4 4.5 6 4.5 8 a4.5 4.5 0 0 1 -9 0 c0 -2 1.5 -4 4.5 -8 Z" '
            f'fill="{RAIN}"/>')
        add(f'<ellipse cx="{x-1.3:.1f}" cy="{yb+8.5}" rx="1.3" ry="2" fill="#CDEBFB"/>')
        add(f'<text x="{x:.1f}" y="{yb+22}" font-size="7.5" fill="{RAIN}" '
            f'text-anchor="middle">{RAIN[i]:g}</text>')
    else:
        # ET loss out (up arrow) — every dry day
        add(f'<path d="M{x:.1f} {yb+10} l0 -9 M{x-3:.1f} {yb+1} l3 -3 l3 3" fill="none" '
            f'stroke="{ET}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>')

# ── cross-section: soil, water fill, planting, roots ─────────────────────────
for i in range(N):
    x = cx(i)
    bx = x - BAR_W/2
    # soil column
    add(f'<rect x="{bx:.1f}" y="{Y_SURF}" width="{BAR_W:.1f}" height="{DEPTH:.1f}" '
        f'rx="3" fill="url(#soil)"/>')
    # water fill bottom-up to level (MOD-1 / UI-1)
    wt = y_of(LEVEL[i])
    add(f'<rect x="{bx:.1f}" y="{wt:.1f}" width="{BAR_W:.1f}" height="{Y_BOT-wt:.1f}" '
        f'rx="3" fill="url(#water)" opacity="0.9"/>')
    # roots reaching root depth (UI-1)
    add(f'<g stroke="{ROOT}" stroke-width="0.9" fill="none" opacity="0.55">')
    add(f'<path d="M{x:.1f} {Y_SURF} l0 {DEPTH-14:.1f}"/>')
    add(f'<path d="M{x:.1f} {Y_SURF+30:.1f} l-5 22 M{x:.1f} {Y_SURF+60:.1f} l5 26 '
        f'M{x:.1f} {Y_SURF+110:.1f} l-4 24"/>')
    add('</g>')
    # turf planting on surface (UI-1, selected = Turf)
    add(f'<g stroke="{TURF}" stroke-width="1.5" stroke-linecap="round">')
    for d in (-4, 0, 4):
        add(f'<line x1="{x+d:.1f}" y1="{Y_SURF}" x2="{x+d-1.2:.1f}" y2="{Y_SURF-8}"/>')
    add('</g>')
    # applied watering dose (UI-2 / UI-4) — green cap + drip into surface
    if WATER[i] > 0:
        add(f'<rect x="{bx:.1f}" y="{Y_SURF-2}" width="{BAR_W:.1f}" height="4" '
            f'fill="{DOSE}"/>')
        add(f'<circle cx="{x:.1f}" cy="{Y_SURF-14}" r="6.5" fill="{DOSE}"/>')
        add(f'<path d="M{x-3:.1f} {Y_SURF-14} l2 2 l4 -4" stroke="#fff" stroke-width="1.4" '
            f'fill="none" stroke-linecap="round" stroke-linejoin="round"/>')

# soil surface line
add(f'<line x1="{L-2}" y1="{Y_SURF}" x2="{L+PLOT_W+2}" y2="{Y_SURF}" '
    f'stroke="{ROOT}" stroke-width="1" opacity="0.5"/>')

# watering threshold marker (UI-3)
ty = y_of(THRESHOLD)
add(f'<line x1="{L-2}" y1="{ty:.1f}" x2="{L+PLOT_W+2}" y2="{ty:.1f}" '
    f'stroke="{THRESH}" stroke-width="1.4" stroke-dasharray="5 4"/>')
add(f'<rect x="{L-2}" y="{ty-9:.1f}" width="72" height="14" rx="7" fill="{THRESH}"/>')
add(f'<text x="{L+34}" y="{ty+1:.1f}" font-size="8.5" font-weight="600" fill="#fff" '
    f'text-anchor="middle">threshold 50%</text>')

# today level callout (UI-3)
tly = y_of(LEVEL[TODAY])
add(f'<circle cx="{cx(TODAY):.1f}" cy="{tly:.1f}" r="3.2" fill="#fff" '
    f'stroke="{WATER_LO}" stroke-width="2"/>')
add(f'<g transform="translate({cx(TODAY)+12:.1f},{tly-10:.1f})">'
    f'<rect width="44" height="20" rx="6" fill="{WATER_LO}"/>'
    f'<text x="22" y="14" font-size="11" font-weight="700" fill="#fff" '
    f'text-anchor="middle">62%</text></g>')

# root-depth bracket (right edge) — reservoir depth visible (UI-1 / MOD-5)
brx = L + PLOT_W + 4
add(f'<path d="M{brx} {Y_SURF} l4 0 M{brx} {Y_BOT} l4 0 M{brx+4} {Y_SURF} l0 {DEPTH}" '
    f'fill="none" stroke="{MUTED}" stroke-width="1"/>')
add(f'<text x="{brx+6}" y="{(Y_SURF+Y_BOT)/2:.1f}" font-size="8" fill="{MUTED}" '
    f'transform="rotate(90 {brx+6} {(Y_SURF+Y_BOT)/2:.1f})" text-anchor="middle">'
    f'root zone · {ROOT_DEPTH_LABEL}</text>')

# ── x-axis day/date labels ───────────────────────────────────────────────────
ax = Y_BOT + 16
for i in range(N):
    x = cx(i)
    bold = ' font-weight="700"' if i == TODAY else ''
    col = WATER_LO if i == TODAY else MUTED
    add(f'<text x="{x:.1f}" y="{ax}" font-size="8" fill="{col}"{bold} '
        f'text-anchor="middle">{DOW[i]}</text>')
    add(f'<text x="{x:.1f}" y="{ax+10}" font-size="7.5" fill="{col}" '
        f'text-anchor="middle">{DOM[i]}</text>')

# ── interaction hint (UI-4) ──────────────────────────────────────────────────
hy = CARD_Y + CARD_H - 14
add(f'<text x="{L}" y="{hy}" font-size="9" fill="{MUTED}">'
    f'Tap any day to water · tap again to undo</text>')

# ── legend (UI-2 vocabulary) ─────────────────────────────────────────────────
ly = CARD_Y + CARD_H + 24
add(f'<text x="{L}" y="{ly}" font-size="10" font-weight="700" fill="{INK}">Legend</text>')

def leg(x, y, draw, text):
    add(draw(x, y))
    add(f'<text x="{x+22}" y="{y+4}" font-size="9.5" fill="{MUTED}">{text}</text>')

row1 = ly + 18
row2 = ly + 40
col2 = L + 150
leg(L,    row1, lambda x,y: f'<rect x="{x}" y="{y-7}" width="14" height="14" rx="3" fill="url(#water)"/>', "soil water")
leg(col2, row1, lambda x,y: f'<line x1="{x}" y1="{y}" x2="{x+15}" y2="{y}" stroke="{THRESH}" stroke-width="1.6" stroke-dasharray="4 3"/>', "watering threshold")
leg(L,    row2, lambda x,y: f'<path d="M{x+7} {y-8} c3 4 4.5 6 4.5 8 a4.5 4.5 0 0 1 -9 0 c0 -2 1.5 -4 4.5 -8 Z" fill="{RAIN}"/><ellipse cx="{x+5.5}" cy="{y+0.5}" rx="1.4" ry="2.1" fill="#CDEBFB"/>', "rain in")
leg(col2, row2, lambda x,y: f'<path d="M{x+7} {y+5} l0 -10 M{x+4} {y-2} l3 -3 l3 3" fill="none" stroke="{ET}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>', "ET loss")
# watering-dose chip on its own line
row3 = ly + 62
leg(L, row3, lambda x,y: f'<circle cx="{x+7}" cy="{y}" r="6.5" fill="{DOSE}"/>', "applied watering")

# footer note (BLD-2)
add(f'<text x="{W/2}" y="{H-10}" font-size="8" fill="{MUTED}" text-anchor="middle">'
    f'Open-Meteo forecast · 16-day run-up · nothing saved — resets on reload</text>')

add('</svg>')

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w") as f:
    f.write("\n".join(S))
print("wrote", OUT)
