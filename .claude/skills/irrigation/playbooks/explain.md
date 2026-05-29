# Explain how a part works

"How does a valve work / what's the diaphragm for / why a bleed screw / how does the pump start relay decide to switch on."

Find the part's `knowledge/<area>.md` and read its operation section. Internals have their own sibling docs — `valve-internals.md` (diaphragm, seat, metering ports), `valve-solenoid.md` (coil, plunger). Answer in the homeowner's terms: strip the vendor jargon, keep European units. Pin which model they actually own from `setup.yaml` so the answer is about their PGV-101G / I-20 / PSR-22, not a generic part.

Surface one orienting image from `images.yaml` (the cutaway/parts-callout shots work best for "how it works"). For a measurement the user hasn't taken yet, the illustrated explainers read better; once they're actually testing, switch to the photos of their real Stanley meter.

Add a one-line "in your system" note when their model adds context (where it sits, install year, what's downstream). End by offering the natural pivot — "want to know how to operate it manually, or where it sits in your setup?"

Don't restate the whole doc, don't invent numbers, and if the user turns to "...and that's why mine's broken?" hand off to `irrigation-troubleshoot`.
