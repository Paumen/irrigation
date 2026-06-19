#!/usr/bin/env python3
"""Soil-Balance Tool — what-if interaction mockup (UI interpretation partial).

Renders docs/soil_balance_mockups/svg/UI2-UI3-whatif.svg and a same-named PNG.

Two stacked panels of the same 18-day moisture timeline, before and after one
click. BEFORE: the soil drifts down and a future day (Mon 22 Jun) dips below the
stress threshold. AFTER: clicking that day applies a 60-min dose — the level
lifts on that day and the lift ripples forward into the following days (until it
re-converges), staying above the threshold. The faint dashed BEFORE line and the
shaded delta make the response immediate and legible.

Checks PUR-2 (try what-if, see the response immediately), UI-2 (click toggles
watering on), UI-3 (watering on a future day), UI-4 (dose set by the duration
control), MOD-1 (reservoir recomputed forward, clamped to capacity), MOD-6
(loss tapers under stress, so the dried-out before-line and the watered line
re-converge), UI-7 (stress threshold as a reference line). Illustrative data only.
"""
import os
from datetime import date, timedelta
import cairosvg

W, H = 1000, 640
X0, X1 = 80, 940
N = 18
STEP = (X1 - X0) / (N - 1)
TODAY = 9
TODAY_DATE = date(2026, 6, 19)
CAP = 25.0            # reservoir capacity, mm (MOD-7)
THR = 50             # stress threshold, % depletion (UI-7 / UI-9)
WATER_DAY = 12       # the future day the user clicks (Mon 22 Jun)
DOSE = 2.85          # net mm added by a 60-min dose (UI-4 / MOD-5)


def xi(i): return X0 + i * STEP


# --- illustrative data (18 days), the day's water components in mm ---
decl = [0.9, 1.0, 0.8, 0.9, 1.0, 0.9, 0.8, 0.9, 1.0, 0.9, 0.9, 1.0, 0.9, 0.9, 0.8, 0.9, 0.9, 0.8]
rain = [0, 0, 1.8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
LEVEL_START = 21.5   # mm at the end of the day before the window


THR_MM = CAP * THR / 100   # stress threshold in mm (RAW)


def run(extra):
    """Roll the reservoir forward (MOD-1): prev + gains - losses, clamped.

    Loss is tapered by the FAO-56 stress coefficient Ks once the soil is below
    the stress threshold (MOD-6) — drier soil gives up less, so demand eases.
    """
    lv, L = [], LEVEL_START
    for i in range(N):
        g = L + rain[i] + extra.get(i, 0.0)              # level after the day's gains
        ks = 1.0 if g >= THR_MM else max(0.0, g / THR_MM)  # Ks taper below RAW (MOD-6)
        L = max(0.0, min(CAP, g - decl[i] * ks))
        lv.append(L)
    return [L / CAP * 100 for L in lv]


before = run({})
after = run({WATER_DAY: DOSE})

# --- colours (shared with gen.py's visual language) ---
C_SKY = "#eaf4fb"; C_WTOP = "#cfe8f7"; C_WBOT = "#3f86bd"; C_WLINE = "#1f6f9e"
C_THR = "#c62828"; C_BAND = "#f7d9d6"; C_WATER = "#1e88e5"; C_RAIN = "#5aa9e0"
C_TODAY = "#fff7d6"; C_TXT = "#37474f"; C_MUT = "#78909c"
C_PANEL = "#f6f8fa"; C_LINE = "#cfd8dc"; C_GHOST = "#9bb7c9"; C_DELTA = "#bfe3c4"

s = []
s.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
         f'viewBox="0 0 {W} {H}" font-family="Segoe UI, Helvetica, Arial, sans-serif">')
s.append('<defs>'
         f'<linearGradient id="sat" x1="0" y1="0" x2="0" y2="1">'
         f'<stop offset="0" stop-color="{C_WTOP}"/><stop offset="1" stop-color="{C_WBOT}"/>'
         f'</linearGradient></defs>')
s.append(f'<rect width="{W}" height="{H}" fill="#ffffff"/>')

# header
s.append(f'<text x="40" y="34" font-size="20" font-weight="700" fill="{C_TXT}">What-if watering</text>')
s.append(f'<text x="230" y="34" font-size="13" fill="{C_MUT}">'
         f'click any day &#8594; see the soil respond &#183; past or future</text>')
s.append(f'<rect x="{W-300}" y="16" width="260" height="24" rx="6" fill="{C_PANEL}" stroke="{C_LINE}"/>')
s.append(f'<text x="{W-288}" y="33" font-size="12" fill="{C_TXT}">'
         f'Watering duration: <tspan font-weight="700">60 min</tspan> &#8594; +2.8 mm net</text>')


def panel(y_top, levels, title, sub, watered=None, ghost=None, delta_from=None):
    """One 18-day moisture timeline; water fills bottom-up to each day's level."""
    PH = 196
    PAD_T, PAD_B = 30, 40
    ytop, ybot = y_top + PAD_T, y_top + PH - PAD_B

    def ys(p): return ybot - (p / 100) * (ybot - ytop)

    # card
    s.append(f'<rect x="40" y="{y_top}" width="{W-80}" height="{PH}" rx="10" '
             f'fill="#ffffff" stroke="{C_LINE}"/>')
    s.append(f'<text x="56" y="{y_top+22}" font-size="14" font-weight="700" fill="{C_TXT}">{title}</text>')
    s.append(f'<text x="{56+len(title)*7.7:.0f}" y="{y_top+22}" font-size="12" fill="{C_MUT}">{sub}</text>')

    # today highlight band
    bx = xi(TODAY) - STEP / 2
    s.append(f'<rect x="{bx:.1f}" y="{ytop:.1f}" width="{STEP:.1f}" height="{ybot-ytop:.1f}" '
             f'fill="{C_TODAY}" opacity="0.8"/>')

    # axis frame + wet/dry guides
    s.append(f'<line x1="{X0}" y1="{ybot:.1f}" x2="{X1}" y2="{ybot:.1f}" stroke="{C_LINE}"/>')
    s.append(f'<text x="{X0-8}" y="{ytop+4:.1f}" font-size="9" fill="{C_MUT}" text-anchor="end">100%</text>')
    s.append(f'<text x="{X0-8}" y="{ybot+3:.1f}" font-size="9" fill="{C_MUT}" text-anchor="end">0%</text>')

    # water fill: area under the moisture line
    wpts = " ".join(f"{xi(i):.1f},{ys(levels[i]):.1f}" for i in range(N))
    s.append(f'<polygon points="{X0},{ybot:.1f} {wpts} {X1},{ybot:.1f}" fill="url(#sat)" opacity="0.85"/>')

    # shaded delta on top of the fill: the band between the before-line and the
    # raised after-line — the water the click adds (and how it tapers away)
    if delta_from is not None:
        seg = [i for i in range(N) if levels[i] - delta_from[i] > 0.3]
        if seg:
            a, b = seg[0], seg[-1]
            up = " ".join(f"{xi(i):.1f},{ys(levels[i]):.1f}" for i in range(a, b + 1))
            dn = " ".join(f"{xi(i):.1f},{ys(delta_from[i]):.1f}" for i in range(b, a - 1, -1))
            s.append(f'<polygon points="{up} {dn}" fill="{C_DELTA}" opacity="0.85"/>')

    # ghost of the before-line for comparison
    if ghost is not None:
        gpts = " ".join(f"{xi(i):.1f},{ys(ghost[i]):.1f}" for i in range(N))
        s.append(f'<polyline points="{gpts}" fill="none" stroke="{C_GHOST}" '
                 f'stroke-width="1.6" stroke-dasharray="5 4"/>')

    # stress threshold (UI-7)
    yt = ys(THR)
    s.append(f'<line x1="{X0}" y1="{yt:.1f}" x2="{X1}" y2="{yt:.1f}" stroke="{C_THR}" '
             f'stroke-width="1.5" stroke-dasharray="6 4"/>')
    s.append(f'<text x="{X1-4}" y="{yt-5:.1f}" font-size="9.5" fill="{C_THR}" '
             f'text-anchor="end">stress threshold (50%)</text>')

    # moisture line + day dots
    s.append(f'<polyline points="{wpts}" fill="none" stroke="{C_WLINE}" stroke-width="2.4"/>')
    for i in range(N):
        if watered is not None and i == watered:
            continue
        below = levels[i] < THR
        s.append(f'<circle cx="{xi(i):.1f}" cy="{ys(levels[i]):.1f}" r="2.4" '
                 f'fill="{C_THR if below else C_WLINE}"/>')

    # the clicked day: white ring, dose droplets, callout
    if watered is not None:
        wx, wy = xi(watered), ys(levels[watered])
        for dx in (-6, 0, 6):
            s.append(f'<path d="M {wx+dx:.1f} {ytop+6:.1f} q 4 5 0 9 q -4 -4 0 -9 z" fill="{C_WATER}"/>')
        s.append(f'<circle cx="{wx:.1f}" cy="{wy:.1f}" r="6" fill="#fff" '
                 f'stroke="{C_WATER}" stroke-width="2.6"/>')
        s.append(f'<rect x="{wx-30:.1f}" y="{wy-34:.1f}" width="60" height="20" rx="5" fill="{C_WATER}"/>')
        s.append(f'<text x="{wx:.1f}" y="{wy-20:.1f}" font-size="11" font-weight="700" '
                 f'fill="#fff" text-anchor="middle">+60 min</text>')
        s.append(f'<path d="M {wx-4:.1f} {wy-14:.1f} L {wx+4:.1f} {wy-14:.1f} L {wx:.1f} {wy-8:.1f} z" '
                 f'fill="{C_WATER}"/>')
    else:
        # mark the day that will be clicked, with a hint
        hx = xi(WATER_DAY)
        dipy = ys(levels[WATER_DAY])
        s.append(f'<circle cx="{hx:.1f}" cy="{dipy:.1f}" r="6" fill="none" '
                 f'stroke="{C_MUT}" stroke-width="1.4" stroke-dasharray="3 3"/>')
        s.append(f'<text x="{hx:.1f}" y="{dipy+22:.1f}" font-size="10" fill="{C_THR}" '
                 f'text-anchor="middle">dips below stress</text>')

    # day axis
    for i in range(N):
        d = TODAY_DATE + timedelta(days=i - TODAY)
        is_today = (i == TODAY)
        fill = C_TXT if is_today else C_MUT
        wt = "700" if is_today else "400"
        wd = "Today" if is_today else d.strftime("%a")
        s.append(f'<text x="{xi(i):.1f}" y="{ybot+16:.1f}" font-size="9.5" fill="{fill}" '
                 f'font-weight="{wt}" text-anchor="middle">{wd}</text>')
        s.append(f'<text x="{xi(i):.1f}" y="{ybot+28:.1f}" font-size="9" fill="{fill}" '
                 f'font-weight="{wt}" text-anchor="middle">{d.day} Jun</text>')


panel(64, before, "Before",
      "&#8212; the soil drifts down; by Mon 22 Jun it has dipped into stress")

# down-arrow between panels: the click
my = 64 + 196 + 18
s.append(f'<circle cx="{xi(WATER_DAY):.1f}" cy="{my:.1f}" r="13" fill="{C_WATER}"/>')
s.append(f'<text x="{xi(WATER_DAY):.1f}" y="{my+5:.1f}" font-size="15" fill="#fff" '
         f'text-anchor="middle">&#8595;</text>')
s.append(f'<text x="{xi(WATER_DAY)+22:.1f}" y="{my+5:.1f}" font-size="12" fill="{C_TXT}">'
         f'click Mon 22 Jun &#8212; apply a 60-min dose</text>')

panel(64 + 196 + 36, after, "After",
      "&#8212; the dose lifts that day back over the line; the bump fades as the soil dries again",
      watered=WATER_DAY, ghost=before, delta_from=before)

# --- footer legend ---
FY = 64 + 2 * 196 + 36 + 18
def sw(x, fill, kind="rect"):
    if kind == "rect":
        s.append(f'<rect x="{x}" y="{FY-11}" width="15" height="12" fill="{fill}" stroke="#fff" stroke-width="0.5"/>')


sw(40, "url(#sat)")
s.append(f'<text x="62" y="{FY}" font-size="11" fill="{C_TXT}">water in soil</text>')
sw(180, C_DELTA)
s.append(f'<text x="202" y="{FY}" font-size="11" fill="{C_TXT}">water the dose adds</text>')
s.append(f'<polyline points="335,{FY-4} 357,{FY-4}" fill="none" stroke="{C_GHOST}" '
         f'stroke-width="1.6" stroke-dasharray="5 4"/>')
s.append(f'<text x="363" y="{FY}" font-size="11" fill="{C_TXT}">before this click</text>')
s.append(f'<line x1="478" y1="{FY-4}" x2="500" y2="{FY-4}" stroke="{C_THR}" '
         f'stroke-width="1.5" stroke-dasharray="5 3"/>')
s.append(f'<text x="506" y="{FY}" font-size="11" fill="{C_TXT}">stress threshold</text>')
s.append(f'<circle cx="628" cy="{FY-5}" r="5" fill="#fff" stroke="{C_WATER}" stroke-width="2"/>')
s.append(f'<text x="640" y="{FY}" font-size="11" fill="{C_TXT}">the day you clicked (click again to cancel)</text>')

s.append(f'<text x="40" y="{FY+22}" font-size="11" fill="{C_MUT}">'
         f'Clicking toggles the dose on that day (UI-2/UI-3); the reservoir is '
         f're-rolled forward (MOD-1), with loss easing under stress (Ks, MOD-6). Illustrative data.</text>')

s.append('</svg>')
svg = "\n".join(s)

here = os.path.dirname(os.path.abspath(__file__))
svg_path = os.path.join(here, "svg", "UI2-UI3-whatif.svg")
png_path = os.path.join(here, "UI2-UI3-whatif.png")
with open(svg_path, "w") as f:
    f.write(svg)
cairosvg.svg2png(bytestring=svg.encode(), write_to=png_path, output_width=W * 2, output_height=H * 2)
print("wrote", svg_path)
print("wrote", png_path)
