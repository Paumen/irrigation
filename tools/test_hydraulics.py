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

if failures:
    print(f"FAIL ({len(failures)})")
    for f in failures:
        print("  -", f)
    sys.exit(1)
print("hydraulics: all checks passed")
