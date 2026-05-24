# Capacity and hydraulics

Limits questions: "how many zones at once / can I add a fifth / what's my flow budget / how long to run zone 3 / is my pump big enough?" These need real numbers — from `setup.yaml` (pump rating, per-zone flow, pipe sizes) and the `media/` PDFs (precipitation rates, head pressure). Don't invent them.

Read `setup.yaml` end to end; capacity touches most of it, including `system_design_choices`.

Common shapes:
- **How many zones at once?** One. Settings run zones sequentially and the no-flow-sensor / no-master-valve design assumes it. Confirm each zone's `flow_rating_m3h` sits under the pump's 3.8 m³/h.
- **Flow budget per zone?** Pump 3.8 m³/h (≈63 L/min) minus a ~10–15% margin as the ceiling; compare each zone's listed flow and state headroom.
- **Add a fifth zone?** The controller has spare stations (HD-16); the real limit is pump headroom and the 32 mm main line. State both checks.
- **Run time for zone X?** A precipitation question, not a flow one: nozzle precip rate (I-20 / MP Rotator / PRS40 PDFs) + soil/root assumption + Wijchen ET → minutes. Label it an estimate to refine from observed runoff.
- **Pump big enough?** Zone peak flow vs 3.8 m³/h, and required head (~2.8 bar at the PRS40 heads + elevation + pipe friction) vs the pump's 4.8 bar. State the margins.

Show the arithmetic in 2–4 lines (input → input → result) and name your assumptions — the per-zone flows in `setup.yaml` are the homeowner's own notes, not measurements. Don't recommend running multiple zones at once on this build (that's an upgrade conversation), and route "zone 3 looks weak" to `irrigation-troubleshoot` — weakness is a symptom, not a capacity answer.
