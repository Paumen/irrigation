"""Scenario regression for the fault simulator (tools/simulate.py).

Plain-assert harness (the repo pattern; not pytest): each check accumulates a
failure, then we print a summary and exit non-zero if any failed. The scenarios
prove the four pieces -- electrical reachability, the valve pilot loop,
cross-zone hydraulic coupling, and grading -- and that the no-fault solve agrees
with the existing hydraulics engine.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from hydraulics import report as hydro_report
from simulate import simulate

failures: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    if not cond:
        failures.append(f"{name}: {detail}")


def zone(rep, zid):
    return next(z for z in rep["zones"] if z["id"] == zid)


def grades(rep, zid):
    return [h["grade"] for h in zone(rep, zid)["heads"]]


def all_dead(rep, zid):
    g = grades(rep, zid)
    return bool(g) and all(x == "dead" for x in g)


def all_full(rep, zid):
    g = grades(rep, zid)
    return bool(g) and all(x == "full" for x in g)


# ---------------------------------------------------------------------------
# Cross-validation: a no-fault single-zone solve must match hydraulics.py
# ---------------------------------------------------------------------------
for zid in (1, 2, 3, 4):
    sim = simulate([zid])
    hyd = hydro_report(zone=zid)
    sim_total = sim["pump"]["flow_m3h"]
    hyd_total = next(z["flow_m3h"] for z in hyd["zones"] if z["id"] == zid)
    check(f"B-xval zone {zid} total flow ~ hydraulics",
          abs(sim_total - hyd_total) < 0.05,
          f"sim {sim_total} vs hydraulics {hyd_total}")
    check(f"B-xval zone {zid} all heads full", all_full(sim, zid), grades(sim, zid))
    check(f"B-xval zone {zid} converged", sim["summary"]["converged"], "")

base5 = simulate([], settings={"Z5.valve.handle": "open"}, pump_on=True)
check("B Z5 stream full (manual handle open)", all_full(base5, 5), grades(base5, 5))
check("B Z5 pump running, no leaks", base5["pump"]["running"] and not base5["leaks"], "")


# ---------------------------------------------------------------------------
# Electrical (Piece 2)
# ---------------------------------------------------------------------------
e1 = simulate([1, 2, 3, 4], {"cond.common": "broken"})
check("E1 cond.common -> all four coils dead",
      not any(e1["electrical"]["coils"].values()), e1["electrical"]["coils"])
check("E1 all four auto zones dead",
      all(all_dead(e1, z) for z in (1, 2, 3, 4)), "")
check("E1 reason cites open return",
      "common" in e1["electrical"]["coil_reasons"][1], e1["electrical"]["coil_reasons"][1])
check("E1 pump still runs (any zone commanded)", e1["electrical"]["pump_running"], "")

e1b = simulate([1, 2, 3, 4], {"cond.common": "broken"},
               settings={"Z5.valve.handle": "open"})
check("E1b manual Z5 unaffected by cond.common", all_full(e1b, 5), grades(e1b, 5))

e2 = simulate([2], {"relay.coil": "broken"})
check("E2 relay.coil broken -> pump off", not e2["electrical"]["pump_running"], "")
check("E2 everything dead incl. would-be Z2", all_dead(e2, 2), grades(e2, 2))

e3 = simulate([2], {"pump.capacitor": "broken"})
check("E3 capacitor broken -> pump off", not e3["electrical"]["pump_running"], "")

e4 = simulate([3])
check("E4 cmd Z3 -> only coil 3 energised",
      e4["electrical"]["coils"] == {1: False, 2: False, 3: True, 4: False},
      e4["electrical"]["coils"])
check("E4 coil1 reason 'not commanded'",
      e4["electrical"]["coil_reasons"][1] == "not commanded",
      e4["electrical"]["coil_reasons"][1])

# pump is an independent controller output: it can run with every valve shut
e5 = simulate([], pump_on=True)
check("E5 pump_on with no zones -> pump runs", e5["electrical"]["pump_running"], "")
check("E5 all valves shut", all(e5["valves"][f"Z{z}"]["state"] == "shut"
                                for z in (1, 2, 3, 4, 5)), e5["valves"])
check("E5 dead-head, no leaks/flow", not e5["leaks"]
      and e5["pump"]["flow_m3h"] < 0.001, (e5["leaks"], e5["pump"]["flow_m3h"]))
check("E5 headline names the dead-head", "dead-head" in e5["summary"]["headline"],
      e5["summary"]["headline"])
e6 = simulate([3], pump_on=False)
check("E6 pump forced off while Z3 called -> Z3 dead", all_dead(e6, 3),
      grades(e6, 3))

# wetted set: derived reachability, not a separate computation
w = set(simulate([], pump_on=True)["wetted"])         # dead-head
check("W dead-head wets the main + manifold",
      {"mhose", "mani.inlet"} <= w, "")
check("W dead-head wets the valve pilot internals (chamber/metering_port)",
      {"Z1.valve.chamber", "Z1.valve.metering_port", "Z1.valve.seat"} <= w, "")
check("W dead-head leaves downstream of the shut seat dry",
      not ({"Z1.valve.outlet", "Z1.head1.nozzle", "Z1.valve.solenoid_exhaust"} & w),
      "")
w3 = set(simulate([3])["wetted"])                      # Z3 energised
check("W energising a zone wets its heads + opens the pilot exhaust",
      {"Z3.head1.nozzle", "Z3.valve.solenoid_exhaust"} <= w3, "")
check("W an un-commanded zone stays dry downstream",
      "Z1.head1.nozzle" not in w3, "")


# ---------------------------------------------------------------------------
# Operational controls (settings, NOT faults)
# ---------------------------------------------------------------------------
o1 = simulate([], settings={"Z1.valve.bleed_screw": "open"}, pump_on=True)
check("O1 bleed screw opened -> valve opens with no power",
      o1["valves"]["Z1"]["state"] == "open" and not o1["electrical"]["coils"][1],
      o1["valves"]["Z1"])
check("O1 Z1 actually waters", zone(o1, 1)["flow_m3h"] > 0.5, zone(o1, 1)["flow_m3h"])

o2 = simulate([], settings={"Z2.valve.coil": "bleed"}, pump_on=True)
check("O2 solenoid twisted open -> valve opens with no power",
      o2["valves"]["Z2"]["state"] == "open" and not o2["electrical"]["coils"][2], "")
check("O2 twist wets the pilot exhaust",
      "Z2.valve.solenoid_exhaust" in set(o2["wetted"]), "")

o3 = simulate([3], settings={"Z3.valve.flow_control": "shut"})
check("O3 flow-control screwed shut -> zone off though commanded+energised",
      o3["valves"]["Z3"]["state"] == "shut" and o3["electrical"]["coils"][3],
      o3["valves"]["Z3"])
check("O3 Z3 dead", all_dead(o3, 3), grades(o3, 3))

o4 = simulate([2], settings={"Z2.head1.flow_control": "shut"})
zh = {h["loc"]: h for h in zone(o4, 2)["heads"]}
check("O4 one rotor closed by hand -> that head off, the other keeps running",
      zh["Z2.head1"]["grade"] == "dead" and zh["Z2.head2"]["grade"] == "full",
      {k: v["grade"] for k, v in zh.items()})
check("O4 closed-head reason says manual", "manual" in zh["Z2.head1"]["reason"],
      zh["Z2.head1"]["reason"])

o5 = simulate([], settings={"Z5.valve.handle": "open"}, pump_on=True)
check("O5 Z5 runs from its handle, is flagged manual",
      zone(o5, 5)["commanded"] and zone(o5, 5)["manual"], "")
check("O5 Z5 not in commanded (controller) list",
      o5["summary"]["commanded_zones"] == [] and o5["summary"]["running_zones"] == [5],
      o5["summary"])

# invalid setting -> ValueError (validated like conditions)
try:
    simulate([], settings={"Z1.valve.seat": "open"})
    check("O6 invalid setting rejected", False, "expected ValueError")
except ValueError:
    check("O6 invalid setting rejected", True)


# ---------------------------------------------------------------------------
# Valve pilot loop (Piece 1)
# ---------------------------------------------------------------------------
v1 = simulate([1], {"Z1.valve.coil": "broken"})
check("V1 coil broken -> valve shut", v1["valves"]["Z1"]["state"] == "shut", "")
check("V1 Z1 dead", all_dead(v1, 1), grades(v1, 1))

v2 = simulate([2], {"Z1.valve.diaphragm": "broken"})
check("V2 diaphragm broken -> Z1 open uncommanded",
      v2["valves"]["Z1"]["state"] == "open" and not zone(v2, 1)["commanded"], "")
check("V2 Z1 actually flowing while off", zone(v2, 1)["flow_m3h"] > 0.5,
      zone(v2, 1)["flow_m3h"])
check("V2 headline flags running-while-off", "while off" in v2["summary"]["headline"],
      v2["summary"]["headline"])

v3 = simulate([1], {"Z3.valve.seat": "broken"})
check("V3 seat broken (uncommanded) -> weeping",
      v3["valves"]["Z3"]["state"] == "weeping", v3["valves"]["Z3"]["state"])
check("V3 weep shows as a leak", any("Z3" in l["loc"] for l in v3["leaks"]), v3["leaks"])
check("V3 Z1 (commanded) still full", all_full(v3, 1), grades(v3, 1))

v4 = simulate([2], {"Z2.valve.metering_port": "clogged"})
check("V4 metering_port clogged -> won't shut off (open)",
      v4["valves"]["Z2"]["state"] == "open", v4["valves"]["Z2"]["reason"])

v5 = simulate([], {"Z4.valve.bleed_screw": "broken"},
              settings={"Z5.valve.handle": "open"}, pump_on=True)
check("V5 bleed_screw broken -> Z4 open while de-energised",
      v5["valves"]["Z4"]["state"] == "open"
      and not v5["electrical"]["coils"][4], "")
check("V5 Z4 wastes water while only Z5 running",
      zone(v5, 4)["flow_m3h"] > 0.3, zone(v5, 4)["flow_m3h"])

v6 = simulate([1], {"Z1.valve.plunger": "broken"})
check("V6 plunger broken -> energised but stuck shut",
      v6["valves"]["Z1"]["state"] == "shut" and v6["electrical"]["coils"][1], "")
check("V6 Z1 dead", all_dead(v6, 1), grades(v6, 1))


# ---------------------------------------------------------------------------
# Hydraulic faults + cross-zone coupling (Piece 3) -- symptom zone != fault zone
# ---------------------------------------------------------------------------
h1 = simulate([1, 2], {"Z1.hose1": "broken"})
check("H1 hose break listed as leak", any("hose1" in l["loc"] for l in h1["leaks"]), h1["leaks"])
check("H1 leak is large", h1["leaks"] and h1["leaks"][0]["flow_m3h"] > 1.5, h1["leaks"])
check("H1 cross-zone: commanded Z2 dragged below healthy",
      any(g in ("weak", "won't-pop", "dead") for g in grades(h1, 2)), grades(h1, 2))

h2 = simulate([2], {"mhose": "broken"})
check("H2 main hose break -> Z2 dead", all_dead(h2, 2), grades(h2, 2))
check("H2 leak at mhose", any("mhose" in l["loc"] for l in h2["leaks"]), h2["leaks"])

h3 = simulate([2], {"Z2.head1.nozzle": "clogged"})
g3 = grades(h3, 2)
check("H3 clogged nozzle: that head weak/dead, isolated",
      g3.count("full") == 1 and any(x in ("weak", "dead") for x in g3), g3)

h4 = simulate([4], {"Z4.head1.regulator": "broken"})
zh = zone(h4, 4)["heads"]
mp3 = next(h for h in zh if h["loc"] == "Z4.head1")
mp3_base = simulate([4])
mp3_full = next(h for h in zone(mp3_base, 4)["heads"] if h["loc"] == "Z4.head1")
check("H4 regulator broken -> MP head over-flows (unregulated)",
      mp3["flow_m3h"] > mp3_full["flow_m3h"] + 0.02,
      f"{mp3['flow_m3h']} vs regulated {mp3_full['flow_m3h']}")

h5 = simulate([3], {"Z3.hose2": "clogged"})
check("H5 clogged branch hose still converges", h5["summary"]["converged"], "")

h6 = simulate([2], {"mani.body": "broken"})
check("H6 manifold body broken -> leak at manifold",
      any("mani" in l["loc"] for l in h6["leaks"]), h6["leaks"])

h7 = simulate([1], {"Z1.head2.inlet_thread": "broken"})
check("H7 snapped head thread: that head dead (severed) AND leaks",
      next(h["grade"] for h in zone(h7, 1)["heads"] if h["loc"] == "Z1.head2") == "dead"
      and any("head2.inlet_thread" in l["loc"] for l in h7["leaks"]),
      (grades(h7, 1), h7["leaks"]))
check("H7 leak starves its zone-mates", any(g != "full" for g in grades(h7, 1)), grades(h7, 1))


# ---------------------------------------------------------------------------
# Grading boundaries + convergence
# ---------------------------------------------------------------------------
g1 = simulate([1, 2, 3, 4])           # 4 zones overload the 3.8 m3/h pump
check("G overload converges", g1["summary"]["converged"], "")
check("G overload drags heads down (weak/won't-pop somewhere)",
      any(x in ("weak", "won't-pop", "dead")
          for z in (1, 2, 3, 4) for x in grades(g1, z)), "")

# every scenario above must have converged
for nm, rep in [("baselineZ4", simulate([4])),
                ("bigleak", simulate([1, 2, 3], {"mhose": "broken"}))]:
    check(f"C {nm} converged", rep["summary"]["converged"], "")


if failures:
    print(f"FAIL ({len(failures)})")
    for f in failures:
        print("  -", f)
    sys.exit(1)
print("simulate: all checks passed")
