# Playbook: recommend upgrades

Use when the user is asking what to add, change, or improve — "what upgrades do you recommend?", "should I add a flow sensor?", "is it worth fitting Accusync?", "should I add a master valve?", "what would you do differently if installing today?".

Upgrade advice has a high "generic Internet advice" failure mode. Avoid it by anchoring every recommendation in *this* homeowner's `setup.yaml` and `system_design_choices` — the file already documents *why* certain things weren't fitted, and your job is to either honour or thoughtfully challenge those reasons, not to forget them.

## Protocol

1. **Read `setup.yaml`** end to end, including the `system_design_choices` block. Those choices are deliberate trade-offs: no back-flow preventer (well isolated from drinking water), no master valve (pump is controller-triggered and acts as shutoff), no flow meter (sequential operation + pump-is-the-shutoff), no pressure meter (same logic). Any upgrade recommendation that ignores these reasons is a bad recommendation.

2. **Read `knowledge/valve.md`** *Per-valve pressure regulation (Accusync)*. It lays out the three pressure-regulation tiers (system-wide / per-valve / at-the-head) and notes that this system has tier 3 (PRS40 at the heads) and not tiers 1 or 2. That's the canonical text for the per-valve pressure question.

3. **Categorise the upgrade by what it would actually change.** Don't recommend an upgrade for its own sake — recommend it because it addresses one of:

   - **Reliability / failure mode** — e.g. a flow sensor to detect a broken lateral. Weigh against `setup.yaml`'s rationale for not having one.
   - **Convenience / autonomy** — e.g. a rain sensor or a soil-moisture sensor to skip cycles automatically.
   - **Water / energy cost** — e.g. nozzle changes for more uniform precipitation, smarter scheduling on the RainMachine.
   - **Plant health** — e.g. drip on the flower-bed zone, or splitting a mixed-precipitation zone.
   - **Safety / code compliance** — e.g. back-flow preventer if the well were ever cross-connected with drinking water.

   If you can't tie the upgrade to one of these categories for *this* homeowner, don't recommend it.

4. **For each candidate upgrade, lay out a short trade-off:**

   - What it does, in one sentence.
   - What it costs (rough EUR range + install effort: DIY / electrician / plumber).
   - What it changes about the current design (and which `system_design_choices` line it would invalidate).
   - The one thing that could go wrong with the upgrade itself — every added part is a new failure mode.

5. **Rank, don't dump.** Three is plenty. A list of ten upgrades is a list of zero. Lead with the highest-leverage one for this specific setup.

6. **Read sources where useful:**

   - Accusync per-valve regulators → `knowledge/valve.md` *Per-valve pressure regulation*.
   - Flow sensors / master valves → no local doc; fall back per `sources.md` F6 (IrrigationTutorials.com for hydraulics framing) and F7 vendor (Hunter support).
   - Smarter scheduling (RainMachine native ET, rain skip, soil-moisture probes) → RainMachine support (F1 in `sources.md`).
   - Nozzle changes → `media/Standard MP Rotator Nozzle.pdf` and `media/I20.pdf` for matched-precipitation logic.

7. **Compose the answer.**

   - **Direct framing first:** "Three upgrades I'd consider for your setup, ranked." Or, when nothing is worth recommending: "Honestly, your setup is well-thought-through. Nothing I'd add today."
   - **Per recommendation:** name → what it does → cost range → trade-off → "want me to dig into this one?"
   - **No image by default** — upgrade decisions are about your system as a whole, not a single part. If the user picks one to dig into, *that* answer can carry an image.

8. **Offer the follow-up.** "Want me to walk through how one of these would actually be installed on your valve box?" — pivots to `howto.md`.

## Candidate upgrade catalogue for this homeowner

A starting set to reason from — not a list to recite verbatim. Match recommendations to what the user actually asked.

- **Rain-skip / ET-based scheduling on the RainMachine** — already supported by the HD-16 TOUCH; this is a *settings* upgrade, not a hardware buy. Highest leverage if currently running fixed schedules.
- **Soil-moisture sensor** — small added cost, real water savings, one extra failure mode. Worth it if the homeowner over- or under-waters today.
- **Flow sensor** — `setup.yaml` deliberately excluded one. Reconsidering it would mean: detects broken laterals automatically, but adds a sensor as a failure mode and requires plumbing into the main line. Recommend only if the homeowner has had a lateral failure or is away for long periods.
- **Master valve** — same deal: `setup.yaml` excludes it because the pump acts as the shutoff. Only worth revisiting if pump triggering changes (e.g. moving to mains-water supply).
- **Accusync per-valve pressure regulation** — covered in `knowledge/valve.md`. This system already has tier-3 regulation at the PRS40 heads; tier 2 would be redundant *unless* the homeowner has wildly different pressure needs zone-to-zone. Usually not worth it on this build.
- **Drip on the flower-bed zone (Z1, Z4)** — the mixed-precipitation note on Z1 in `setup.yaml` flags exactly this. Drip on flowers, rotors on lawn, separate zones — better plant health and water efficiency. Real upgrade candidate.
- **Replacement of the manual line with a valved tee** — `setup.yaml` notes the manual line has no shutoff at the manifold. Adding a valve there is a small cost / small effort improvement to controllability.

## What you do not do
- Don't recommend upgrades that contradict `system_design_choices` without explicitly engaging with the reason. "Add a master valve" is incomplete; "the file says no master valve because the pump is the shutoff — that's still true, so I wouldn't add one" is the actual answer.
- Don't ignore install effort or cost. A 50 EUR sensor is different from a 500 EUR re-pipe.
- Don't recommend more than three upgrades in one turn. Pick the highest-leverage and let the user ask for more.
- Don't drift into how-to detail in the recommendation itself. Recommend, then offer to walk through.
