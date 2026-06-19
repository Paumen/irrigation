#!/usr/bin/env python3
"""Soil-Balance Tool — main-screen mockup (UI interpretation partial).

Renders docs/soil_balance_mockups/svg/UI1-UI7-screen.svg and a same-named PNG.
Illustrative data only; checks the look of UI-1 (soil line + daily-balance bars
in one chart + per-day mean-temp numbers), UI-2/UI-4 (click-to-water + duration
dose), UI-5/UI-9 (soil / planting presets), UI-6 (pan), UI-7 (stress threshold).
"""
import os
from datetime import date, timedelta
import cairosvg

W, H = 1000, 545
X0, X1 = 80, 940
N = 18
STEP = (X1 - X0) / (N - 1)
TODAY = 9                      # last 9 (0..8), today (9), next 8 (10..17)
TODAY_DATE = date(2026, 6, 19)


def xi(i): return X0 + i * STEP


# --- illustrative data (18 days) ---
soil = [74, 68, 71, 63, 60, 52, 46, 40, 35, 44, 40, 36, 33, 29, 38, 34, 31, 28]  # %
temp = [19, 21, 22, 24, 26, 27, 25, 28, 29, 30, 28, 27, 26, 29, 31, 28, 26, 25]  # mean °C
LEVEL_START = 20.0                        # mm at end of the day before the window
level = [p / 4 for p in soil]             # 25 mm reservoir -> 1% = 0.25 mm
delta = [level[i] - (level[i - 1] if i else LEVEL_START) for i in range(N)]  # net mm/day
watered = {9, 14}

# --- soil-moisture axis (%) ---
S_TOP, S_BOT = 168, 384
def ys(p): return S_BOT - (p / 100) * (S_BOT - S_TOP)
THR = 50
y_thr = ys(THR)

# --- daily-balance bars: secondary mm axis sharing the chart ---
BZ = 366            # 0 mm baseline
BPMM = 7
BARW = STEP * 0.40

# --- colours ---
C_SOIL = "#2e7d32"; C_THR = "#c62828"; C_BAND = "#fdecea"
C_GAIN = "#43a047"; C_LOSS = "#b08968"; C_WATER = "#1e88e5"
C_TODAY = "#fff7d6"; C_TXT = "#37474f"; C_MUT = "#78909c"
C_PANEL = "#f6f8fa"; C_LINE = "#cfd8dc"

s = []
s.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
         f'viewBox="0 0 {W} {H}" font-family="Segoe UI, Helvetica, Arial, sans-serif">')
s.append(f'<rect width="{W}" height="{H}" fill="#ffffff"/>')

# header
s.append(f'<text x="40" y="34" font-size="20" font-weight="700" fill="{C_TXT}">Soil-Balance</text>')
s.append(f'<text x="362" y="34" font-size="13" fill="{C_MUT}">Vormersesluisweg 3A, Wijchen &#183; one zone</text>')

# control pills (UI-5 soil, UI-9 planting, UI-4 duration, UI-7 threshold)
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

# today highlight band
bx = xi(TODAY) - STEP / 2
s.append(f'<rect x="{bx:.1f}" y="110" width="{STEP:.1f}" height="318" fill="{C_TODAY}"/>')

# --- temp strip (UI-1: number per day) ---
s.append(f'<text x="68" y="128" font-size="11" fill="{C_MUT}" text-anchor="end">Mean &#176;C</text>')
for i in range(N):
    s.append(f'<text x="{xi(i):.1f}" y="128" font-size="11" fill="{C_TXT}" text-anchor="middle">{temp[i]}</text>')

# --- combined chart: soil line (%) + daily-balance bars (mm) ---
s.append(f'<text x="40" y="152" font-size="12" font-weight="600" fill="{C_TXT}">Soil moisture &amp; daily balance</text>')
# % gridlines
for p in (0, 50, 100):
    s.append(f'<line x1="{X0}" y1="{ys(p):.1f}" x2="{X1}" y2="{ys(p):.1f}" stroke="{C_LINE}" stroke-width="1"/>')
    s.append(f'<text x="{X0-8}" y="{ys(p)+4:.1f}" font-size="10" fill="{C_MUT}" text-anchor="end">{p}%</text>')
# stress band + threshold (UI-7)
s.append(f'<rect x="{X0}" y="{y_thr:.1f}" width="{X1-X0:.1f}" height="{S_BOT-y_thr:.1f}" fill="{C_BAND}"/>')
s.append(f'<line x1="{X0}" y1="{y_thr:.1f}" x2="{X1}" y2="{y_thr:.1f}" stroke="{C_THR}" '
         f'stroke-width="1.6" stroke-dasharray="6 4"/>')
s.append(f'<text x="{X1}" y="{y_thr-6:.1f}" font-size="10.5" fill="{C_THR}" text-anchor="end">stress threshold 50%</text>')

# daily-balance bars (drawn under the line); mm baseline + right-axis ticks
s.append(f'<line x1="{X0}" y1="{BZ}" x2="{X1}" y2="{BZ}" stroke="{C_MUT}" stroke-width="0.8" stroke-dasharray="3 3"/>')
for mmv, lab in ((2, "+2"), (0, "0"), (-2, "−2")):
    s.append(f'<text x="{X1+8}" y="{BZ-mmv*BPMM+3:.1f}" font-size="9.5" fill="{C_MUT}">{lab}</text>')
s.append(f'<text x="{X1+8}" y="{BZ-2*BPMM-12:.1f}" font-size="9.5" fill="{C_MUT}">mm/d</text>')
for i in range(N):
    d = delta[i]
    x = xi(i) - BARW / 2
    h = abs(d) * BPMM
    if i in watered:
        col = C_WATER
    else:
        col = C_GAIN if d >= 0 else C_LOSS
    y = BZ - h if d >= 0 else BZ
    s.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{BARW:.1f}" height="{h:.1f}" fill="{col}" opacity="0.85"/>')
    if i in watered:
        cy = y - 14
        s.append(f'<path d="M {xi(i):.1f} {cy:.1f} q 6 8 0 13 q -6 -5 0 -13 z" fill="{C_WATER}"/>')

# soil-moisture line (UI-1 main) on top
pts = " ".join(f"{xi(i):.1f},{ys(soil[i]):.1f}" for i in range(N))
s.append(f'<polyline points="{pts}" fill="none" stroke="{C_SOIL}" stroke-width="2.6"/>')
for i in range(N):
    if i in watered:
        s.append(f'<circle cx="{xi(i):.1f}" cy="{ys(soil[i]):.1f}" r="5.5" fill="#fff" stroke="{C_WATER}" stroke-width="2.4"/>')
    else:
        s.append(f'<circle cx="{xi(i):.1f}" cy="{ys(soil[i]):.1f}" r="2.6" fill="{C_SOIL}"/>')

# --- day axis: weekday + date (UI-2 clickable days, today marker) ---
AX1, AX2 = 408, 424
for i in range(N):
    d = TODAY_DATE + timedelta(days=i - TODAY)
    is_today = (i == TODAY)
    fill = C_TXT if is_today else C_MUT
    wt = "700" if is_today else "400"
    wd = "Today" if is_today else d.strftime("%a")
    s.append(f'<text x="{xi(i):.1f}" y="{AX1}" font-size="10.5" fill="{fill}" font-weight="{wt}" text-anchor="middle">{wd}</text>')
    s.append(f'<text x="{xi(i):.1f}" y="{AX2}" font-size="10" fill="{fill}" font-weight="{wt}" text-anchor="middle">{d.day} Jun</text>')

# pan affordances (UI-6)
midy = (S_TOP + S_BOT) / 2
s.append(f'<text x="{X0-30}" y="{midy:.0f}" font-size="22" fill="{C_LINE}">‹</text>')
s.append(f'<text x="{X1+30}" y="{midy:.0f}" font-size="22" fill="{C_LINE}">›</text>')
s.append(f'<text x="{W/2:.0f}" y="446" font-size="10" fill="{C_MUT}" text-anchor="middle">'
         f'← scroll to the 32 run-up days &#183; or 8 more forecast days →</text>')

# --- legend ---
LY = 476
def chip(x, kind, label):
    if kind == "line":
        s.append(f'<line x1="{x}" y1="{LY-4}" x2="{x+22}" y2="{LY-4}" stroke="{C_SOIL}" stroke-width="2.6"/>')
    elif kind == "dash":
        s.append(f'<line x1="{x}" y1="{LY-4}" x2="{x+22}" y2="{LY-4}" stroke="{C_THR}" stroke-width="1.6" stroke-dasharray="5 3"/>')
    elif kind in ("gain", "loss", "water"):
        col = {"gain": C_GAIN, "loss": C_LOSS, "water": C_WATER}[kind]
        s.append(f'<rect x="{x}" y="{LY-11}" width="14" height="12" fill="{col}"/>')
    s.append(f'<text x="{x+28}" y="{LY}" font-size="11" fill="{C_TXT}">{label}</text>')

chip(40, "line", "soil moisture (%)")
chip(200, "dash", "stress threshold")
chip(350, "gain", "gain (mm)")
chip(450, "loss", "loss (mm)")
chip(545, "water", "watering (click a day)")

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
