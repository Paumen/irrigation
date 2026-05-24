# Playbook: capacity and hydraulics questions

Use when the user is asking about the *limits* of their system — "how many zones can I run at once?", "can I add a fifth zone?", "what's my flow budget?", "is my pump big enough?", "how long should I run zone 3?". Anything that's a hydraulic-arithmetic answer rather than a how-to.

This playbook has actual numbers in it. They come from `setup.yaml` (this homeowner's pump rating, zone flows, pipe sizes) and the vendor PDFs in `media/` (nozzle precipitation rates, head pressure requirements). Don't make them up.

## Protocol

1. **Read `setup.yaml`** end to end. Capacity questions touch most of it: pump rating, zone-level flow estimates, pipe sizes and lengths, head models, head count per zone, system design choices (no master valve, no flow sensor — those matter for capacity reasoning).

2. **Identify which question.** Common shapes, each handled differently:

   - **"How many zones at once?"** Answer: one. This homeowner's settings (`settings.programs`) explicitly run zones sequentially, and the design choices document that the no-flow-sensor / no-master-valve trade-off assumes one zone at a time. Confirm by checking the per-zone `flow_rating_m3h` against the pump's `flow_rating_m3h` (3.8 m³/h). If any single zone is at or under that, one-at-a-time is the design answer.
   - **"What's my flow budget per zone?"** Use the pump's flow rating (3.8 m³/h, ≈ 63 L/min) minus a margin (10–15%) as the practical ceiling. Compare against each zone's listed `flow_rating_m3h`. State headroom per zone.
   - **"Can I add a fifth zone?"** Two limits: controller has 16 stations (RainMachine HD-16 TOUCH), so terminal count is fine; the practical limit is whether a new zone's flow fits the pump and the 32 mm main line. State both checks: pump headroom and main-line capacity (~3.5 m³/h continuous at typical residential head loss for 32 mm LDPE).
   - **"How long should I run zone X?"** This is a precipitation question, not a flow question. You need: nozzle precipitation rate (from the I-20 / MP Rotator / PRS40 PDFs in `media/`), root-depth and soil-type assumption, ET (evapotranspiration) for Wijchen, NL. State all three inputs you used and the resulting minutes — and label it as an estimate to refine from observed runoff.
   - **"Is my pump big enough?"** Compare zone peak flow vs pump `flow_rating_m3h`; compare required head at the heads (~2.8 bar for the PRS40-regulated bodies, plus elevation, plus pipe friction) vs pump `pressure_rating_bar` (4.8 bar). State the margin in bar.

3. **Read the relevant `knowledge/` doc** for the area you're reasoning about:

   - lateral / main-line hydraulics → `knowledge/laterals.md` and `knowledge/wiring.md` (the wiring doc carries the wire-distance table; the laterals doc carries the lateral-failure signature)
   - per-valve pressure regulation → `knowledge/valve.md` *Per-valve pressure regulation (Accusync)* section
   - head precipitation rates → `media/I20.pdf`, `media/Standard MP Rotator Nozzle.pdf`, `media/ProSpraytm PRS40.pdf`, `media/RC-219-MP820-IR-MP-Rotator-Nozzle-Written-Specifications-FINAL-100924.pdf`
   - design context (Hunter "Controlling High Pressure" 3-tier model) → referenced in `sources.md` F6 section

4. **Show your work.** Capacity answers without numbers are useless. Lay out the calculation in 2–4 lines: input → input → result. Example: "Pump = 3.8 m³/h. Zone 1 = 2.2 m³/h. Headroom = 1.6 m³/h (≈ 42%). Comfortable." The homeowner doesn't need to redo it but should be able to follow it.

5. **State the assumptions you made.** Estimated flow rates per zone in `setup.yaml` are *notes the homeowner wrote*, not measurements — call that out when you lean on them. ET, soil type, root depth, elevation: same.

6. **Compose the answer.**

   - **Direct answer first.** "One zone at a time." / "Yes, you can add a fifth zone — about 1.5 m³/h to spare." / "About 25 minutes per cycle, two cycles a week, in July."
   - **The calculation**, short.
   - **The assumptions**, short.
   - **The caveat**: what would change the answer (a stuck flow control, a partially clogged filter, hotter-than-average week, a kinked lateral).
   - **No image needed by default.** Capacity answers are numerical; only surface an image if the user asks to see something specific (the pump nameplate, the controller's zone-time screen).

7. **Offer the follow-up.** "Want me to look at whether adding a flow sensor would be worth it for your setup?" — pivots to `upgrades.md`.

## What you do not do
- Don't invent precipitation rates, ET values, or pressure losses. Either pull from the PDF or label the answer as a coarse estimate.
- Don't recommend running multiple zones at once on this system. The design assumes sequential; changing that means revisiting pump sizing, flow-sensor strategy, and the master-valve decision — that's an upgrade conversation, not a capacity answer.
- Don't drift into diagnosis. "My zone 3 looks weak so probably my pump is undersized" → switch to `irrigation-troubleshoot`. Weakness isn't a capacity question; it's a symptom.
