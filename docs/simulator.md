# Irrigation System Simulator — Plan

**Status:** draft for review — a plan, nothing built yet.
**Describes the system in:** `graph.yaml` (layout + wiring), `catalog.yaml` (manufacturer flow/pressure tables), `context.yaml` (background details).

## 1. What it is

A simulator of this one home irrigation system. You set what's switched on and what's broken, and it
shows where the water goes, how hard it's pushing at each point, and where — and how much — comes out.
It's a live picture: change a setting or break a part and it updates at once.

It's a "what if" explorer, separate from the existing troubleshooting tool (which asks questions to
guess a fault). Same system, same fault list, so they fit together — but linking them isn't part of this.

## 2. The main decisions

| Decision | Choice | Why |
|---|---|---|
| This round delivers | This plan only | No software yet. |
| How you use it | An interactive page in a web browser | You wanted a hands-on, clickable picture. (The rest of this project has no web page, so that note will need updating once built.) |
| The water maths | A proven free water-network calculator, **EPANET**, with a thin layer of our own around it | Far safer than writing pressure-and-flow maths from scratch — EPANET is the standard tool, well tested on the tricky cases. |
| What can break | Any individual part, the way it really fails | Matches the existing fault list. **Still to be reviewed** — see §6. |
| Where it runs | Entirely in the browser — nothing to install, no server | Suits the short-lived environment these sessions run in. EPANET has a browser version, so the proven maths come with it; we write only what it doesn't cover. |

## 3. Where the facts come from

Everything needed already lives in the project files. `graph.yaml` holds the full picture — well, pump,
every pipe and fitting, the manifold, the four automatic zones and the hand zone, every head with its
nozzle, angle and height, plus the wiring and each part's possible failures. `catalog.yaml` holds the
manufacturer's real numbers (pump push vs. flow, valve and nozzle behaviour vs. pressure). The simulator
just reads them.

## 4. How the water side works

It accounts for what a plumber would: pipes lose pressure to friction (faster flow and longer/narrower
pipes cost more); height costs pressure (the pump must lift water up to each head); the pump can only
push so hard, and pushing harder moves less water (its manufacturer "curve"); valves and fittings add
resistance; heads spray more at higher pressure, per the nozzle tables (the spray heads self-regulate to
about 2.76 bar); and leaks let water escape. Everything is connected — open another zone and the pressure
everywhere shifts. EPANET settles it all at once so the books balance: total water out = what the pump
supplies.

**Why it isn't a simple one-way chain** — three things the calculator must juggle together:
- **The automatic valves open themselves using water pressure.** Water takes two routes through one at
  once: the main way through, and a side route to a control chamber on the diaphragm. Energise the
  solenoid (or open the manual bleed) and that chamber drains, so water pressure lifts the valve open. So
  a valve isn't a plain on/off tap, and several faults live in that little control circuit.
- **The wiring is a loop** (power out to a solenoid and back along a shared return), not a line.
- **Everything affects everything** — with one pump and pressure-dependent spray, no branch can be worked
  out on its own. This is exactly why we lean on EPANET rather than home-grown maths.

**Friction method.** Two standards exist; the common irrigation shortcut (Hazen–Williams) is only
reliable at ordinary water speeds, while the other (Darcy–Weisbach) stays accurate from a trickle to a
race. This system does both — slow feed pipes, a fast hose-reel line, and faults that push pipes well
outside normal speeds — so we use the accurate-across-the-range one. It needs each pipe's inside
smoothness; the hoses are smooth plastic, so a standard value has been added per hose in `graph.yaml`.

## 5. The electrical side, and what you can control

Before any water is worked out, the simulator decides what's actually on. **A valve opens** only if its
solenoid really gets power — the controller calling that zone *and* an unbroken path of wires to the coil
and back — or if its manual bleed is open by hand. **The pump runs** only if it's called for, its relay
gets the signal, and mains power reaches it. The hand valve and the rotor flo-stops are purely mechanical.
So the picture can show three things at once: what's *asked* for, what's *getting power*, and *where a
path is broken*.

**You can set** any combination of: the pump; the four automatic zones; the hand-zone valve; each valve's
flow-control (the throttle screw); each rotor's flo-stop; and each valve's bleed screw. The situation
simulated is just these settings plus any faults you switch on.

## 6. What can go wrong (still to be reviewed)

You can break any individual part the way it really fails — the list already exists in `graph.yaml` and
lines up with the system's fault list. It's long, so **this is flagged for your review** (we may show
only common ones first). The effects are realistic: a **clog** restricts flow (a full block stops it); a
**break** either leaks or stops a part working; a **wrong setting** (throttled flow-control, bleed left
open, mis-set nozzle, mis-wiring) misbehaves accordingly; an **electrical break** stops the valve or pump
it feeds from switching on; a **weak pump** pushes less. (See §8 for the open choices here.)

## 7. The picture and how you use it

The diagram lays the system out roughly as it sits in real life — well and pump, the main run to the
valve box, the four zones, the hand zone — with the wiring drawn as a layer over the top (using the icons
we already have). Water is shown visually: bolder lines where more is flowing, colour for pressure, and
working parts distinct from idle ones. Every place water leaves — each head, the hand-zone nozzle, any
leak — is marked with how much, plus a running total. The wiring shows what's switched on, what's powered,
and where it's broken. Controls and fault switches sit alongside, and it updates instantly, with a short
note if something's off (e.g. the pump asked for more than it can give, or a valve that won't open because
pressure's too low). Ready-made examples jump to common situations (all off, one zone running, classic
faults).

## 8. How we'd build it, and what's still to decide

**Build, once approved:** read and check the system files → turn the manufacturer tables into usable
numbers (flagging anything out of range) → work out the electrical side (what's actually on, what's
broken) → describe the system to EPANET and confirm a simple case matches the manufacturer's figures →
apply controls and faults, run it, and turn results into the picture → sanity-check (totals balance,
height and multi-zone effects behave) → build the page → update the project docs. The electrical/EPANET
middle is the heart of it; the page is the biggest job but low-risk once the maths return clean answers.

**Still to decide:**
1. **Faults** — full part-by-part list or a common short set to start? Add a simple "leak somewhere along
   this pipe" option? (A few part-by-part faults may be awkward to represent inside EPANET — those are the
   only ones that might need special handling.)
2. **Valve detail** — treat each automatic valve as just open/shut/throttled (explaining the self-opening
   mechanism only as a label), or show its inner workings more fully?
3. **Diagram style** — clean schematic, or true-to-the-garden layout?
4. **Units** — bar and m³/h (matching the tables), litres-per-minute (more familiar), or a switch?
5. **How "live"** — just "set it up and see the result", or also animate filling and draining over time?
   (The plan assumes the simpler version.)
