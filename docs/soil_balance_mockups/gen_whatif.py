#!/usr/bin/env python3
"""Soil-Balance Tool — "what-if" watering mockup (UI interpretation partial).

A before/after sheet for the tool's core interaction (PUR-2): clicking a day
toggles a watering dose and the soil estimate responds immediately. Two stacked
cross-section panels share one window:

  BEFORE — the day un-watered: the moisture curve dips below the stress
           threshold in the coming days; the candidate day shows a dashed
           "click to water" ghost marker.
  AFTER  — the same day toggled on: a 60-min dose (+2.8 mm net) lifts the curve
           from that day forward; the baseline is kept as a faint ghost and the
           gain between the two curves is shaded.

Checks UI-2 (click toggles watering), UI-3 (a future day can be watered),
UI-4 (dose set by the watering-duration control), UI-14 (level shown as a %),
UI-7 (stress-threshold reference). Illustrative data only — renders
svg/UI2-UI4-watering-what-if.svg and a same-named PNG.
"""
import os
import math
from datetime import date, timedelta
import cairosvg

W, H = 1000, 660
X0, X1 = 110, 950
N = 14
STEP = (X1 - X0) / (N - 1)
TODAY = 4                      # index of "today" in the window
WATER_DAY = 7                  # the future day we toggle (Mon, 3 days out)
TODAY_DATE = date(2026, 6, 19)
CAP = 25.0                     # reservoir capacity, mm (derived; see spec)
THR = 50                       # stress threshold, % of capacity
DOSE = 2.8                     # net mm added by a 60-min dose (UI-4)

# --- illustrative daily water components (mm) ---
decl = [1.4, 1.6, 1.5, 1.7, 1.6, 1.8, 1.7, 1.6, 1.5, 1.6, 1.4, 1.5, 1.3, 1.4]  # ET out
rain = [0, 0, 1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]                            # effective rain in
START = 21.0                                                                   # mm before the window


def evolve(extra):
    """Reservoir series, with `extra` mm added on the days in the dict."""
    out, L = [], START
    for i in range(N):
        L = max(0.0, min(CAP, L + rain[i] + extra.get(i, 0.0) - decl[i]))
        out.append(L)
    return out


baseline = evolve({})                       # nothing watered
watered = evolve({WATER_DAY: DOSE})         # WATER_DAY toggled on


def xi(i):
    return X0 + i * STEP


# --- colours (shared with the main-screen sheet) ---
C_SKY = "#eaf4fb"; C_DRY = "#e7d9bd"; C_GRAIN = "#cdb993"
C_GRASS = "#5fae3f"; C_WTOP = "#cfe8f7"; C_WBOT = "#3f86bd"; C_WLINE = "#1f6f9e"
C_THR = "#c62828"; C_WATER = "#1e88e5"; C_RAIN = "#5aa9e0"; C_GAIN = "#9ad0f0"
C_TXT = "#37474f"; C_MUT = "#78909c"; C_PANEL = "#f6f8fa"; C_LINE = "#cfd8dc"
C_SUN = "#f6b73c"; C_GHOST = "#90a4ae"

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
s.append(f'<text x="190" y="34" font-size="14" fill="{C_TXT}">&#183; what-if watering</text>')
s.append(f'<text x="40" y="54" font-size="12" fill="{C_MUT}">'
         f'Click a day to toggle a 60-min dose (+{DOSE:.1f} mm net) &#8212; the soil estimate responds at once.</text>')

# watering-duration control pill (UI-4) — the knob that sets the dose
s.append(f'<rect x="{W-250}" y="22" width="210" height="40" rx="9" fill="{C_PANEL}" stroke="{C_LINE}"/>')
s.append(f'<text x="{W-238}" y="38" font-size="10" fill="{C_MUT}">WATERING DURATION (UI-4)</text>')
s.append(f'<text x="{W-238}" y="55" font-size="13" font-weight="600" fill="{C_TXT}">60 min</text>')
s.append(f'<text x="{W-52}" y="55" font-size="11" fill="{C_MUT}" text-anchor="end">&#8776; {DOSE:.1f} mm net</text>')


def ys(top, bot, level):
    return bot - max(0.0, min(CAP, level)) / CAP * (bot - top)


def panel(label, sub, sky, surf, bot, levels, ghost=None, water_day=None,
          ghost_ring_day=None, shade=False, badge_col=C_WLINE):
    y_thr = ys(surf, bot, CAP * THR / 100)

    # panel label
    s.append(f'<text x="40" y="{sky-12}" font-size="13" font-weight="700" fill="{C_TXT}">{label}</text>')
    s.append(f'<text x="{40+len(label)*7.6:.0f}" y="{sky-12}" font-size="11.5" fill="{C_MUT}">{sub}</text>')

    # sky + sun
    s.append(f'<rect x="{X0}" y="{sky}" width="{X1-X0:.1f}" height="{surf-sky}" fill="{C_SKY}"/>')
    sx, sy, sr = X1 - 22, sky + 14, 7
    for ang in range(0, 360, 45):
        a = math.radians(ang)
        s.append(f'<line x1="{sx+(sr+2)*math.cos(a):.1f}" y1="{sy+(sr+2)*math.sin(a):.1f}" '
                 f'x2="{sx+(sr+5)*math.cos(a):.1f}" y2="{sy+(sr+5)*math.sin(a):.1f}" '
                 f'stroke="{C_SUN}" stroke-width="1.6" stroke-linecap="round"/>')
    s.append(f'<circle cx="{sx}" cy="{sy}" r="{sr}" fill="{C_SUN}"/>')

    # dry soil body + grass strip
    s.append(f'<rect x="{X0}" y="{surf}" width="{X1-X0:.1f}" height="{bot-surf}" fill="{C_DRY}"/>')
    s.append(f'<rect x="{X0}" y="{surf-4}" width="{X1-X0:.1f}" height="4" fill="{C_GRASS}"/>')
    gx = X0 + 5
    blades = []
    while gx < X1:
        blades.append(f'<path d="M {gx:.1f} {surf-4} l -1.4 -4 M {gx:.1f} {surf-4} l 1.4 -5" '
                      f'stroke="{C_GRASS}" stroke-width="1" fill="none"/>')
        gx += 9
    s.append("".join(blades))

    # saturation fill (water the roots can use)
    wpts = " ".join(f"{xi(i):.1f},{ys(surf,bot,levels[i]):.1f}" for i in range(N))
    s.append(f'<polygon points="{X0},{bot} {wpts} {X1},{bot}" fill="url(#sat)" opacity="0.82"/>')

    # gain shading: area between the kept baseline ghost and the watered curve
    if shade and ghost is not None and water_day is not None:
        top = [f"{xi(i):.1f},{ys(surf,bot,levels[i]):.1f}" for i in range(water_day, N)]
        bottom = [f"{xi(i):.1f},{ys(surf,bot,ghost[i]):.1f}" for i in range(N - 1, water_day - 1, -1)]
        s.append(f'<polygon points="{" ".join(top + bottom)}" fill="{C_GAIN}" opacity="0.55"/>')

    # faint baseline ghost line
    if ghost is not None:
        gpts = " ".join(f"{xi(i):.1f},{ys(surf,bot,ghost[i]):.1f}" for i in range(N))
        s.append(f'<polyline points="{gpts}" fill="none" stroke="{C_GHOST}" stroke-width="1.6" '
                 f'stroke-dasharray="4 4" opacity="0.85"/>')

    # stress-threshold marker (UI-7)
    s.append(f'<line x1="{X0}" y1="{y_thr:.1f}" x2="{X1}" y2="{y_thr:.1f}" stroke="{C_THR}" '
             f'stroke-width="1.5" stroke-dasharray="6 4"/>')
    s.append(f'<text x="{X1-4}" y="{y_thr-5:.1f}" font-size="10" fill="{C_THR}" text-anchor="end">'
             f'stress threshold ({THR}%)</text>')

    # moisture curve + day markers
    s.append(f'<polyline points="{wpts}" fill="none" stroke="{C_WLINE}" stroke-width="2.4"/>')
    for i in range(N):
        s.append(f'<circle cx="{xi(i):.1f}" cy="{ys(surf,bot,levels[i]):.1f}" r="2.3" fill="{C_WLINE}"/>')

    # the candidate day: dashed "click to water" ghost ring (BEFORE)
    if ghost_ring_day is not None:
        cy = ys(surf, bot, levels[ghost_ring_day])
        s.append(f'<circle cx="{xi(ghost_ring_day):.1f}" cy="{cy:.1f}" r="7" fill="none" '
                 f'stroke="{C_WATER}" stroke-width="2" stroke-dasharray="3 2.5"/>')
        s.append(f'<text x="{xi(ghost_ring_day):.1f}" y="{cy+22:.1f}" font-size="10.5" fill="{C_WATER}" '
                 f'text-anchor="middle" font-weight="600">click to water</text>')

    # the watered day: filled ring + droplets (AFTER)
    if water_day is not None:
        cy = ys(surf, bot, levels[water_day])
        for dx in (-6, 0, 6):
            s.append(f'<path d="M {xi(water_day)+dx:.1f} {surf-16:.1f} q 4 5.5 0 9 q -4 -3.5 0 -9 z" fill="{C_WATER}"/>')
        s.append(f'<circle cx="{xi(water_day):.1f}" cy="{cy:.1f}" r="6" fill="#fff" '
                 f'stroke="{C_WATER}" stroke-width="2.6"/>')

    # % badge at the candidate/watered day (UI-14)
    mday = water_day if water_day is not None else ghost_ring_day
    if mday is not None:
        pct = round(levels[mday] / CAP * 100)
        cy = ys(surf, bot, levels[mday])
        s.append(f'<rect x="{xi(mday)-22:.1f}" y="{cy-34:.1f}" width="44" height="20" rx="5" fill="{badge_col}"/>')
        s.append(f'<text x="{xi(mday):.1f}" y="{cy-20:.1f}" font-size="11.5" font-weight="700" '
                 f'fill="#fff" text-anchor="middle">{pct}%</text>')

    # day axis (weekday + date) under the panel
    ay = bot + 17
    for i in range(N):
        d = TODAY_DATE + timedelta(days=i - TODAY)
        hot = (i == mday)
        fill = C_WATER if hot else (C_TXT if i == TODAY else C_MUT)
        wt = "700" if (hot or i == TODAY) else "400"
        wd = "Today" if i == TODAY else d.strftime("%a")
        s.append(f'<text x="{xi(i):.1f}" y="{ay:.1f}" font-size="10" fill="{fill}" '
                 f'font-weight="{wt}" text-anchor="middle">{wd} {d.day}</text>')


# BEFORE — un-watered baseline, candidate day flagged
panel("Before", "&#8212; Mon 22 Jun not watered: the soil keeps drying past the threshold",
      sky=96, surf=128, bot=300, levels=baseline, ghost_ring_day=WATER_DAY,
      badge_col=C_GHOST)

# transition arrow between the panels
midx = xi(WATER_DAY)
s.append(f'<line x1="{midx:.1f}" y1="312" x2="{midx:.1f}" y2="372" stroke="{C_WATER}" '
         f'stroke-width="2.2"/>')
s.append(f'<path d="M {midx-6:.1f} 366 L {midx+6:.1f} 366 L {midx:.1f} 376 z" fill="{C_WATER}"/>')
s.append(f'<text x="{midx+14:.1f}" y="346" font-size="12" font-weight="600" fill="{C_WATER}">'
         f'click Mon 22 Jun &#8594; apply 60-min dose</text>')

# AFTER — watered: curve lifts, baseline kept as ghost, gain shaded
panel("After", "&#8212; one dose lifts the estimate from that day on (baseline dashed; gain shaded)",
      sky=400, surf=432, bot=600, levels=watered, ghost=baseline, water_day=WATER_DAY,
      shade=True)

# gain annotation in the After panel
gy = ys(432, 600, (watered[N-1] + baseline[N-1]) / 2)
s.append(f'<text x="{xi(N-1)-6:.1f}" y="{gy:.1f}" font-size="10.5" font-weight="600" '
         f'fill="{C_WLINE}" text-anchor="end">gain from watering</text>')

# footer / legend
fy = 638
s.append(f'<rect x="40" y="{fy-22}" width="{W-80}" height="0.8" fill="{C_LINE}"/>')
s.append(f'<circle cx="48" cy="{fy-4}" r="6" fill="#fff" stroke="{C_WATER}" stroke-width="2.4"/>')
s.append(f'<text x="60" y="{fy}" font-size="11" fill="{C_TXT}">watered day (click again to cancel &#8212; UI-2)</text>')
s.append(f'<line x1="320" y1="{fy-4}" x2="346" y2="{fy-4}" stroke="{C_GHOST}" stroke-width="1.6" stroke-dasharray="4 4"/>')
s.append(f'<text x="352" y="{fy}" font-size="11" fill="{C_TXT}">baseline (un-watered)</text>')
s.append(f'<rect x="520" y="{fy-10}" width="15" height="12" fill="{C_GAIN}" opacity="0.7"/>')
s.append(f'<text x="542" y="{fy}" font-size="11" fill="{C_TXT}">gain from the dose</text>')
s.append(f'<line x1="690" y1="{fy-4}" x2="716" y2="{fy-4}" stroke="{C_THR}" stroke-width="1.6" stroke-dasharray="5 3"/>')
s.append(f'<text x="722" y="{fy}" font-size="11" fill="{C_TXT}">stress threshold</text>')

s.append('</svg>')
svg = "\n".join(s)

here = os.path.dirname(os.path.abspath(__file__))
svg_path = os.path.join(here, "svg", "UI2-UI4-watering-what-if.svg")
png_path = os.path.join(here, "UI2-UI4-watering-what-if.png")
with open(svg_path, "w") as f:
    f.write(svg)
cairosvg.svg2png(bytestring=svg.encode(), write_to=png_path, output_width=W * 2, output_height=H * 2)
print("wrote", svg_path)
print("wrote", png_path)
