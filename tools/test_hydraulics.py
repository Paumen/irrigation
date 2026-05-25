"""Sanity checks for the hydraulic calculator. Run: python tools/test_hydraulics.py"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from hydraulics import GPM_TO_M3H, i20_flow_m3h, mp_flow_m3h, report

failures: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    if not cond:
        failures.append(f"{name}: {detail}")


# --- manufacturer table lookups ---
q, in_range = i20_flow_m3h("2.5", 3.0)
check("i20 #2.5 @3.0bar", abs(q - 0.54) < 1e-9 and in_range, f"got {q}")
q, in_range = i20_flow_m3h("5.0", 4.5)
check("i20 #5.0 @4.5bar", abs(q - 1.41) < 1e-9, f"got {q}")
q, _ = i20_flow_m3h("4.0", 1.0)  # below range -> sqrt extrapolation, flagged
check("i20 below-range flagged", not _, "expected in_range False")

q, reg = mp_flow_m3h("MP3000", 270, 3.2)
check("mp MP3000@270 regulated", abs(q - round(2.73 * GPM_TO_M3H, 6)) < 1e-6 and reg, f"got {q}")
q, reg = mp_flow_m3h("MP3000", 270, 2.0)  # below regulation threshold
check("mp under-regulated flag", not reg and q < 2.73 * GPM_TO_M3H, f"got {q}, reg={reg}")
q, _ = mp_flow_m3h("MP2000", 180, 3.0)
check("mp arc interpolation present", q > 0, f"got {q}")

# --- baseline full solve ---
base = report()
flows = {z["id"]: z["flow_m3h"] for z in base["zones"]}
check("baseline zone 4 all-MP", abs(flows[4] - 0.968) < 0.01, f"got {flows[4]}")
for zid in (1, 2, 3):
    check(f"baseline zone {zid} plausible", 1.4 < flows[zid] < 2.1, f"got {flows[zid]}")

wl = base["weakest_links"]
check("pressure window", wl["pressure"]["safe_window_bar"] == [2.9, 4.8],
      str(wl["pressure"]["safe_window_bar"]))
check("no baseline pressure violations", wl["pressure"]["violations"] == [],
      str(wl["pressure"]["violations"]))
check("no baseline flow violations", wl["flow"]["violations"] == [],
      str(wl["flow"]["violations"]))
check("tightest flow link is a swing joint",
      "swing_joints" in wl["flow"]["tightest"]["component"],
      str(wl["flow"]["tightest"]))

# --- what-if: nozzle swap raises flow ---
swapped = report({"heads": [
    {"zone": 2, "match": {"nozzle": "2.5 blue"}, "set": {"nozzle": "4.0 blue"}}]}, zone=2)
z2_swapped = swapped["zones"][0]["flow_m3h"]
check("nozzle swap increases zone 2 flow", z2_swapped > flows[2],
      f"{flows[2]} -> {z2_swapped}")
check("swap recorded", swapped["zones"][0]["adjustments_applied"], "no note recorded")

# --- what-if: pinned pressure mode ---
pinned = report({"global_operating_pressure_bar": 3.5}, zone=2)
check("pinned mode flagged", pinned["assumptions"]["mode"] == "pinned-pressure",
      pinned["assumptions"]["mode"])
check("pinned head pressure honoured",
      all(h["pressure_bar"] == 3.5 for h in pinned["zones"][0]["heads"]),
      str(pinned["zones"][0]["heads"]))

# --- what-if: swapping to a smaller pump should not raise pressure ---
weak_pump = report({"pump_model": "JET 82 M"}, zone=2)
check("smaller pump lowers head pressure",
      weak_pump["zones"][0]["head_pressure_bar"]["max"]
      < base["zones"][1]["head_pressure_bar"]["max"],
      f"{weak_pump['zones'][0]['head_pressure_bar']['max']} vs "
      f"{base['zones'][1]['head_pressure_bar']['max']}")

# --- node pressure profile (#1) ---
z3 = report(zone=3)["zones"][0]
np3 = z3["node_pressures_bar"]
check("node profile descends pump>manifold>after_valve",
      np3 is not None and np3["pump_discharge"] > np3["manifold_inlet"] > np3["after_valve"],
      str(np3))
check("node profile pump matches pump.head_bar",
      abs(np3["pump_discharge"] - z3["pump"]["head_bar"]) < 1e-9, str(np3))
for h in z3["heads"]:
    lb = h["loss_breakdown_bar"]
    recon = (np3["after_valve"] - lb["elevation_rise"]
             - lb["lateral_friction"] - lb["swing_joint"])
    check(f"head {h['loc']} pressure reconciles from breakdown",
          abs(recon - h["pressure_bar"]) < 0.01, f"{recon:.3f} vs {h['pressure_bar']}")
# pinned mode exposes no node profile (no pump/friction solve happened)
pin_np = report({"global_operating_pressure_bar": 3.5}, zone=2)["zones"][0]
check("pinned mode has no node profile", pin_np["node_pressures_bar"] is None,
      str(pin_np["node_pressures_bar"]))

# --- concurrent zones (#2) ---
con = report(concurrent_zones=[2, 3])
check("concurrent mode flagged", con["assumptions"]["mode"] == "concurrent",
      con["assumptions"]["mode"])
cc = con["concurrent"]
check("concurrent reports both zones", cc["zones_running"] == [2, 3], str(cc["zones_running"]))
# the pump rides higher flow -> lower head than either zone alone
check("concurrent pump head below single-zone",
      cc["pump"]["head_bar"] < base["zones"][2]["pump"]["head_bar"],
      f"{cc['pump']['head_bar']} vs {base['zones'][2]['pump']['head_bar']}")
# unregulated rotors deliver less than the naive sum of the two solo zone flows
check("concurrent flow below naive sum of solo flows",
      cc["combined_flow_m3h"] < flows[2] + flows[3],
      f"{cc['combined_flow_m3h']} vs {flows[2] + flows[3]}")
# every head drops below its solo pressure
con_max_p = max(h["pressure_bar"] for z in con["zones"] for h in z["heads"])
check("concurrent head pressures below solo zone 3 min",
      con_max_p < base["zones"][2]["head_pressure_bar"]["min"],
      f"{con_max_p} vs {base['zones'][2]['head_pressure_bar']['min']}")
# weakest-link pump/manifold load is the combined flow, scoped accordingly
pump_item = next(it for it in con["weakest_links"]["flow"]["items"]
                 if it["component"] == "pump")
check("concurrent pump load is combined flow",
      abs(pump_item["load_m3h"] - cc["combined_flow_m3h"]) < 1e-9
      and pump_item["scope"] == "all running zones", str(pump_item))

if failures:
    print(f"FAIL ({len(failures)})")
    for f in failures:
        print("  -", f)
    sys.exit(1)
print("hydraulics: all checks passed")
