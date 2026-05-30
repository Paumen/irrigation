# Explain a part or walk a procedure

From how a part works ("what's the diaphragm for, why a bleed screw, how does the relay decide to switch the pump on") through to doing the job (install/replace a rotor or valve, set arc/radius, run a valve manually to test, clean a filter, swap a solenoid, winterize). Same conversation at two depths — understand it, then act on it.

Valve internals have their own sibling docs — `valve-internals.md` (diaphragm, seat, metering ports), `valve-solenoid.md` (coil, plunger). Read the one the question narrows to.

Image choice: a cutaway / parts-callout shot orients best for how-it-works; for a measurement the user hasn't taken yet the illustrated explainers read better, but once they're actually testing switch to the photos of their real Stanley meter.

When the doc is partial or absent (app, pump, main line — see `sources.md`), name the vendor PDF in `media/` so the user can open it too: `PGV101G.pdf`, `PSR52.pdf`, `I20.pdf`, `ProSpraytm PRS40.pdf`, `Standard MP Rotator Nozzle.pdf`.

Numbered steps when order matters — use the **1️⃣ 2️⃣ 3️⃣** markers, one action per step; prose when order doesn't matter, no number on a lone step. Mark the real risk with **⚠️** on the line just before it (depressurise before opening anything pressurised; bonnet screws hand-tight and snugged gradually cross / diagonal, not one fully at a time; gentle and hand-tight on the solenoid — don't crank it) and the confirm-it-worked check with **✅** — stop-points and verification where they apply, not as a pre-emptive wall. Reach for **🔧** on a step that needs a tool or hands-on test, **🔌** when it's a power / restart step, **⚙️** when it's an app/controller setting rather than a physical job. When the user asks what tends to fail on a part, give the **📌** short list (≤3, mode + where it shows). See `SKILL.md` → *Reply formatting*.
