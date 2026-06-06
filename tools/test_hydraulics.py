from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from hydraulics import (MP_FLOW_M3H, _pressure_uniformity, build_graph,
                        free_discharge_m3h, hose_inner_d_m, i20_flow_m3h,
                        load_system, mp_flow_m3h, report, subtree_flows)

failures: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    if not cond:
        failures.append(f"{name}: {detail}")


q, in_range = i20_flow_m3h("2.5", 3.0)
check("i20 #2.5 @3.0bar", abs(q - 0.54) < 1e-9 and in_range, f"got {q}")
q, in_range = i20_flow_m3h("5.0", 4.5)
check("i20 #5.0 @4.5bar", abs(q - 1.41) < 1e-9, f"got {q}")
q, _ = i20_flow_m3h("4.0", 1.0)
check("i20 below-range flagged", not _, "expected in_range False")

q, reg = mp_flow_m3h("MP3000", 270, 3.6)  # >3.5 bar regulation floor
check("mp MP3000@270 regulated", abs(q - MP_FLOW_M3H["MP3000"][270]) < 1e-6 and reg, f"got {q}")
q, reg = mp_flow_m3h("MP3000", 270, 2.0)  # <3.5 bar floor
check("mp under-regulated flag", not reg and q < MP_FLOW_M3H["MP3000"][270], f"got {q}, reg={reg}")
q, _ = mp_flow_m3h("MP2000", 180, 3.0)
check("mp arc interpolation present", q > 0, f"got {q}")

check("hose.16 bore is 10 mm", abs(hose_inner_d_m("hose.16") - 0.010) < 1e-9, str(hose_inner_d_m("hose.16")))
check("hose.25 bore is 19.6 mm", abs(hose_inner_d_m("hose.25") - 0.0196) < 1e-9, str(hose_inner_d_m("hose.25")))
check("hose.32 bore is 26 mm", abs(hose_inner_d_m("hose.32") - 0.026) < 1e-9, str(hose_inner_d_m("hose.32")))

base = report()
flows = {z["id"]: z["flow_m3h"] for z in base["zones"]}
check("zones are Z1..Z5 (Z6 capped, excluded)", set(flows) == {1, 2, 3, 4, 5}, str(set(flows)))
check("baseline zone 4 all-MP", abs(flows[4] - 0.968) < 0.01, f"got {flows[4]}")
for zid in (1, 2, 3):
    check(f"baseline zone {zid} plausible", 1.4 < flows[zid] < 2.1, f"got {flows[zid]}")

wl = base["weakest_links"]
check("pressure window", wl["pressure"]["safe_window_bar"] == [3.5, 4.6],
      str(wl["pressure"]["safe_window_bar"]))
check("no baseline pressure violations", wl["pressure"]["violations"] == [],
      str(wl["pressure"]["violations"]))
check("no baseline flow violations", wl["flow"]["violations"] == [],
      str(wl["flow"]["violations"]))
check("tightest flow link is a swing joint",
      "swing_joints" in wl["flow"]["tightest"]["component"],
      str(wl["flow"]["tightest"]))

z5 = report(zone=5)["zones"][0]
check("Z5 has one stream head", len(z5["heads"]) == 1 and z5["heads"][0]["kind"] == "stream",
      str(z5["heads"]))
q5 = z5["flow_m3h"]
check("Z5 free-discharge flow plausible (10 mm bore limited)", 0.5 < q5 < 1.5, f"got {q5}")
check("Z5 flow consistent with free discharge at its terminal pressure",
      abs(free_discharge_m3h(hose_inner_d_m("hose.16"), z5["heads"][0]["pressure_bar"]) - q5) < 0.03,
      f"q5={q5}, p={z5['heads'][0]['pressure_bar']}")
check("Z5 stays under pump flow rating (pump-limited)", q5 < 3.8, f"got {q5}")
q5_lesslift = report(zone=5, adjustments={"well_water_level_m_asl": 10.0})["zones"][0]["flow_m3h"]
check("Z5 less lift raises flow", q5_lesslift > q5, f"{q5} -> {q5_lesslift}")
q5_weak = report(zone=5, adjustments={"pump_model": "JET 62 M"})["zones"][0]["flow_m3h"]
check("Z5 weaker pump lowers flow", q5_weak < q5, f"{q5} -> {q5_weak}")

nodes = build_graph(load_system())
z1 = report(zone=1)["zones"][0]
lq = {h["loc"]: h["flow_m3h"] for h in z1["heads"]}
sub = subtree_flows(nodes, lq)
check("Z1 first branch carries all 3 heads' flow",
      abs(sub["Z1.hose.25.01"] - sum(lq.values())) < 1e-9,
      f"{sub['Z1.hose.25.01']} vs {sum(lq.values())}")
check("a single-head branch carries less than the shared trunk",
      sub["Z1.hose.25.04"] < sub["Z1.hose.25.01"],
      f"{sub['Z1.hose.25.04']} vs {sub['Z1.hose.25.01']}")

swapped = report({"heads": [
    {"zone": 2, "match": {"nozzle": "2.5 blue"}, "set": {"nozzle": "4.0 blue"}}]}, zone=2)
z2_swapped = swapped["zones"][0]["flow_m3h"]
check("nozzle swap increases zone 2 flow", z2_swapped > flows[2], f"{flows[2]} -> {z2_swapped}")
check("swap recorded", swapped["zones"][0]["adjustments_applied"], "no note recorded")

loc_adj = report({"heads": [
    {"zone": 1, "loc": "Z1.nozzle.rotor.01", "set": {"nozzle": "6.0 blue"}}]}, zone=1)
check("node-id loc adjustment recorded", loc_adj["zones"][0]["adjustments_applied"], "no note")
new_rotor = next(h for h in loc_adj["zones"][0]["heads"] if h["loc"] == "Z1.nozzle.rotor.01")
old_rotor = next(h for h in report(zone=1)["zones"][0]["heads"] if h["loc"] == "Z1.nozzle.rotor.01")
check("bigger nozzle via loc raises that head's flow",
      new_rotor["flow_m3h"] > old_rotor["flow_m3h"], f"{old_rotor['flow_m3h']} -> {new_rotor['flow_m3h']}")

pinned = report({"global_operating_pressure_bar": 3.5}, zone=2)
check("pinned mode flagged", pinned["assumptions"]["mode"] == "pinned-pressure",
      pinned["assumptions"]["mode"])
check("pinned head pressure honoured",
      all(h["pressure_bar"] == 3.5 for h in pinned["zones"][0]["heads"]),
      str(pinned["zones"][0]["heads"]))

weak_pump = report({"pump_model": "JET 62 M"}, zone=2)
check("smaller pump lowers head pressure",
      weak_pump["zones"][0]["head_pressure_bar"]["max"]
      < base["zones"][1]["head_pressure_bar"]["max"],
      f"{weak_pump['zones'][0]['head_pressure_bar']['max']} vs "
      f"{base['zones'][1]['head_pressure_bar']['max']}")

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
             - lb["branch_friction"] - lb["swing_joint"])
    check(f"head {h['loc']} pressure reconciles from breakdown",
          abs(recon - h["pressure_bar"]) < 0.02, f"{recon:.3f} vs {h['pressure_bar']}")
z3_heads = sorted(z3["heads"], key=lambda h: h["branch_m"])
check("nearer head holds higher pressure than the more distant one",
      z3_heads[0]["pressure_bar"] >= z3_heads[-1]["pressure_bar"],
      f"{z3_heads[0]['pressure_bar']} vs {z3_heads[-1]['pressure_bar']}")
pin_np = report({"global_operating_pressure_bar": 3.5}, zone=2)["zones"][0]
check("pinned mode has no node profile", pin_np["node_pressures_bar"] is None,
      str(pin_np["node_pressures_bar"]))

con = report(concurrent_zones=[2, 3])
check("concurrent mode flagged", con["assumptions"]["mode"] == "concurrent",
      con["assumptions"]["mode"])
cc = con["concurrent"]
check("concurrent reports both zones", cc["zones_running"] == [2, 3], str(cc["zones_running"]))
check("concurrent pump head below single-zone",
      cc["pump"]["head_bar"] < base["zones"][2]["pump"]["head_bar"],
      f"{cc['pump']['head_bar']} vs {base['zones'][2]['pump']['head_bar']}")
check("concurrent flow below naive sum of solo flows",
      cc["combined_flow_m3h"] < flows[2] + flows[3],
      f"{cc['combined_flow_m3h']} vs {flows[2] + flows[3]}")
con_max_p = max(h["pressure_bar"] for z in con["zones"] for h in z["heads"])
check("concurrent head pressures below solo zone 3 min",
      con_max_p < base["zones"][2]["head_pressure_bar"]["min"],
      f"{con_max_p} vs {base['zones'][2]['head_pressure_bar']['min']}")
check("concurrent per-zone pump is shared (None)", con["zones"][0]["pump"] is None,
      str(con["zones"][0]["pump"]))
pump_item = next(it for it in con["weakest_links"]["flow"]["items"]
                 if it["component"] == "pump")
check("concurrent pump load is combined flow",
      abs(pump_item["load_m3h"] - cc["combined_flow_m3h"]) < 1e-9
      and pump_item["scope"] == "all running zones", str(pump_item))
c25 = report(concurrent_zones=[2, 5])
check("concurrent with Z5 runs", 5 in c25["concurrent"]["zones_running"]
      and c25["concurrent"]["combined_flow_m3h"] > 0, str(c25["concurrent"]["zones_running"]))

z2 = base["zones"][1]
check("zone reports pressure spread percent", isinstance(z2["pressure_spread_percent"], float),
      str(z2.get("pressure_spread_percent")))
exp_spread = round((z2["head_pressure_bar"]["max"] - z2["head_pressure_bar"]["min"])
                   / z2["head_pressure_bar"]["max"] * 100, 1)
check("pressure spread matches head min/max", abs(z2["pressure_spread_percent"] - exp_spread) < 0.05,
      f"{z2['pressure_spread_percent']} vs {exp_spread}")
check("balanced baseline raises no spread flag",
      not any("pressure spread" in f for f in z2["flags"]), str(z2["flags"]))
_, wide = _pressure_uniformity(9, [{"kind": "I-20", "pressure_bar": 3.0},
                                    {"kind": "I-20", "pressure_bar": 2.3}])  # 23% spread
check("wide I-20 spread flags", any("pressure spread" in f for f in wide), str(wide))
_, narrow = _pressure_uniformity(9, [{"kind": "I-20", "pressure_bar": 3.0},
                                     {"kind": "I-20", "pressure_bar": 2.8}])  # 6.7% spread
check("narrow I-20 spread does not flag", narrow == [], str(narrow))
_, mp = _pressure_uniformity(9, [{"kind": "MP3000", "pressure_bar": 3.5},
                                 {"kind": "MP2000", "pressure_bar": 2.5}])
check("regulated MP spread does not flag", mp == [], str(mp))

vel = base["weakest_links"]["velocity"]
check("velocity limit reported", vel["limit_ms"] == 1.5, str(vel["limit_ms"]))
segs = {it["segment"]: it for it in vel["items"]}
check("velocity has main + branches", {"main_line", "zone_branches"} <= set(segs), str(segs))
check("baseline velocities computed positive",
      segs["main_line"]["velocity_ms"] > 0 and segs["zone_branches"]["velocity_ms"] > 0, str(segs))
check("fastest is the highest-velocity segment",
      vel["fastest"]["velocity_ms"] == max(it["velocity_ms"] for it in vel["items"]),
      str(vel["fastest"]))
check("velocity stays out of hard health violations",
      all("velocity" not in v for v in base["health"]["violations"]),
      str(base["health"]["violations"]))
con_main = next(it for it in con["weakest_links"]["velocity"]["items"]
                if it["segment"] == "main_line")
check("concurrent raises main-line velocity",
      con_main["velocity_ms"] > segs["main_line"]["velocity_ms"],
      f"{con_main['velocity_ms']} vs {segs['main_line']['velocity_ms']}")

h = base["health"]
check("health is first key of report", list(base)[0] == "health", str(list(base)[:1]))
check("baseline health is not a hard violation", h["status"] in ("ok", "warning"),
      f"{h['status']}: {h['headline']}")
check("health checks cover all categories",
      {"pressure", "flow", "velocity", "uniformity"} == set(h["checks"]), str(list(h["checks"])))
check("each check carries gauge band data",
      all({"label", "status", "unit", "kind", "value", "min", "max"} <= set(c)
          for c in h["checks"].values()), str(h["checks"]))
check("velocity gauge band is 0..limit",
      h["checks"]["velocity"]["min"] == 0.0 and h["checks"]["velocity"]["max"] == 1.5,
      str(h["checks"]["velocity"]))
check("health has a zone line per zone", len(h["zones"]) == len(base["zones"]),
      f"{len(h['zones'])} vs {len(base['zones'])}")
check("health capacity reports pump load percent",
      h["capacity"] is not None and 0 < h["capacity"]["pump_load_pct"] < 100,
      str(h["capacity"]))
check("baseline health has no hard violations", h["violations"] == [], str(h["violations"]))
over = report(concurrent_zones=[1, 2, 3, 4])["health"]
check("overload health is violation", over["status"] == "violation",
      f"{over['status']}: {over['headline']}")
check("overload health lists violations", len(over["violations"]) >= 1, str(over["violations"]))

try:
    report(zone=6)
    check("zone 6 rejected", False, "expected ValueError")
except ValueError:
    check("zone 6 rejected", True)

if failures:
    print(f"FAIL ({len(failures)})")
    for f in failures:
        print("  -", f)
    sys.exit(1)
print("hydraulics: all checks passed")
