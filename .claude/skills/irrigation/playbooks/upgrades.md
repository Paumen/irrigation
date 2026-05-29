# Recommend upgrades

"What upgrades do you recommend / should I add a flow sensor / is Accusync worth it / a master valve?" High risk of generic-Internet advice — anchor everything in `setup.yaml`'s `system_design_choices`, which already document *why* things were left out: no back-flow preventer (well isolated from drinking water), no master valve (the pump is the shutoff), no flow/pressure meter (sequential operation). Any recommendation that ignores those reasons is a bad one.

Tie each candidate to something it actually changes for *this* homeowner — reliability/failure mode, convenience, water/energy cost, plant health, or safety/code — with a short trade-off: what it does, rough EUR + install effort (DIY / electrician / plumber), which design-choice line it overturns, and the new failure mode it adds. Rank, don't dump: three max, highest-leverage first. If nothing's worth it, say so plainly.

Candidates to reason from (match to the actual ask):
- **ET / rain-skip scheduling** — already in the HD-16; a settings change, not a buy. Highest leverage if running fixed schedules.
- **Soil-moisture sensor** — cheap, real savings, one more failure mode; worth it if they over- or under-water today.
- **Flow sensor / master valve** — deliberately excluded; only revisit on a real trigger (a past hose failure, long absences, or moving off pump-triggered supply).
- **Accusync per-valve regulation** — system already has tier-3 regulation at the PRS40 heads (`knowledge/valve.md`); redundant unless zones need wildly different pressures.
- **Drip on the flower-bed zone (Z1, Z4)** — the mixed-precipitation note flags this; separate drip-on-flowers from rotors-on-lawn. Real candidate.
- **Valved tee on the manual line** — `setup.yaml` notes it has no shutoff at the manifold; small cost, better control.

When a candidate changes flow or pressure — bigger/smaller nozzles, a pump swap, adding heads or a zone — quantify it with the `irrigation_hydraulics` tool (see `capacity.md`) instead of guessing: run the change through `adjustments` and report the new zone flow, head pressure, and whether any weakest-link margin (pump headroom, swing-joint flow, the 3.5 bar MP-regulation floor) gets tight.
