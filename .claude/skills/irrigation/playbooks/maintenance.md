# Playbook: seasonal maintenance and checks

Use when the user is asking about routine, calendar-driven work — "how do I winterize?", "spring start-up checklist?", "what should I check mid-season?", "how often should I clean the filter?", "when should I replace the diaphragm?".

This is the cousin of `howto.md`: it draws from the same `knowledge/` docs and vendor PDFs, but the framing is seasonal and preventative rather than task-driven. Wijchen, NL climate matters: winter freeze risk is real, summer drought is mild, growing season runs roughly April–October.

## Protocol

1. **Read `setup.yaml`** — `system.area` (Netherlands, Wijchen) drives the seasonal logic; equipment install dates feed the "is this part old enough to inspect" check; the laterals notes ("zero freeze damage historically") matter for the winterize answer.

2. **Identify the season / cadence:**

   - **Spring start-up** (March–April for NL): pressurise, check for winter damage, verify each zone runs cleanly, set schedule.
   - **Mid-season checks** (May–September): heads spraying clean and to spec, weeping when off, controller schedule still matching weather.
   - **Winterize** (October–November for NL): drain, depressurise, protect freeze-vulnerable parts.
   - **Annual / multi-year inspection**: diaphragm condition, solenoid plunger / o-ring, filter mesh, riser seals on rotors.

3. **Read the relevant docs:**

   - Winterize laterals (dead-end winterization rule) → `knowledge/laterals.md`. It explicitly covers the dead-end rule for this system.
   - Valve filter / mesh cleaning → `knowledge/valve.md` *Filter / mesh*.
   - Valve diaphragm inspection interval → `knowledge/valve-internals.md`.
   - Solenoid o-ring / plunger inspection → `knowledge/valve-solenoid.md`.
   - Rotor riser seal, internal assembly removal → `knowledge/heads.md`.
   - Wiring connector inspection (waterproof gel-caps in the valve box) → `knowledge/wiring.md`.

4. **Apply the safety gate (same as `howto.md`):**

   - Mains (230 V): refuse. The PSR-52's 230 V / mains side (mains supply and switched output to the pump) and the pump itself are off-limits; its 24 V control input is fine.
   - Pressurised water: pump OFF + run a zone manually to depressurise before opening anything.
   - 24 V: controller in OFF (not paused) before opening a valve solenoid.

5. **Compose the answer as a dated checklist.** Calendar maintenance reads best as a list with a header per phase, not as prose.

   - **Header per phase** (e.g. "Spring start-up — late March / early April").
   - **Pre-flight at the top** (tools, expected duration, weather window).
   - **Numbered steps**, one action per step.
   - **Stop points** marked in-line (e.g. "if you see a wet patch in the lawn over a known lateral, stop and tell me — that's a lateral failure, separate conversation").
   - **Verification at the end** ("all four zones run, no weeping after, controller schedule on").

6. **Surface images at the steps that need them:**

   - Filter mesh removal → search `images.yaml` by `subjects: [valve]` for the filter image.
   - Bleed screw operation → `IMG.bleed-screw`.
   - External leak inspection points → `IMG.external-leak`.
   - Rotor cap removal / internal assembly → search `subjects: [heads]`.

7. **Offer the follow-up.** "Want me to walk through the diaphragm inspection in detail while you're in there?" → `howto.md`. "Want to revisit your zone runtimes for the new season?" → `capacity.md`.

## Seasonal cheat-sheet for this homeowner (Wijchen, NL)

A starting point — refine to what the user actually asked.

**Spring start-up (late March / early April):**
1. Pump off. Open the manual valve at the hose outlet to confirm the line is dry.
2. Open the bleed screw on one zone valve. Close the manual valve. Slowly turn on the pump.
3. Walk each zone: run it manually for 1–2 minutes, watch for heads not popping up, weak fans, weeping at the bonnet, wet patches over known lateral runs.
4. Check the valve-box wiring connectors for moisture intrusion. They should be the waterproof gel-cap type per `knowledge/wiring.md`.
5. Set the RainMachine schedule for the season (low frequency early; ramp up as ET climbs).

**Mid-season checks (monthly, May–September):**
1. One full run-through — eyes on every head, listen at the valve box for hiss when zones close.
2. Check controller log / app for any zones that failed to run.
3. Adjust schedule against actual rainfall — RainMachine's rain-skip and ET features do most of this if enabled (see `upgrades.md`).

**Winterize (late October / early November, before the first hard frost):**
1. Per `knowledge/laterals.md`: this system has dead-end laterals, so the winterize rule is the documented one in that doc — read it; don't improvise.
2. Pump off at the controller. Open the manual valve to drain the line.
3. Open the bleed screw on each zone valve in turn to drain the upstream side of the manifold.
4. Note in `setup.yaml`: laterals have zero freeze damage historically — but check for any new exposed sections from this season's work.

**Annual / multi-year:**
- Valve filter mesh: clean annually at spring start-up; replace if torn (see `knowledge/valve.md` *Filter / mesh*).
- Valve diaphragm: inspect every ~5 years or sooner if a zone develops weeping (`knowledge/valve-internals.md`).
- Solenoid o-ring: inspect when symptoms suggest, not on a schedule (`knowledge/valve-solenoid.md`).
- Rotor riser seal: replace if the rotor weeps from around the riser when off (`knowledge/heads.md`).

## What you do not do
- Don't recite the entire seasonal checklist when the user asked a narrow question. "How often should I clean the filter?" → answer about the filter, not winterize + diaphragm + everything else.
- Don't approximate winterize procedure from generic North-American advice. This system's laterals doc has the specific rule for this build — use it.
- Don't recommend mains-side maintenance the homeowner could do themselves. They can't; refuse and recommend a pro.
- Don't drift into diagnosis. "When I winterized last year my zone 2 was weak" → switch to `irrigation-troubleshoot`.
