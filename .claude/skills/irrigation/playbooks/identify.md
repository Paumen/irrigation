# Identify what model the homeowner has

"What relay is this? Is this an MP Rotator or an I-20? What nozzle's in this rotor?" `graph.yaml` already says what they *should* have, so there are two cases:
- **Confirming** — hand back the model + an image + the one visible tell to look for. Done.
- **Mismatch / unknown** — work it from what they can see: the stamped model number first (cap top, body side, inside the lid, under the rotor cap), then a photo, then shape tells. Cross-check the install year — a part installed alongside the others is almost certainly what the file says; a later one is the likely odd one out.

Shape tells when there's no label or photo:
- **Valve**: globe body (inlet/outlet in line, bonnet on top) + bleed screw on top + black side solenoid → PGV-101G. Solenoid stamped "24VAC" confirms it. Image `IMG.valve-auto-product-pgv-101g-catalog`. A bolted four-screw bonnet with a big cross-handle is the industrial ICV, *not* this system (`IMG.valve-auto-product-icv-101g`).
- **Rotor**: stainless riser, rubber cap, set-screw under a flap → I-20. Plastic cap, slot screw, no flap → MP Rotator on a Pro-Spray body. An MP Rotator projects several thin rotating streams, not a solid fan (`IMG.nozzle-rotator-product-mp-streams-closeup`); the nozzle cap is stamped e.g. "MP2000" (`IMG.nozzle-rotator-product-mp2000`).
- **Spray body**: "PRS40" on the cap = pressure-regulated 2.8 bar Pro-Spray; image `IMG.head-spray-product-pro-spray-prs40`.
- **Manifold** (the barred header in the valve box every zone valve hangs off): six 1" swivel-nut outlets on one bar → the LEV 6-way distributor (`IMG.fitting-manifold-product-lev-6way`).
- **Relay**: cream/grey box, hand-wide, "PSR-22" on the front.
- **Controller**: RainMachine HD-16 TOUCH — colour touchscreen, 16 zone terminals. (The only controller photo is a similar model, not the HD-16 — caption it "similar layout", never "your controller".)
- **Splice**: little blue/white gel-filled splice on the 24 V wires → 3M Scotchlok 314 (blue cap stamped "3M 314"). For naming/synonyms and buying spares, see `knowledge/wiring.md` → *The connector itself*; image `IMG.wiring-product-3m-connector-314`.

This homeowner's kit (cache — read `graph.yaml` for live values): controller RainMachine HD-16 TOUCH, relay Hunter PSR-22, pump DAB Jet, four Hunter PGV-101G valves, Hunter I-20-04-SS rotors, Pro-Spray PRS40 bodies carrying MP Rotators.

If `graph.yaml` and what they see disagree, offer to update the file — don't argue. If you can't pin the model, say so and ask for the label or a photo rather than guessing.
