# Playbook: walk through a procedure

Use when the user wants to *do* something physical to their system — install a new rotor, replace a valve, configure a rotor's arc and radius, manually run a valve to test it, clean a clogged filter, swap a solenoid, winterize. Anything that ends with the homeowner picking up a tool.

The risk profile is real here: water under pressure, 24 V control wiring, occasionally 230 V mains nearby. Your job is to deliver the procedure clearly *and* keep the homeowner safe. Refuse mains work; walk through everything else, grounded in the vendor doc for *their* model.

## Protocol

1. **Read `setup.yaml`** before saying anything. The procedure for a Hunter PGV-101G is not the procedure for a generic globe valve; the procedure for an I-20 rotor with a PRS40 body is not the procedure for an MP Rotator. Pin the model first.

2. **Confirm what the user wants to do.** Procedures branch — "install a new rotor" splits into "new head on an existing riser" vs "extend a lateral and add a head". One short clarifying question with `AskUserQuestion` (≤4 options) is fine; more than one is friction. Skip the question if the user already said clearly which case it is.

3. **Apply the safety gate.** Before anything else in the answer:

   - **Refuse mains (230 V) work outright.** That includes anything on the input side of the PSR-52 pump start relay and anything on the pump itself. Say so plainly and suggest a professional.
   - **For pressurised water work** (opening a valve, removing a rotor cap, swapping a head, opening the valve bonnet): state the pump-off-and-depressurise step at the top of the procedure, not buried in the middle. "Turn the pump off at the controller, then run a zone manually for 10 seconds to let the pressure out — only then start."
   - **For 24 V work** (rewiring a valve solenoid, swapping a solenoid, anything inside the valve box wiring): say "controller in OFF, not just paused" once at the top.

4. **Read the doc.** Map the task to the `knowledge/` doc and read the relevant section:

   - install a valve, replace a valve, valve teflon/sealant rules → `valve.md` *Installation*
   - manual valve operation (bleed screw, turn solenoid) → `valve.md` *Manual operation*
   - flow control adjustment → `valve.md` *Flow control adjustment*
   - swap a diaphragm, clean valve internals (metering ports) → `valve-internals.md`
   - swap a solenoid, clean solenoid plunger/ports → `valve-solenoid.md`
   - rewire the PSR-52 → `relay.md`
   - extend wiring run, add a splice, waterproof a connector → `wiring.md`
   - install a rotor, set arc/radius, swap nozzle → `heads.md`
   - cap off a lateral, shorten a run, winterize a dead-end → `laterals.md`

   If the area doc is partial (see `sources.md`) or absent (F1 app, F5 pump, F6 main line), drop straight to the vendor PDF in `media/` — `PGV101G.pdf`, `PSR52.pdf`, `I20.pdf`, `ProSpraytm PRS40.pdf`, `Standard MP Rotator Nozzle.pdf`. Cite the PDF by filename in the answer so the user can open it themselves.

5. **Look up the images.** `../irrigation-troubleshoot/images.yaml` carries the procedure-relevant photos. Common ones the homeowner will want to see:

   - bleed screw / manual operation → `IMG.bleed-screw`
   - flow-direction arrow on valve body → `IMG.flow-direction`
   - external leak inspection points → `IMG.external-leak`
   - rotor parts callout / cap removal / nozzle change / arc adjustment → search by `subjects: [heads]`
   - solenoid coil / plunger → search by `subjects: [valve-solenoid]`

   Inline the image at the step where the user actually needs it, not all at the top. One image per logical step beats a wall of pictures.

6. **Compose the procedure.**

   - **Numbered steps**, short, one action per step. No paragraphs.
   - **Pre-flight checklist** at the top: power state, depressurisation, tools, parts, expected duration.
   - **Stop points**: explicit "if you see X, stop and tell me — don't push past it" where the doc warns about a damage mode (cross-threaded fitting, kicked rotor cap, solenoid wires touching, etc.).
   - **Verification step at the end**: how the homeowner confirms the procedure worked (water on, no weeping, correct arc, valve closes cleanly).
   - **Numbers come from the doc**, not from memory. Torque, thread sealant type, coil resistance range, riser height — copy from the doc / PDF or omit and point to it.

7. **Offer the natural follow-up.** End with one short prompt: "want me to walk through testing it once you're done, or how to clean the filter while you're in there?" Keeps the conversation in the same skill.

## Examples of good shape

> **"How do I run a valve manually to test it?"**
>
> Two ways — pick whichever is easier to reach on your PGV-101G.
>
> Pre-flight:
> - Pump can stay on; you're going to use the valve's own bleed path.
> - Stand to the side of the bleed screw, not over it — a fine spray comes out.
>
> Option A: bleed screw (easiest).
> 1. Find the bleed screw on top of the valve bonnet.
> 2. Turn it anticlockwise about ½ to 1 full turn — no more.
> 3. Water should flow into the zone within a few seconds. A fine spray vents from under the screw — that's normal.
> 4. To close: turn the bleed screw clockwise, hand-tight only. Don't use a tool.
>
> ![Bleed screw on top of the valve; loosen to bleed, hand-tighten to close.](../../media/valve_bleed_screw_image_0.png)
>
> Option B: turn the solenoid (also fine, no spray).
> 1. Find the black solenoid on the side of the valve.
> 2. Turn the whole solenoid body ¼ turn anticlockwise.
> 3. Water should flow into the zone within a few seconds.
> 4. To close: turn the solenoid ¼ turn clockwise, hand-tight, until it stops.
>
> **Stop and tell me if:** the bleed screw is stiff (the o-ring may be perished — don't force it) or the solenoid won't turn by hand (something else is wrong, force will break the plastic).
>
> Verification: when you close it again, the zone heads should drop within ~30 seconds. If they keep running, the valve isn't fully closing — that's a separate conversation.
>
> Want me to walk through cleaning the bleed-screw o-ring while you're in there?

## What you do not do
- Don't walk through 230 V work. Refuse, recommend a pro.
- Don't approximate vendor numbers. Quote from the doc/PDF or omit.
- Don't roll multiple actions into one step. One action per step, every time.
- Don't drift into diagnosis. If "how do I install a new valve" turns into "actually my current one weeps when off, can you help find why" — switch to `irrigation-troubleshoot`.
- Don't expose internal IDs to the user. Image captions and `media/<file>` paths only.
