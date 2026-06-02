# Capacity and hydraulics

Limits questions: "how many zones at once / can I add a fifth / what's my flow budget / how long to run zone 3 / is my pump big enough?" These need real numbers — read `setup.yaml` end to end (capacity touches most of it, including `system_design_choices`).

## Use the hydraulics tool for the numbers

Don't hand-derive flows or pressures — call the `irrigation_hydraulics` tool (MCP), or `python tools/hydraulics.py` for a JSON report. It runs a full solve (pump curve → elevation lift → pipe friction → per-head pressure → per-head flow; I-20 rotors track pressure, MP Rotators are 2.8 bar regulated) and returns each zone's flow, each head's flow and pressure, the pump operating point, and a **weakest-link** report (the safe pressure window and the tightest flow margin, with the binding component named).

What-if questions go straight to the tool's `adjustments`:
- **"flow if I swap a nozzle?"** → `{"heads":[{"zone":2,"match":{"nozzle":"2.5 blue"},"set":{"nozzle":"4.0 blue"}}]}`
- **"flow at a different pressure?"** → `{"global_operating_pressure_bar": 3.5}` (pins every head, skips the pump solve)
- **"what if the pump/water table changed?"** → `{"pump_model":"JET 112 M"}` / `{"well_water_level_m_asl": 9.0}`

Common shapes:
- **How many zones at once?** One. Settings run zones sequentially and the no-flow-sensor / no-master-valve design assumes it. Confirm each zone's computed flow (the tool's per-zone `flow_m3h` — zone flows aren't stored in `setup.yaml`, they're solved) sits under the pump's 3.8 m³/h.
- **Flow budget per zone?** Pump 3.8 m³/h (≈63 L/min) minus a ~10–15% margin as the ceiling; compare each zone's computed `flow_m3h` from the tool and state headroom.
- **Add a fifth zone?** The controller has spare stations (HD-16); the real limit is pump headroom and the 32 mm main hose. State both.
- **Run time for zone X?** A precipitation question, not a flow one: nozzle precip rate (I-20 / MP Rotator / PRS40 PDFs) + soil/root assumption + Wijchen ET → minutes. Label it an estimate to refine from observed runoff.
- **Pump big enough?** Zone peak flow vs 3.8 m³/h, and required head (~2.8 bar at the PRS40 heads + elevation + pipe friction) vs the pump's 4.8 bar. State the margins.

Show the arithmetic in 2–4 lines (input → input → result) and name your assumptions — the `setup.yaml` flows and the tool's output are both *calculated* from manufacturer charts, not measurements, and the tool's loss coefficients and water-table elevation are estimates you can adjust. Don't recommend running multiple zones at once on this build (that's an upgrade conversation), and route "zone 3 looks weak" to `playbooks/troubleshoot.md` — weakness is a symptom, not a capacity answer.
