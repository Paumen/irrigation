# Capacity and hydraulics

Limits questions: "how many zones at once / can I add a fifth / what's my flow budget / how long to run zone 3 / is my pump big enough?" These need real numbers — read `graph.yaml` end to end for the physical model, and `context.yaml` for the `system_design_choices` (capacity touches most of both).

## Work the numbers from the model

There's no solver tool — derive flows and pressures by hand from `graph.yaml`'s topology and `catalog.yaml`'s manufacturer charts, and show the steps. The solve chain: pump curve (`catalog.yaml` `pump_curves`) → elevation lift (`h_m` per node) → hose friction (Hazen-Williams over each segment's `length_m`, `inner_diameter_mm`, `hazen_williams_c`) → per-head pressure → per-head flow (I-20 rotors track pressure via `nozzle_i20`; MP Rotators and PRS40 sprays are 2.76 bar regulated via `nozzle_mp`). Report each zone's flow, each head's flow and pressure, the pump operating point, and a **weakest-link** read: the safe pressure window and the tightest flow margin, naming the binding component.

What-if questions re-run the same arithmetic with one input changed:
- **"flow if I swap a nozzle?"** → swap the head's `nozzle` and re-read its chart flow at the solved pressure.
- **"flow at a different pressure?"** → pin every head at the target pressure and read flows off the charts (skip the pump solve).
- **"what if the pump/water table changed?"** → swap the `pump_curves` entry or the well `water_level_m` and re-solve the operating point.

Common shapes:

- **Add a fifth zone?** The controller has spare stations (HD-16); the real limit is pump headroom and the 32 mm main hose. State both.
- **Run time for zone X?** A precipitation question, not a flow one: nozzle precip rate (I-20 / MP Rotator / PRS40 PDFs) + soil/root assumption + Wijchen ET → minutes. Label it an estimate to refine from observed runoff.
- **Pump big enough?** Zone peak flow vs 3.8 m³/h, and required head (~2.8 bar at the PRS40 heads + elevation + hose friction) vs the pump's 4.8 bar. State the margins.

Show the arithmetic in 2–4 lines (input → input → result) and name your assumptions — the zone flows are *calculated* from `graph.yaml`'s topology and `catalog.yaml`'s manufacturer charts, not measurements, and the loss coefficients and water-table elevation are estimates you can adjust. Don't recommend running multiple zones at once on this build (that's an upgrade conversation), and route "zone 3 looks weak" to `playbooks/troubleshoot.md` — weakness is a symptom, not a capacity answer.
