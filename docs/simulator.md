# Irrigation System Simulator — Plan

**Status:** draft for review (this is a plan — nothing has been built yet)
**Related notes:** `docs/spec.md` (the troubleshooting tool), `docs/fcode_spec.md` (the list of ways the system can fail)
**Describes the system recorded in:** `graph.yaml` (layout + wiring), `context.yaml` (background details), `catalog.yaml` (manufacturer flow/pressure tables)

---

## 1. What it is

A simulator of this one home irrigation system. You set what's switched on and what (if anything)
is broken, and it shows you:

- where the water goes,
- how hard it's pushing (the pressure) at each point,
- and where — and how much — water comes out.

It's a live picture: change a setting or break a part, and the diagram updates straight away.

This is a "what if" explorer. It's separate from the existing troubleshooting tool: that tool asks
you questions to guess what's wrong, while this one lets you set up a situation and watch what the
system would actually do. They describe the same system and the same list of possible faults, so
they fit together, but building that link is not part of this plan.

## 2. The main decisions

| Decision | Choice | Why |
|---|---|---|
| What this round delivers | This plan only | No software is being written yet. |
| How you use it | An interactive page in a web browser | You asked for a hands-on, clickable picture. (Note: the rest of this project is a chat assistant with no web page, so that description will need updating once this is built.) |
| How the water side is worked out | A proven, free irrigation/water-network calculator called **EPANET**, with a thin layer of our own around it | Far safer than writing the pressure-and-flow maths from scratch — EPANET is the standard tool for exactly this, well tested on the tricky situations. |
| What can be broken | Any individual part, in the way that part really fails | Matches the existing fault list one-to-one. **Still to be reviewed** — see §8. |
| Where it runs | Entirely inside the web browser | Nothing to install, no server to keep running — just open the page. |

## 3. Where it runs

The whole thing is a single web page you open in a browser. The system's facts are baked into the
page, and the water calculations run right there on your computer — there's no server to set up or
keep alive, which suits the short-lived environment these sessions run in.

EPANET — the water-network calculator — has a version that runs inside a browser, so we get the
proven calculations with nothing to install. We only write the parts EPANET doesn't cover: feeding
it this system's layout, deciding which valves and the pump are actually on, applying any faults,
and turning its answers back into the picture.

If we ever want the troubleshooting tool to share these same calculations, EPANET also has a version
that runs the identical system description elsewhere — so there'd never be two separate sets of maths
to keep in step.

## 4. Where the system's facts come from

Everything the simulator needs already exists in the project files; it just reads them:

- **`graph.yaml`** — the full picture of the system: the well, the pump, every pipe and fitting, the
  manifold in the valve box, the four automatic zones plus the hand-operated zone, and every sprinkler
  head with its nozzle, spray angle, and height. It also records the wiring — controller, relay, and
  the wires out to each valve's solenoid. Each part lists the ways it can fail.
- **`catalog.yaml`** — the manufacturer's reference tables: how hard the pump pushes at different flows,
  how much each valve and nozzle resists or sprays at different pressures. These are the real numbers
  the simulator works from.
- **`context.yaml`** — background details (where things are, when they were installed) used for labels.

The water travels in one direction: up from the well, through the pump, along the main line to the
manifold, then out into the separate zones, and finally out of the sprinkler heads. Nothing loops back
on itself in the pipework — but, as the next section explains, that doesn't make the system simple.

## 5. How the water side works

### 5.1 What makes the water move (and what slows it down)

The simulator accounts for the same things a real plumber would:

- **Pipes lose pressure to friction.** The faster the water flows, the more pressure it costs to push
  it down a pipe. Narrower and longer pipes cost more.
- **Height matters.** The pump has to lift water up from the well and out to heads that sit at
  different heights; every metre up costs pressure.
- **The pump has limits.** It can only push so hard, and the harder it has to push, the less water it
  moves — that trade-off is the pump's "curve", taken straight from the manufacturer's table.
- **Valves and fittings add resistance** when water passes through them.
- **Sprinkler heads spray more when the pressure is higher** — exactly as much as the manufacturer's
  nozzle tables say. The spray-type heads have a built-in regulator that holds them at about 2.76 bar,
  so above a threshold they spray a steady amount regardless of supply pressure.
- **Leaks** let water escape wherever one is present.

The key point is that everything is connected. Open another zone and the pressure everywhere changes;
the heads already running will spray a little differently. The calculator settles all of this at once
so that the books balance: the total water coming out of every head and leak equals what the pump is
supplying.

The simulator feeds all of the above into EPANET — pipes with their friction, the pump's curve, the
valves, the heads' spray-vs-pressure behaviour, the regulators on the spray heads, and any leaks — and
EPANET works out the pressure at every point and the flow through every pipe.

### 5.2 Why it isn't just a simple chain

The pipework runs one way with no loops, but three things stop the system being a simple feed-forward
chain, and the calculator has to handle all of them together:

- **The automatic valves open themselves using water pressure.** Water takes two routes through one of
  these valves at once — the main way through, and a tiny side route that controls a chamber on top of
  the rubber diaphragm. When the controller energises the solenoid (or you open the manual bleed), that
  chamber is allowed to drain, the pressure on top drops, and the water pressure underneath lifts the
  diaphragm open. So a valve isn't a simple on/off tap — it opens because of the pressures around it,
  and several faults live in that little control circuit (a blocked control port, a weep, a bleed screw
  left open).
- **The wiring is a loop, not a line.** Electricity has to flow out to a solenoid and back again along a
  shared return wire, so the electrical side forms loops by nature.
- **Everything influences everything.** Because of the single pump and the way each head's spray depends
  on pressure, you can't work out one branch on its own — they all have to be balanced together.

This is precisely why we're using EPANET rather than a home-grown calculation: it's built to settle all
these interactions at once.

### 5.3 Choosing how friction is calculated

There are two standard ways to work out pipe friction. One (called Hazen–Williams) is the common
shortcut in irrigation, but it's only reliable when water is moving at ordinary speeds. The other
(Darcy–Weisbach) stays accurate whether the water is barely trickling or racing.

This system does both extremes. In normal use, the busy "trunk" pipes carrying a whole zone's water run
at sensible speeds. But the many small pipes feeding a single head run very slowly, and the hand-zone's
narrow hose-reel line can run extremely fast. On top of that, faults like clogs and throttled valves
push pipes well outside ordinary speeds. So we use the method that stays accurate across the whole range.

(The slow little feed pipes barely lose any pressure either way, so the choice doesn't really change
those — it matters most for the fast hose-reel line and for fault situations.)

This method needs to know how smooth each pipe is on the inside. The hoses are smooth plastic, so a
standard smoothness value has been added for each hose in `graph.yaml`. The old shortcut value is kept
alongside it in case we ever want to compare the two.

## 6. The electrical and control side

Before working out any water, the simulator first decides what is actually switched on:

- **A valve opens** only if its solenoid actually gets power — meaning the controller is calling for that
  zone *and* there's an unbroken path of wires all the way out to the coil and back. (Or if you've opened
  that valve's manual bleed by hand.) A broken wire, a dead coil, or a controller that isn't sending the
  signal will leave a valve shut even though it's been told to open.
- **The pump runs** only if it's being called for *and* its relay gets that signal *and* there's mains
  power to it. The relay is the switch that lets the controller turn the mains-powered pump on and off.
- **The hand valve and the sprinkler flo-stops** are purely mechanical — no electricity involved.

In the picture this means we can show three different things at once for each wire and switch: what's
being *asked* for, what's actually *getting power*, and *where a path is broken*.

## 7. What you can control

You can set any combination of:

- the **pump** (on/off),
- the **four automatic zones** (on/off),
- the **hand-operated zone's valve** (open/closed),
- each **valve's flow-control** (the screw that throttles a valve down or shut),
- each **rotor's flo-stop** (the feature that shuts off one sprinkler head),
- and each **valve's bleed screw** (which opens a valve by hand, without the solenoid).

The situation being simulated is simply: these settings, plus the position of every hand control, plus
whatever faults you've switched on.

## 8. What can go wrong (the faults — still to be reviewed)

You can break any individual part in the way that part actually fails. The list of parts and their
possible failures already exists in `graph.yaml`, and it lines up with the system's existing fault list.
It's a long list, though, so **this is flagged for your review** — we may want to show only the common
ones at first. Each kind of failure has a realistic effect:

- **A clog** restricts flow at that spot — and a fully blocked head or pipe stops water getting through.
- **A break** either lets water escape (a leak) or stops a part working, depending on what breaks.
- **A wrong setting** — a throttled flow-control, a bleed screw left open, a mis-set nozzle, mis-wiring.
- **An electrical break** — a cut wire, dead coil, or controller fault — stops the valve or pump it feeds
  from switching on.
- **A weak pump** pushes less than it should.

A couple of things to decide here (see §11): whether to show the full list or a curated short list at
first, and whether to add a simple "leak somewhere along this pipe" option on top of the part-by-part
breaks.

## 9. The picture and how you use it

- **The diagram** lays out the whole system roughly the way it sits in real life — well and pump, the
  main run out to the valve box, the four zones, and the hand zone — with the control wiring drawn as a
  second layer over the top. Where we already have icons (pump, valve, rotor) we use them.
- **Water is shown visually:** thicker, bolder lines where more water is flowing; colour for how much
  pressure; and parts that are full and working shown differently from parts that are empty or idle.
- **Every place water leaves** — each sprinkler head, the hand-zone nozzle, and any leak — is marked with
  how much is coming out, plus a running total of how much the system is putting out altogether.
- **The wiring shows** what's been switched on, what's actually getting power, and where a path is broken.
- **Controls and fault switches** sit alongside the diagram: toggles for the pump, the zones, the hand
  valve, the flo-stops, the flow-controls and bleeds, and a set of buttons to introduce or clear faults.
- **It updates instantly** whenever you change anything, and shows a short note if something's off (for
  example, the pump being asked for more than it can deliver, or a valve that won't open because the
  pressure's too low to work it).
- **Ready-made examples** let you jump straight to common situations — everything off, a single zone
  running, or classic faults like a blocked nozzle, a split zone pipe, a dead solenoid, or a tired pump.

## 10. How we'd build it (once this plan is approved)

1. **Read the system files** and check they're complete — every part, nozzle, and model referenced should
   have its matching reference data, with a clear error if anything's missing.
2. **Turn the manufacturer tables into usable numbers** — the pump, valve, and nozzle behaviour — and
   flag clearly if anything is ever asked for outside the range those tables cover.
3. **Work out the electrical side** — for any set of commands and electrical faults, decide which valves
   and the pump are actually on, and which paths are broken.
4. **Hand the system to EPANET** — describe this system's layout to the water calculator (pipes, heights,
   pump curve, the spray-head regulators, and how much each head sprays), and confirm a known simple case
   matches the manufacturer's figures.
5. **Add the controls and faults** — apply what's switched on and any faults, run the calculation, and
   turn the results back into the form the picture needs.
6. **Check it behaves sensibly** — the totals balance, height has the right effect, and running two zones
   together affects each other correctly.
7. **Build the page** — the diagram, the controls, the fault switches, the instant updates, the examples.
8. **Tidy up the docs** — update the project notes (this adds a web page, which the project didn't have
   before) and write a short how-to-run note.

Steps 3–5 are the heart of it; step 7 is the biggest job but low-risk once the calculations are returning
clean answers.

## 11. Still to decide before building

1. **How many faults to show** — the full part-by-part list, or a shorter common set to start? And should
   we add a simple "leak somewhere along this pipe" option? (There's also a practical question for us: a
   handful of the part-by-part faults may be awkward to represent inside EPANET — those few are the only
   ones that might need special handling.)
2. **How much valve detail to show** — is it enough to treat each automatic valve as simply open, shut, or
   throttled (with the self-opening mechanism explained only as a label on the diagram), or do you want
   that inner workings shown more fully?
3. **Diagram style** — a clean schematic (easiest to read) or a true-to-the-garden layout?
4. **Units** — pressure in bar and flow in cubic-metres-per-hour to match the manufacturer tables, or
   litres-per-minute (more familiar), or a switch between them?
5. **How "live" it needs to be** — just "set it up and see the result", or also animate water filling and
   draining over time? (The plan above assumes the simpler "see the result" version.)
