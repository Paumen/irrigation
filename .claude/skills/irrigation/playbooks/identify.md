# Playbook: identify what model the homeowner has

Use when the user isn't sure which model is on their system — "what relay is this?", "what's the model on the valve?", "is this an MP Rotator or an I-20?", "what nozzle is in this rotor?". Or when they want to confirm against `setup.yaml`.

Identification is mostly a lookup-and-match exercise. `setup.yaml` already says what the homeowner is supposed to have; your job is either to (a) hand that back with a picture so they can confirm, or (b) when they're staring at a part that doesn't match the file, help them work out what it actually is.

## Protocol

1. **Read `setup.yaml`.** Note the model listed for the part the user is asking about. This is the *expected* answer.

2. **Decide which path:**

   - **A. Confirm-the-expected** — the user is just checking. Read `setup.yaml`, look up the image in `images.yaml` (or `media/`), and hand back model + image + a one-line "look for this on the body / cap / label" tell. Done.
   - **B. Mismatch or unknown** — the user is looking at a part that doesn't match the file, or `setup.yaml` doesn't have it. Walk them through identifying it from what they can see.

3. **For path B, ask in this order until you can name the model:**

   - **What does the label say?** Almost every Hunter / RainMachine / DAB part has a model number stamped or stickered on it. Cap top, side of the body, inside the lid, on the underside of the rotor cap. Ask first; it short-circuits the rest.
   - **Photo if possible.** If the user can send a photo, ask for one — clearest tell wins. Compare against `media/` and `images.yaml` captions.
   - **Shape & feature tells** — when there's no label and no photo:
     - **Valve:** globe vs angle (globe = inlet and outlet in line, bonnet on top); bleed screw on top? flow control handle on top? black solenoid on the side? → PGV-101G family.
     - **Rotor body:** stainless riser, rubber cap, set-screw on top under a flap → Hunter I-20. Plastic cap, small slot screw on top, no flap → MP Rotator on a Pro-Spray body.
     - **Spray body:** "PRS40" stamped on the cap = pressure-regulated 2.8 bar (40 PSI) — this is the Pro-Spray PRS40.
     - **Relay:** Hunter PSR-52 is a small cream/grey box about a hand wide, labelled PSR-52 on the front. PSR-B is similar but says "PSR-B" — note that PSR-B is *not* part of this homeowner's system (it was excluded; see `images.yaml` header).
     - **Controller:** RainMachine HD-16 TOUCH = colour touchscreen, "RainMachine" word-mark, 16 zone terminals inside.
   - **Cross-check the install year and zone wiring** in `setup.yaml`. A part installed in 2020-08 alongside the others is almost certainly what the file says; a part installed later by someone else is the more likely mismatch.

4. **Surface the image.** From `../irrigation-troubleshoot/images.yaml`, pick the entry whose `subjects:` matches the area. Common identification images, grouped by what the user is trying to confirm:

   - **Valve (PGV-101G)** → `IMG.pgv-valve-product` (anchor), `IMG.pgv-valve-solenoid-label` (the stamped "24VAC SOLENOID PAT. NO. 5979482" + ¼-turn arrows — the strongest single tell), `IMG.pgv-valve-lineup` (slip vs threaded vs MM body variants).
   - **Valve — exclusion** (homeowner does *not* have these): `IMG.pgv-valve-dc-variant`, `IMG.pgv-valve-dc-labelled` (PGV-101-MM-DC), `IMG.pgv-valve-dc-variant-installed`. Use to confirm the homeowner's solenoid label says "24VAC" rather than "DC LATCHING".
   - **Rotor (I-20-04-SS)** → `IMG.rotor-i20-product` (anchor), `IMG.rotor-i20-family-heights` (4" / 6" / 12" — homeowner has the 4"), `IMG.rotor-i20-nozzle-selector-close` (the "3.0" etc. number on the blue cap tells you the installed nozzle), `IMG.pgp-rotor-cap-callouts` (slot layout — same on the I-20).
   - **Solenoid** → `subjects: [valve-solenoid]`; `IMG.pgv-valve-solenoid-label` is the canonical identification close-up.
   - **Relay (PSR-52)** → `IMG.relay-controller-wiring-diagram` (helps confirm the same wiring pattern the homeowner has).
   - **Controller (RainMachine HD-16 TOUCH)** → `IMG.rainmachine-similar-model` — **illustrative only**: the photo is a Mini-12 (12 zones, otherwise the same layout); the homeowner's HD-16 has 16 zones. Caption must say "similar layout" or "similar model", *not* "your controller".

   Inline the image with the caption from the manifest.

5. **Compose the answer.**

   - **Model name + what it is in one sentence** ("Hunter PGV-101G — 1-inch globe-type zone valve, 24 V solenoid.").
   - **The image**, with caption.
   - **The tell**: the one or two visible features that confirm it's this model and not a sibling ("bleed screw on top of the bonnet + black solenoid on the side = PGV family; the 'G' suffix means the flow-control variant").
   - **Mismatch note** if `setup.yaml` says something different from what the user is seeing: "Your setup file says X but you're looking at Y — want me to update the file, or do you want to figure out why they differ?"

6. **Offer the follow-up.** "Want me to explain how it works, or walk through how to operate it manually?" — pivots to `explain.md` or `howto.md`.

## What `setup.yaml` says (quick reference for this homeowner)

Read the file for the live values — but as a cache for fast lookups: controller is RainMachine HD-16 TOUCH; pump start relay is Hunter PSR-52; pump is DAB Jet; zone valves are four Hunter PGV-101G; rotors are Hunter I-20-04-SS; spray bodies are Hunter Pro-Spray PRS40 carrying MP Rotators.

## What you do not do
- Don't guess. If you can't pin the model from what the user can see, say so and ask for the label or a photo.
- Don't argue with the user about what they're looking at. If their description doesn't match `setup.yaml`, the file is the more likely thing to be wrong.
- Don't surface internal IDs. Image captions and file paths only.
- Don't drift into how-to or diagnosis from the identification — offer the pivot at the end and let the user pick.
