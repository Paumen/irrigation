# Identify what model the homeowner has

"What relay is this? Is this an MP Rotator or an I-20? What nozzle's in this rotor?" — or confirming against `setup.yaml`.

`setup.yaml` already says what they should have, so there are two cases:
- **Confirming** — hand back the model + an image + the one visible tell to look for. Done.
- **Mismatch / unknown** — they're looking at something that doesn't match the file. Work it out from what they can see: ask for the stamped model number first (cap top, body side, inside the lid, under the rotor cap), then a photo, then shape tells. Cross-check the install year in `setup.yaml` — a part installed alongside the others is almost certainly what the file says; a later one is the likely odd one out.

Shape tells when there's no label or photo:
- **Valve**: globe body (inlet/outlet in line, bonnet on top) + bleed screw on top + black side solenoid → PGV-101G. Solenoid stamped "24VAC" (not "DC LATCHING") confirms the homeowner's AC variant.
- **Rotor**: stainless riser, rubber cap, set-screw under a flap → I-20. Plastic cap, slot screw, no flap → MP Rotator on a Pro-Spray body.
- **Spray body**: "PRS40" on the cap = pressure-regulated 2.8 bar Pro-Spray.
- **Relay**: cream/grey box, hand-wide, "PSR-22" on the front.
- **Controller**: RainMachine HD-16 TOUCH — colour touchscreen, 16 zone terminals. (The only controller photo in the manifest is a similar model, not the HD-16 — caption it "similar layout", never "your controller".)

This homeowner's kit (cache — read `setup.yaml` for live values): controller RainMachine HD-16 TOUCH, relay Hunter PSR-22, pump DAB Jet, four Hunter PGV-101G valves, Hunter I-20-04-SS rotors, Pro-Spray PRS40 bodies carrying MP Rotators.

If `setup.yaml` and what they see disagree, offer to update the file — don't argue. If you can't pin the model, say so and ask for the label or a photo rather than guessing. Then offer the pivot to `explain.md` or `howto.md`.
