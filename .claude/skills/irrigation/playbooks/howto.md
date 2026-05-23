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
   - solenoid ¼-turn ON/OFF (manual operation) → `IMG.pgv-valve-solenoid-label`
   - solenoid swap (replacement part view) → `IMG.valve-solenoid-replacement-product` (and the procedure itself is in `knowledge/valve-solenoid.md` *Replacing the solenoid*)
   - rotor parts callout / cap removal / arc adjustment → search by `subjects: [heads]`
   - rotor adjustment-key options → `IMG.rotor-adjustment-key-plastic` (the consumer plastic key alongside the existing metal-wrench shots)
   - **rotor nozzle install / replacement** → already documented end-to-end in `knowledge/heads.md` *Nozzle install / replacement*; uses `IMG.rotor-nozzle-insertion-collar` (P/N 123200), `IMG.pgp-rotor-cap-callouts`, and `IMG.rotor-nozzle-install-step-1/2/3`. Refer the user to that procedure rather than restating it.
   - rotor install / replacement with a swing joint → `IMG.swing-joint-product` (the part) + `IMG.rotor-install-swing-joint-illustrated` (the buried cross-section)
   - MP Rotator nozzle work (Z1, Z4) → `IMG.mp-rotator-wrench` for the orange nozzle key
   - voltage / resistance verification with the homeowner's actual meter → `IMG.multimeter-stanley-front` + `IMG.multimeter-stanley-leads`
   - head-pressure verification (PRS40 regulation check) → `IMG.pressure-gauge-test-on-riser`

   Use judgement on image count and placement. A broad first-turn answer rarely needs more than one orienting picture; a deep procedural walkthrough can want more, surfaced at the beats they help. Avoid dumping a gallery up-front when the user hasn't asked for one yet.

   **Deliver images with `SendUserFile`.** Markdown `![](media/...)` paths do **not** render in the user's chat UI — the user sees nothing. Pass the absolute file path to `SendUserFile` and put the manifest's `caption:` in the tool's `caption` field.

6. **Compose the procedure — pace it to the question.**

   The single biggest failure mode is dumping a full service-manual answer on the first turn of a session, when the user only asked a broad question. Match the depth of your reply to the depth of the ask; deliver in beats and let the user pull more.

   - **Broad / first-turn question** ("how do I clean a valve?", "what's involved in replacing a rotor?"): give the high-level shape, the safety bit as a one-line preamble, and the first one or two actions — then stop. Don't pre-list every step, failure mode, and verification.
   - **Specific / mid-procedure question** ("the diaphragm is out, what am I looking at?", "what torque on the bonnet screws?"): go as deep as the question warrants. Surface the inspection criteria, the relevant image, the exact number from the doc.
   - **Use judgement on delivery shape.** Numbered steps when the order matters; prose when it doesn't; a short paragraph plus a question when you're handing the turn back. No required template — pick what reads least like a manual for the question you got.
   - **Safety still goes first** — but as a one-line preamble, not a "Pre-flight" header with five bullets. "Pump off at the controller, open the bleed screw for a few seconds to let pressure out" is enough.
   - **Surface stop-points and inspection criteria at the moment they apply**, not as a preemptive list. The user doesn't need every failure mode before they pick up a screwdriver.
   - **Verification belongs at the end of the procedure**, not the end of the first message — bring it up when the user is actually close to done.
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
> *(image: `media/valve_bleed_screw_image_0.png` — sent via `SendUserFile` with caption "Bleed screw on top of the valve; loosen to bleed, hand-tighten to close.")*
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

That example is appropriate-length because the question is specific and the procedure is short (two parallel options). Contrast with a broad first-turn question:

> **"How do I clean a valve?"** (broad, first-turn)
>
> "Cleaning" on a PGV-101G can mean a few different things — which one?
>
> *(Use `AskUserQuestion` with the three live options: filter mesh, internal parts, solenoid. Once they pick, open with the safety preamble + first one or two actions, then stop. Don't pre-write the disassembly + inspection + reassembly + verification on a one-line question.)*
>
> Why this shape: the homeowner has not told you what's wrong or what they want to do. A full disassembly + every failure mode + verification on a vague intent forces them to read past a lot of irrelevant text to find the bit that applies to them — exactly the "feels like reading a manual" failure.

## What you do not do
- Don't walk through 230 V work. Refuse, recommend a pro.
- Don't approximate vendor numbers. Quote from the doc/PDF or omit.
- Don't roll multiple actions into one step inside a numbered procedure — one action per step there. But don't impose numbered steps on a three-line answer either.
- Don't front-load a broad question with the full procedure. If the user asked "how do I clean a valve?" they have not asked for 11 steps + every failure mode + verification — give them the shape and the first move, let them pull.
- Don't drift into diagnosis. If "how do I install a new valve" turns into "actually my current one weeps when off, can you help find why" — switch to `irrigation-troubleshoot`.
- Don't expose internal IDs to the user. Captions only — and never paste a `media/<file>` path into prose; the file goes via `SendUserFile`.
