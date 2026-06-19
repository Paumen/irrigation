#!/usr/bin/env python3
"""Generate UI-interpretation mockups (SVG) for the irrigation sim spec.

Partials that check the *reading* of sim_ui.md / sim_spec.md before any UI
code exists. Naming is `sim-ui-<requirement(s)>-<what-it-is>` — see README.md.
This script owns the three *diagram-style* sheets (the two side-panel mocks are
hand-authored). Writes SVG sources into the `svg/` subfolder; turn them into
PNG (rendered alongside this script) with the companion converter:
  python3 gen.py && python3 svg2png.py
"""
import math, os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "svg")
os.makedirs(OUT, exist_ok=True)

# palette (U1 light theme)
BG     = "#f6f8fa"
PANEL  = "#ffffff"
INK    = "#1f2933"
MUTE   = "#9aa5b1"
FAINT  = "#e4e9ee"
FLOW   = "#2b8de0"   # water / flow
FLOWBG = "#d6ebfb"
PRESS  = "#1c6fb3"
LIVE   = "#f0b429"   # energised wire
WATER  = "#2b8de0"
STARVE = "#f0932b"
BROKEN = "#e02d39"
IDLE   = "#c3ccd5"   # de-energised / no flow

def esc(s): return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")

def txt(x,y,s,size=11,fill=INK,anchor="start",weight="400",ff="-apple-system,Segoe UI,Roboto,sans-serif",ls="0"):
    return (f'<text x="{x}" y="{y}" font-family="{ff}" font-size="{size}" '
            f'fill="{fill}" text-anchor="{anchor}" font-weight="{weight}" letter-spacing="{ls}">{esc(s)}</text>')

def wedge(cx,cy,r,a_start,a_sweep,fill,stroke,op=0.5):
    # arc wedge, angles in degrees, 0=east, ccw positive in math but we use screen (y down)
    a0=math.radians(a_start); a1=math.radians(a_start+a_sweep)
    x0=cx+r*math.cos(a0); y0=cy-r*math.sin(a0)
    x1=cx+r*math.cos(a1); y1=cy-r*math.sin(a1)
    large=1 if a_sweep>180 else 0
    return (f'<path d="M{cx:.1f},{cy:.1f} L{x0:.1f},{y0:.1f} '
            f'A{r:.1f},{r:.1f} 0 {large} 0 {x1:.1f},{y1:.1f} Z" '
            f'fill="{fill}" fill-opacity="{op}" stroke="{stroke}" stroke-width="1"/>')

def header():
    return f'<rect width="100%" height="100%" fill="{BG}"/>'

# ---------------------------------------------------------------- SHEET 1
def overview():
    W,H=420,900
    s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">']
    s.append('<defs>'
             '<marker id="arr" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">'
             f'<path d="M0,0 L6,3 L0,6 Z" fill="{FLOW}"/></marker>'
             f'<linearGradient id="pg" x1="0" y1="0" x2="1" y2="0">'
             f'<stop offset="0" stop-color="{FLOWBG}"/><stop offset="1" stop-color="{FLOW}"/></linearGradient>'
             '</defs>')
    s.append(header())
    # status header (U3 compact)
    s.append(f'<rect x="0" y="0" width="{W}" height="34" fill="{PANEL}"/>')
    s.append(f'<line x1="0" y1="34" x2="{W}" y2="34" stroke="{FAINT}"/>')
    s.append(txt(12,22,"Irrigation sim",13,INK,weight="600"))
    s.append(txt(W-12,22,"pump ON · Z2 watering",11,FLOW,anchor="end",weight="600"))

    # ===== ELECTRICAL BAND (U16, R12) =====
    s.append(txt(12,56,"WIRING",9,MUTE,weight="700",ls="1"))
    # controller
    cx,cy=14,66
    s.append(f'<rect x="{cx}" y="{cy}" width="92" height="58" rx="6" fill="{PANEL}" stroke="{LIVE}" stroke-width="1.5"/>')
    s.append(txt(cx+46,cy+15,"controller",9.5,INK,anchor="middle",weight="600"))
    s.append(f'<circle cx="{cx+10}" cy="{cy+11}" r="3" fill="{LIVE}"/>')  # live dot
    ports=["pump","z2","z3","z4","z5","com"]
    pon ={"pump":True,"z2":True,"z3":False,"z4":False,"z5":False,"com":True}
    for i,p in enumerate(ports):
        px=cx+10+i*14; py=cy+58
        col=LIVE if pon[p] else IDLE
        s.append(f'<circle cx="{px}" cy="{py}" r="3.2" fill="{col}"/>')
        s.append(txt(px,py+11,p,7,col if pon[p] else MUTE,anchor="middle",weight="700"))
    # relay + pump power
    s.append(f'<rect x="150" y="66" width="60" height="34" rx="5" fill="{PANEL}" stroke="{LIVE}" stroke-width="1.5"/>')
    s.append(txt(180,80,"relay",9,INK,anchor="middle",weight="600"))
    s.append(txt(180,92,"coil ✓",8,LIVE,anchor="middle",weight="700"))
    s.append(f'<rect x="150" y="108" width="60" height="22" rx="5" fill="{PANEL}" stroke="{LIVE}" stroke-width="1.5"/>')
    s.append(txt(180,123,"230V pump ⚡",8,INK,anchor="middle",weight="600"))
    # energised pump path (controller pump port -> relay)
    s.append(f'<path d="M24,124 L24,140 L180,140 L180,100" fill="none" stroke="{LIVE}" stroke-width="2"/>')
    s.append(f'<circle cx="180" cy="140" r="2.2" fill="{LIVE}"/>')  # junction dot (U11)
    # z2 energised signal -> splice -> Z2 valve coil
    s.append(f'<path d="M38,124 L38,150 L250,150" fill="none" stroke="{LIVE}" stroke-width="2"/>')
    # z3/z4/z5 de-energised (grey dashed) fanning right toward valves
    for i,yy in enumerate([158,166,174]):
        s.append(f'<path d="M{52+i*14},124 L{52+i*14},{yy} L250,{yy}" fill="none" stroke="{IDLE}" stroke-width="1.2" stroke-dasharray="3 3"/>')
    # shared common return (one line all valves share) -> illustrates "one break disables several"
    s.append(f'<path d="M94,124 L94,186 L250,186" fill="none" stroke="{LIVE}" stroke-width="1.6"/>')
    s.append(txt(150,198,"shared common return (one break ⇒ several zones drop)",7.5,MUTE,anchor="middle"))
    s.append(f'<line x1="0" y1="210" x2="{W}" y2="210" stroke="{FAINT}"/>')

    # ===== HYDRAULIC: manifold + zone rows (R11,R13,U6-9,U12-15) =====
    s.append(txt(12,230,"HYDRAULICS",9,MUTE,weight="700",ls="1"))
    # manifold vertical bar (U: manifold as vertical bar w/ stacked ports)
    mx,mtop=70,250; mh=300
    s.append(f'<rect x="{mx-9}" y="{mtop}" width="18" height="{mh}" rx="8" fill="url(#pg)" stroke="{PRESS}"/>')
    s.append(txt(mx,mtop-6,"6-way",8,MUTE,anchor="middle"))
    s.append(txt(mx,mtop+mh+12,"manifold",8,MUTE,anchor="middle"))

    # zone rows: (label, valveType, energised/watering, heads[(nozzle,arc,throw_norm)], color)
    zones=[
        ("Z2","auto",True ,[("rotor BL4",170,0.95),("MP3000",270,0.75),("MP2000",180,0.55)]),
        ("Z3","auto",False,[("rotor BL2.5",150,0.85),("rotor BL5",270,0.95)]),
        ("Z4","auto",False,[("MP3000",270,0.75),("MP1000",210,0.4),("MP2000",270,0.55),("MP3000",180,0.75)]),
        ("Z5","auto",False,[("rotor BL5",270,0.95),("rotor BL2.5",180,0.85)]),
    ]
    rowy=[270,330,390,450]
    ports_y=[270,330,390,450,510,540]
    # manifold port stubs
    for py in ports_y:
        s.append(f'<circle cx="{mx+9}" cy="{py}" r="2.4" fill="{PRESS}"/>')

    for (z,vt,on,heads),ry in zip(zones,rowy):
        active = on
        line_col = FLOW if active else IDLE
        dash = "" if active else 'stroke-dasharray="4 4"'
        lw = 3.4 if active else 1.2
        # pipe from manifold to valve
        s.append(f'<path d="M{mx+9},{ry} L120,{ry}" fill="none" stroke="{line_col}" stroke-width="{lw}" {dash}/>')
        # valve glyph
        vcol = FLOW if active else IDLE
        s.append(f'<rect x="120" y="{ry-9}" width="20" height="18" rx="3" fill="{PANEL}" stroke="{vcol}" stroke-width="1.6"/>')
        s.append(txt(130,ry+4,z,8,vcol if active else MUTE,anchor="middle",weight="700"))
        # status chip (U9: valve -> open)
        s.append(txt(130,ry-13,"open" if active else "shut",7,FLOW if active else MUTE,anchor="middle",weight="700"))
        # pipe valve->branch
        s.append(f'<path d="M140,{ry} L185,{ry}" fill="none" stroke="{line_col}" stroke-width="{lw}" {dash}/>')
        # heads spread vertically off a short riser cluster
        n=len(heads); spread=14
        hx=240
        for j,(nz,arc,throw) in enumerate(heads):
            hy=ry-(n-1)*spread/2 + j*spread
            s.append(f'<path d="M185,{ry} L{hx-22},{hy}" fill="none" stroke="{line_col}" stroke-width="{max(1.2,lw-1)}" {dash}/>')
            r=10+throw*16
            if active:
                s.append(wedge(hx,hy,r,90-arc/2,arc,FLOWBG,WATER,op=0.55))
            else:
                s.append(wedge(hx,hy,r,90-arc/2,arc,"#eef1f4",IDLE,op=0.7))
            s.append(f'<circle cx="{hx}" cy="{hy}" r="2.4" fill="{WATER if active else IDLE}"/>')
        # zone flow label (U12/U14 flow number)
        if active:
            s.append(txt(W-10,ry-22,"1.66 m³/h",8,FLOW,anchor="end",weight="700"))

    # Z1 manual row
    z1y=510
    s.append(f'<path d="M{mx+9},{z1y} L120,{z1y}" fill="none" stroke="{IDLE}" stroke-width="1.2" stroke-dasharray="4 4"/>')
    s.append(f'<rect x="120" y="{z1y-9}" width="20" height="18" rx="3" fill="{PANEL}" stroke="{IDLE}"/>')
    s.append(txt(130,z1y+4,"Z1",8,MUTE,anchor="middle",weight="700"))
    s.append(txt(130,z1y-13,"manual",7,MUTE,anchor="middle"))
    s.append(txt(150,z1y+4,"→ hose (handle-shut)",8,MUTE))
    # Z6 cap stub
    z6y=540
    s.append(f'<path d="M{mx+9},{z6y} L150,{z6y}" fill="none" stroke="{IDLE}" stroke-width="1.2" stroke-dasharray="4 4"/>')
    s.append(f'<line x1="150" y1="{z6y-6}" x2="150" y2="{z6y+6}" stroke="{MUTE}" stroke-width="2"/>')
    s.append(txt(158,z6y+3,"Z6 cap",8,MUTE))

    s.append(f'<line x1="0" y1="575" x2="{W}" y2="575" stroke="{FAINT}"/>')

    # ===== SUPPLY CHAIN (bottom) =====
    s.append(txt(12,595,"SUPPLY",9,MUTE,weight="700",ls="1"))
    sy=640
    # well
    s.append(f'<rect x="14" y="{sy-14}" width="40" height="40" rx="6" fill="{FLOWBG}" stroke="{PRESS}"/>')
    s.append(txt(34,sy+4,"well",8,PRESS,anchor="middle",weight="600"))
    s.append(txt(34,sy-20,"primed ✓",7,FLOW,anchor="middle",weight="700"))
    # suction -> pump
    s.append(f'<path d="M54,{sy+6} L92,{sy+6}" fill="none" stroke="{FLOW}" stroke-width="3.4" marker-end="url(#arr)"/>')
    # pump
    s.append(f'<circle cx="120" cy="{sy+6}" r="20" fill="{PANEL}" stroke="{FLOW}" stroke-width="2"/>')
    s.append(txt(120,sy+2,"pump",8,INK,anchor="middle",weight="600"))
    s.append(txt(120,sy+12,"3.0 bar",7,PRESS,anchor="middle",weight="700"))
    s.append(txt(120,sy-20,"running",7,FLOW,anchor="middle",weight="700"))
    # 20m run -> manifold riser
    s.append(f'<path d="M140,{sy+6} L300,{sy+6}" fill="none" stroke="{FLOW}" stroke-width="3.4" marker-end="url(#arr)"/>')
    s.append(txt(220,sy-4,"20 m LDPE-32",7.5,MUTE,anchor="middle"))
    s.append(f'<path d="M300,{sy+6} L300,250" fill="none" stroke="{FLOW}" stroke-width="3" stroke-dasharray="2 3" opacity="0.4"/>')
    s.append(txt(330,sy+10,"→ to manifold",7.5,MUTE))
    # total outflow (R10 / R14)
    s.append(f'<rect x="14" y="{sy+40}" width="{W-28}" height="26" rx="6" fill="{PANEL}" stroke="{FAINT}"/>')
    s.append(txt(24,sy+57,"Σ outflow = pump supply",9,INK,weight="600"))
    s.append(txt(W-24,sy+57,"1.66 m³/h out · 1.66 in ✓",9,FLOW,anchor="end",weight="700"))

    # footnote: requirements covered
    s.append(txt(12,H-20,"covers R11·R13·R14·R10 · U2·U6–U13·U16 — encoding in sim-ui-U12-U16-diagram-line-visualizations",8,MUTE))
    s.append('</svg>')
    open(f"{OUT}/sim-ui-U6-diagram.svg","w").write("\n".join(s))

# ---------------------------------------------------------------- SHEET 2
def inspector():
    W,H=420,720
    s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">']
    s.append(header())
    # faded diagram behind (U8: panel overlays diagram, doesn't shrink it)
    s.append(f'<rect x="0" y="0" width="{W}" height="{H}" fill="{BG}"/>')
    s.append(f'<g opacity="0.18">')
    for i in range(5):
        yy=70+i*46
        s.append(f'<path d="M30,{yy} L260,{yy}" stroke="{INK}" stroke-width="3" fill="none"/>')
        s.append(f'<rect x="120" y="{yy-8}" width="18" height="16" rx="3" fill="none" stroke="{INK}"/>')
    s.append('</g>')
    # selected item highlight
    s.append(f'<rect x="112" y="146" width="34" height="32" rx="5" fill="none" stroke="{FLOW}" stroke-width="2"/>')
    s.append(f'<line x1="146" y1="162" x2="196" y2="200" stroke="{FLOW}" stroke-width="1.5" stroke-dasharray="3 3"/>')

    # side panel overlay (U17,U23) — slides over right ~62%
    px=196
    s.append(f'<rect x="{px}" y="0" width="{W-px}" height="{H}" fill="{PANEL}" stroke="{FAINT}"/>')
    s.append(f'<rect x="{px}" y="0" width="4" height="{H}" fill="{FLOW}"/>')
    s.append(txt(px+16,30,"Z2 · valve.auto",13,INK,weight="700"))
    s.append(txt(px+16,46,"Hunter PGV-101G",9,MUTE))
    s.append(txt(W-14,30,"✕",13,MUTE,anchor="end"))

    def row(y,label,val,col=INK,bar=None):
        out=[txt(px+16,y,label,9.5,MUTE)]
        out.append(txt(W-14,y,val,11,col,anchor="end",weight="700"))
        if bar is not None:
            # mini range bar (U18 against catalog range)
            bx,bw=px+16,W-px-30
            out.append(f'<rect x="{bx}" y="{y+5}" width="{bw}" height="4" rx="2" fill="{FAINT}"/>')
            out.append(f'<rect x="{bx}" y="{y+5}" width="{bw*bar:.0f}" height="4" rx="2" fill="{FLOW}"/>')
        return "".join(out)

    s.append(f'<line x1="{px}" y1="58" x2="{W}" y2="58" stroke="{FAINT}"/>')
    s.append(txt(px+16,78,"STATE  (live values)",8.5,MUTE,weight="700",ls="1"))
    s.append(row(98 ,"reading","open ▶",FLOW))
    s.append(row(118,"inlet pressure","3.0 bar",PRESS,bar=0.64))
    s.append(row(150,"flow","1.66 m³/h",FLOW,bar=0.18))
    s.append(row(182,"chamber","0.2 bar (vented)",PRESS))
    s.append(row(202,"coil","live ⚡",LIVE))

    s.append(f'<line x1="{px}" y1="222" x2="{W}" y2="222" stroke="{FAINT}"/>')
    s.append(txt(px+16,242,"vs CATALOG (what it can do)",8.5,MUTE,weight="700",ls="1"))
    s.append(txt(px+16,262,"loss range 0.21–0.97 bar · Kv 6.0",9,INK))
    s.append(txt(px+16,278,"min working 1.5 bar",9,INK))

    s.append(f'<line x1="{px}" y1="296" x2="{W}" y2="296" stroke="{FAINT}"/>')
    s.append(txt(px+16,316,"CONTROLS  (set here)",8.5,MUTE,weight="700",ls="1"))
    # energize toggle
    def toggle(y,label,on):
        out=[txt(px+16,y,label,10,INK)]
        tx=W-58
        out.append(f'<rect x="{tx}" y="{y-11}" width="42" height="16" rx="8" fill="{FLOW if on else FAINT}"/>')
        out.append(f'<circle cx="{tx+(30 if on else 10)}" cy="{y-3}" r="6.5" fill="#fff"/>')
        return "".join(out)
    s.append(toggle(340,"energize port (z2)",True))
    s.append(toggle(366,"solenoid bleed",False))
    s.append(toggle(392,"bonnet bleed",False))
    # throttle slider (flow-control screw 0..1)
    s.append(txt(px+16,420,"throttle (flow control)",10,INK))
    sx,sw=px+16,W-px-30
    s.append(f'<rect x="{sx}" y="430" width="{sw}" height="4" rx="2" fill="{FAINT}"/>')
    s.append(f'<rect x="{sx}" y="430" width="{sw*0.85:.0f}" height="4" rx="2" fill="{FLOW}"/>')
    s.append(f'<circle cx="{sx+sw*0.85:.0f}" cy="432" r="7" fill="{PANEL}" stroke="{FLOW}" stroke-width="2"/>')
    s.append(txt(W-14,424,"0.85",9,FLOW,anchor="end",weight="700"))

    s.append(f'<line x1="{px}" y1="456" x2="{W}" y2="456" stroke="{FAINT}"/>')
    s.append(txt(px+16,476,"note · faults deferred (M8) — no",8.5,MUTE))
    s.append(txt(px+16,489,"inject UI yet (U Deferred)",8.5,MUTE))

    s.append(txt(14,H-18,"covers U8·U9·U17·U18·U19·U22·U23 — tap an item → overlay panel, state + catalog + controls",8,MUTE))
    s.append('</svg>')
    open(f"{OUT}/sim-ui-U18-side-panel-overlay.svg","w").write("\n".join(s))

# ---------------------------------------------------------------- SHEET 3
def key():
    W,H=420,760
    s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">']
    s.append('<defs>'
             f'<linearGradient id="fg" x1="0" y1="0" x2="1" y2="0">'
             f'<stop offset="0" stop-color="{FLOWBG}"/><stop offset="1" stop-color="{FLOW}"/></linearGradient>'
             '</defs>')
    s.append(header())
    s.append(f'<rect x="0" y="0" width="{W}" height="34" fill="{PANEL}"/>')
    s.append(f'<line x1="0" y1="34" x2="{W}" y2="34" stroke="{FAINT}"/>')
    s.append(txt(12,22,"Encoding key — how each value is drawn",12,INK,weight="700"))

    y=60
    def section(title,req):
        nonlocal y
        s.append(txt(14,y,title,10.5,INK,weight="700"))
        s.append(txt(W-14,y,req,8.5,MUTE,anchor="end"))
        y+=8
        s.append(f'<line x1="14" y1="{y}" x2="{W-14}" y2="{y}" stroke="{FAINT}"/>')
        y+=20

    # FLOW (U12)
    section("Flow — thickness + animated dashes","U12")
    for i,(lab,w,active) in enumerate([("none / idle",1.2,False),("low",2.4,True),("high",4.6,True)]):
        yy=y+i*26
        col=FLOW if active else IDLE
        dash='stroke-dasharray="6 4"' if active else 'stroke-dasharray="4 4"'
        s.append(f'<path d="M30,{yy} L150,{yy}" stroke="{col}" stroke-width="{w}" fill="none" {dash}/>')
        s.append(txt(165,yy+4,lab+(" (grey, static)" if not active else "  →→ animated"),9.5,INK))
    y+=86

    # PRESSURE (U13)
    section("Pressure — fill saturation + bar badge","U13")
    for i,(lab,sat) in enumerate([("dry / empty (hollow)",0.0),("low ~1 bar",0.4),("high ~3 bar",1.0)]):
        yy=y+i*26
        if sat==0:
            s.append(f'<rect x="30" y="{yy-9}" width="120" height="16" rx="4" fill="none" stroke="{IDLE}"/>')
        else:
            s.append(f'<rect x="30" y="{yy-9}" width="120" height="16" rx="4" fill="{FLOW}" fill-opacity="{0.2+0.6*sat:.2f}" stroke="{PRESS}"/>')
            s.append(txt(90,yy+3,f"{sat*3:.1f} bar",8,'#fff' if sat>0.6 else PRESS,anchor="middle",weight="700"))
        s.append(txt(165,yy+4,lab,9.5,INK))
    y+=86

    # STATUS readings (U9)
    section("Status icons — per-item reading","U9 · state model")
    chips=[("valve","open ▶ / shut",FLOW),("head","watering 💧 / starved ▲",WATER),
           ("pump","primed ✓",PRESS),("pipe/joint","pressurised",PRESS),("electrical","live ⚡",LIVE)]
    for i,(it,rd,col) in enumerate(chips):
        yy=y+i*22
        s.append(txt(30,yy+4,it,9.5,MUTE))
        s.append(txt(120,yy+4,rd,9.5,col,weight="700"))
    y+=i*22+34

    # COVERAGE (U14/U15)
    section("Head — coverage wedge, throw & precip","U14 · U15")
    cy=y+34
    # rotor wide arc
    s.append(wedge(70,cy,40,90-270/2,270,FLOWBG,WATER,op=0.55))
    s.append(f'<circle cx="70" cy="{cy}" r="3" fill="{WATER}"/>')
    s.append(txt(70,cy+56,"rotor · 270° · r∝throw",8,INK,anchor="middle"))
    # spray narrow
    s.append(wedge(190,cy,28,90-180/2,180,FLOWBG,WATER,op=0.55))
    s.append(f'<circle cx="190" cy="{cy}" r="3" fill="{WATER}"/>')
    s.append(txt(190,cy+56,"spray · 180°",8,INK,anchor="middle"))
    s.append(txt(290,cy-10,"throw 12.5 m",9.5,INK))
    s.append(txt(290,cy+6,"flow 1.04 m³/h",9.5,FLOW,weight="700"))
    s.append(txt(290,cy+22,"precip 11 mm/h",9.5,PRESS,weight="700"))
    y=cy+72

    # ELECTRICAL (U16/R12)
    section("Wiring — live / de-energised / broken","U16 · R12")
    states=[("energised",LIVE,"",2.2),("de-energised",IDLE,'stroke-dasharray="4 4"',1.4),("broken path",BROKEN,'stroke-dasharray="3 4"',1.8)]
    for i,(lab,col,dash,w) in enumerate(states):
        yy=y+i*24
        s.append(f'<path d="M30,{yy} L150,{yy}" stroke="{col}" stroke-width="{w}" fill="none" {dash}/>')
        if "broken" in lab:
            s.append(txt(90,yy-4,"✕",12,BROKEN,anchor="middle",weight="700"))
        s.append(txt(165,yy+4,lab,9.5,INK))
    y+=i*24+30
    s.append(txt(14,y,"won't-settle (U21): keep last-good numbers + amber ‘won’t settle’ badge, never fake values.",8.5,STARVE))

    s.append('</svg>')
    open(f"{OUT}/sim-ui-U12-U16-diagram-line-visualizations.svg","w").write("\n".join(s))

overview(); inspector(); key()
print("wrote SVGs to", OUT, "— run svg2png.py to render PNGs")
