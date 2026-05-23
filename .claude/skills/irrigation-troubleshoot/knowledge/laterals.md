---
subject: Zone laterals (25 mm PE, valve manifold → heads)
root_cause_area: F8
serves: [troubleshooting, maintain, install, how-it-works]
coverage: partial
system_note: >
  Zone laterals are 25 mm polyethylene from the valve box manifold to the heads.
  Outdoor, in-ground, Wijchen (NL) climate — system is winterized each autumn
  because lateral water can freeze and split the pipe. Four zones, mixing I-20
  rotors and MP-on-PRS40 heads per zone.
summary: Partial — the broken-lateral signature (recent landscaping work), the dead-end winterization rule for capping or abandoning a pipe, and basic field-diagnosis of a punctured lateral. No deep hydraulic-design content yet.
read_when: a whole zone has gone weak with no visible head fault; one or more heads on a zone won't pop up while others on the same zone are normal; you find a persistent wet patch or soft ground along a known lateral run; you're removing a head or restructuring a zone and a stub will be left behind; you suspect recent garden/fence/driveway work damaged a pipe.
contents:
  - this system's laterals
  - broken-lateral signature (recent landscaping work)
  - field-diagnosing a broken lateral
  - dead-end winterization rule
  - capping or shortening a lateral (procedure pointer)
  - see also
---

# Zone laterals — 25 mm PE, valve manifold to heads

This is the **F8** neighbourhood: the polyethylene pipes that carry water from
the valve manifold out to the heads on each zone. On this system there are
four such laterals (one per zone), 25 mm PE, buried, mixing I-20 rotors and
MP-on-PRS40 spray bodies per zone.

Read this when the engine narrows to F8, or when a head-side symptom (won't
pop up, weak throw, brown spots on the far end of a zone) doesn't match
anything wrong at the head itself. Laterals fail mostly by **puncture** —
people put a spade, a fence post, or a tree root through one — not by aging
of the pipe.

## Broken-lateral signature

A *sudden* zone-wide loss of performance, with no change at the controller,
valve, or pump, almost always means a lateral has been punctured. Hunter's
own diagnosis flow for "rotor not fully popping up" calls this out
explicitly: **look for new trees and shrub plantings, new or repaired
fences, and recently dug ground** — these are the most common causes of a
broken pipe.

On this system the tells are:

- **Onset is sharp**, not gradual. Last week the zone worked; this week
  one or more heads on the zone are weak or won't pop up.
- The **whole zone is affected**, not just one head. A single weak head with
  the rest of the zone strong is a head-side problem (filter, nozzle,
  riser seal — see `heads.md`).
- **Recent garden activity** in the last few weeks/months in the rough path
  of the lateral: new tree or shrub planted, fence post driven, deck
  footing dug, paving lifted/relaid, mole/vole burrowing, root invasion
  from an established tree.
- Pressure at the manifold is normal during a zone run (so the pump and
  main line are fine), but **pressure at the far end of the zone is low**
  or there's visible flow loss between the manifold and the heads.

When all four are present the diagnosis is essentially confirmed before
digging.

## Field-diagnosing a broken lateral

Cheapest-first checks before digging up the lawn:

1. **Compare zones.** Run each of the four zones in turn at the controller.
   If only the suspect zone is weak, the fault is downstream of *that*
   zone's valve — i.e. its lateral or its heads. If multiple zones are
   weak, look upstream (main line F6, pump F5, controller call F2).
2. **Walk the lateral path during the run.** A punctured lateral pushes
   water into the soil. Look for a wet patch, soft/spongy ground,
   unusually dense grass, water bubbling at the surface, or a sinkhole
   along the line. The leak will be uphill of the failing heads, since
   pressure drops from the puncture onward.
3. **Listen.** With the zone running and other zones off, kneel near the
   suspected wet spot — a moderate to large puncture is audible as a
   hiss.
4. **Pressure-check at the heads.** With a pitot gauge in the stream or
   by feel: heads upstream of the puncture will be roughly normal, heads
   downstream will be weak. The transition between "normal" and "weak"
   heads brackets the leak.
5. **Manifold flow.** With the zone running and a manual gauge on the
   manifold tap (if fitted), zone flow should match the design — a sudden
   step-up in flow with a step-down in pressure means the pipe is open
   to soil somewhere.

If the leak isn't visible after a careful walk, the puncture is small or
deep; isolate the section by capping at successive tees until the symptom
clears, then dig only the short section that's left.

## Dead-end winterization rule

This system is winterized every autumn (Wijchen, NL — sustained sub-zero in
winter). **Water trapped in a pipe with no outlet will freeze, expand, and
split the pipe.** That's why every lateral has to end at a head (or a
valved drain), not at an outlet-less stub.

This matters whenever you change the layout:

- **Removing the last head on a lateral:** do **not** just cap the lateral
  at the removed head's location. That leaves an outlet-less stub from the
  upstream tee out to the cap, which will fill and freeze.
- **Correct method:** dig up the *upstream* head's tee, cut the lateral
  just past the tee leaving enough pipe to glue a slip cap, glue a PVC end
  cap on, and abandon the pipe to the removed head. The lateral now ends
  at a head again, so winterization can purge it.
- **Removing a head in the middle of a lateral:** same fix is not needed
  — water still has somewhere to go (the heads further downstream), so
  cap at the fitting under the removed head and continue. Step-by-step
  procedure for both cases lives in `heads.md` under *Capping off an I-20
  in-ground*.
- **Adding a head on a new spur off an existing lateral:** the new spur
  must terminate at the new head, not extend past it. Don't pre-run
  pipe "for future expansion" — that's exactly an outlet-less stub.

This rule applies to any winterized region. In a non-freezing region it's
optional (water in the stub does nothing) but it's still the cleaner
install.

## Capping or shortening a lateral (procedure)

Two cases, depending on where the head you're removing sits on the lateral.
The same procedure is repeated in `heads.md` under *Capping off an I-20
in-ground* because head removal is the most common reason to do it; both
copies are kept in sync.

**Case A — head is in the middle of a lateral (other heads downstream still
use the lateral):**

1. Dig down to expose the threaded fitting directly under the rotor.
2. Unscrew the rotor and any riser nipple from the fitting.
3. Thread a same-size cap or plug (½" or ¾" NPT to match the inlet) onto
   the fitting. Use Teflon tape on the threads — not paste *and* tape
   together (same Teflon rule as `valve.md`).
4. Turn the zone on briefly to check for leaks at the new joint.
5. Backfill once dry.

**Case B — head is the last one on its lateral (no heads downstream of it):**

This is the case that requires the dead-end rule above. The pipe between
the upstream tee and the removed head's location would become an outlet-
less stub, which will freeze and split. So you don't cap *at* the removed
head — you cap at the *upstream* tee:

1. Dig up the *upstream* head's tee on the same lateral.
2. Cut the lateral just past the tee, leaving enough pipe stub to glue a
   slip cap onto (a few cm).
3. Glue a PVC slip end cap onto the stub using approved PVC glue.
4. Dig up the dirt around the head you wanted to remove and unscrew it
   from its fitting. The pipe between the now-capped tee and the removed
   head is abandoned in place — it has no inlet and no outlet, so it
   simply sits in the soil. (If you want, you can also dig it up; it's
   not required.)
5. Turn the zone on briefly to check for leaks at the new slip cap before
   backfilling either dig.

**Materials.** PVC slip cap + approved PVC glue for slip joints, or a
threaded cap + Teflon tape for threaded fittings. Both are sold at any
hardware retailer in the relevant ½"/¾"/1" sizes.

**Always pressure-test before backfilling.** A glued slip cap that didn't
seat properly will weep, and the cheapest time to find that out is before
the trench is closed.

## See also

- `heads.md` — *Won't pop up* (the head-side symptom this area shows
  through), *Capping off an I-20 in-ground* (the lateral-modification
  procedure).
- `valve.md` — to exclude the valve as the cause when one zone is weak;
  particularly *Weeping when off* and the diaphragm-not-fully-opening
  case, which can also present as a zone-wide pressure drop.
- `valve-internals.md` — debris-on-diaphragm causing a partly-open
  diaphragm, another zone-wide-weakness candidate.
- `wiring.md` — to exclude wiring on a "no flow at all" zone (different
  symptom from "weak flow", but worth ruling out at the same time).
