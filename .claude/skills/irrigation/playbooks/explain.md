# Playbook: explain how a part works

Use when the user asks how something on their system works — "how does a valve work", "what does the diaphragm do", "why is there a bleed screw", "what's the flow control for", "how does the pump start relay decide to switch on".

This is a read-and-summarise playbook. Most answers already exist in `knowledge/<area>.md` written for exactly this audience. Your job is to find the right doc, ground it in *this* homeowner's specific model from `setup.yaml`, and surface the relevant image.

## Protocol

1. **Read `setup.yaml`** to pin which model the homeowner owns for the part in question (e.g. valve = Hunter PGV-101G, not generic). If the user is asking about a part the homeowner doesn't have on their system, ask whether they're planning to add it or just curious — that changes whether to read their setup or answer generically.

2. **Pick the area doc.** Map the part to the `knowledge/` doc:

   - valve body, whole-valve question → `valve.md`
   - diaphragm, spring, seat, metering ports → `valve-internals.md`
   - solenoid, coil, plunger → `valve-solenoid.md`
   - PSR-52 pump start relay → `relay.md`
   - RainMachine controller → `controller.md`
   - 24 V field wiring, splices, common wire → `wiring.md`
   - rotors / MP rotators / nozzles → `heads.md`
   - lateral piping (25 mm runs to the heads) → `laterals.md`
   - pump (DAB Jet), main line (32 mm), app/cloud → no local doc; use `sources.md` fallbacks

3. **Read the doc.** Scan front-matter `contents:` first; jump to the matching section. For "how it works" questions specifically, every area doc has an "operation" / "hydraulics" / "how the X works" opening section — start there. If the user's question is about an internal part (diaphragm, solenoid plunger), open the sibling doc directly — they were split out for this case.

4. **Look up the image.** Open `../irrigation-troubleshoot/images.yaml`, find the entry whose `subjects:` lists the area. For "how it works", the canonical entries are:

   - valve → `IMG.parts-callout` (the cutaway with bodied parts labelled)
   - solenoid → search by `subjects: [valve-solenoid]`
   - internals → search by `subjects: [valve-internals]`
   - relay → search by `subjects: [relay]`
   - rotor → search by `subjects: [heads]`

   Use the manifest's `caption:` verbatim (or close). Reference the image by its `media/<file>` path — never by the `IMG.*` id.

5. **Compose the answer.** Three parts, in this order:

   - **One-paragraph explanation in the homeowner's terms.** Start from the doc, strip the vendor jargon, keep European units. Don't restate the whole doc — answer the actual question.
   - **The image**, inline, with the caption.
   - **A short "in your system" note** when the homeowner's specific model adds context worth mentioning: install location, install year, what's downstream, what's wired to it. Skip this if it doesn't add anything.

6. **Offer the natural follow-up.** End with one short prompt: "want me to walk through how to operate it manually / where it sits in your setup / how to clean it?" — phrased so the user can pivot to the `howto.md` or `identify.md` playbook without having to know the playbook exists.

## Examples of good shape

> **"How does a valve work?"**
>
> Water comes in from the main line and pushes against a thick rubber disc inside the valve called the diaphragm. A tiny hole in the diaphragm lets a trickle of water up into a small space above it. Because there's more surface area on top of the diaphragm than below, the water above is what holds the valve closed — counter-intuitive, but it's the trick that lets a tiny 24 V solenoid switch a full zone's worth of flow. When the controller energises the solenoid, it lifts a little plunger and lets that water above the diaphragm escape sideways out of the valve. With the pressure above gone, the incoming water wins, lifts the diaphragm, and the valve opens.
>
> ![Valve parts callout — 1 body, 2 flow control, 3 bleed screw, 4 solenoid.](../../media/valves-work_0.gif)
>
> In your setup, this is the Hunter PGV-101G — four of them in the outdoor valve box, fitted in 2026. Each one is the gatekeeper for one zone of rotors.
>
> Want me to walk through how to open one of them manually with the bleed screw, or how to spot which of the four is which?

## What you do not do
- Don't restate the whole `knowledge/` doc. The doc exists; cite the file at most once at the end if the user asks for "more detail".
- Don't make up part numbers, valve sizes, pressures, or coil resistances from memory. Numbers come from the doc or the vendor PDF.
- Don't drift into diagnosis. If the user follows up with "and that's why mine isn't working, right?" — switch them to `irrigation-troubleshoot`.
- Don't show internal IDs (`IMG.parts-callout`, `F7`, `Q12`). Captions and file paths only.
