// Headless verification of the physics core. Loads the real root YAMLs, builds the
// model, solves each case (faults -> electrical -> hydraulic), and asserts convergence,
// mass balance, catalog fidelity, dead-branch handling, the Z1 manual hand-watering
// branch, electrical actuation (pump power + zone energisation incl. shared-return
// breaks), and fault effects (clogs, leaks, weak pump, stuck valves). Exits non-zero on
// any failure.
//
// graph.yaml's auto zones are Z2/Z3/Z4/Z5; Z2's heads (rotor + two sprays) are the test's
// reference zone. Z1 is the manual stream branch.
//
// Run: node test/harness.mjs   (from sim/, via `npm test`)

import { loadGraph, loadCatalog } from "./yaml-node.mjs";
import { cases } from "./cases.mjs";
import { buildModel } from "../src/model.js";
import { createHydraulics } from "../src/epanet-runner.js";
import { solveSteady } from "../src/solver.js";
import { solveElectrical } from "../src/electrical.js";
import { listFaults, compileFaults } from "../src/faults.js";
import { outletDemandAt, interp } from "../src/outlets.js";
import { M_PER_BAR } from "../src/config.js";

const epOf = (id) => id.replace(/\./g, "_");

// Reference zone (Z2) heads and the auto-valve set.
const SPRAY_A = "Z2_emitter.spray_1"; // MP3000 / 270
const ROTOR = "Z2_emitter.rotor"; // 4.0 blue / 170
const SPRAY_B = "Z2_emitter.spray_2"; // MP2000 / 180
const Z2_HEADS = [SPRAY_A, ROTOR, SPRAY_B];
const Z2_VALVE = "Z2_valve.auto";
const OTHER_VALVES = ["Z3_valve.auto", "Z4_valve.auto", "Z5_valve.auto"];
const ALL_VALVES = [Z2_VALVE, ...OTHER_VALVES];

let failures = 0;
function check(cond, msg) {
  if (cond) {
    console.log(`  ok: ${msg}`);
  } else {
    console.error(`  FAIL: ${msg}`);
    failures++;
  }
}

function reportTable(model, result) {
  const heads = [...model.flowNodes.values()].filter((n) => n.role === "outlet");
  console.log("  outlet                  reachable  inlet(bar)  demand(m3/h)");
  for (const o of heads) {
    const p = result.pressureBar[epOf(o.id)];
    const q = result.demands.get(o.id);
    const r = result.reachable.has(o.id);
    console.log(
      `   ${o.id.padEnd(22)} ${String(r).padEnd(9)} ${(Number.isFinite(p) ? p.toFixed(3) : "—").padStart(9)}  ${q.toFixed(4).padStart(10)}`,
    );
  }
  console.log(
    `  pumpFlow=${result.pumpFlow.toFixed(4)} m3/h  outSum=${result.outSum.toFixed(4)}  ` +
      `imbalance=${result.massImbalance.toExponential(2)}  iters=${result.iters}  converged=${result.converged}`,
  );
}

const rawGraph = loadGraph();
const model = buildModel(rawGraph, loadCatalog());
const hyd = await createHydraulics();
console.log(`epanet-js engine version: ${hyd.version}\n`);

const autoZoneHeads = [...model.flowNodes.values()]
  .filter((n) => n.role === "outlet" && /^Z[2345]_emitter/.test(n.id))
  .map((n) => n.id);

// Suction-side nodes (well -> … -> pump inlet) sit below atmospheric under suction lift, so
// negative gauge pressure there is physical, not a solver fault. Collect them by walking up
// the tree from the pump.
const suctionSide = new Set();
{
  const pumpNode = [...model.flowNodes.values()].find((n) => n.role === "pump");
  const parentOf = new Map();
  for (const n of model.flowNodes.values()) for (const t of n.to) parentOf.set(t, n.id);
  let cur = parentOf.get(pumpNode.id);
  while (cur) {
    suctionSide.add(cur);
    cur = parentOf.get(cur);
  }
}

let z1Result = null; // stashed by the z1 (Z2) case for cross-case monotonicity checks

for (const c of cases) {
  console.log(`Case: ${c.name}`);
  const fx = c.faults ? compileFaults(model, c.faults) : undefined;
  const blocked = new Set([...(c.blocked || []), ...(fx ? fx.elecBlocked : [])]);
  const elec = solveElectrical(model, c.commands, blocked);
  const r = solveSteady(model, c.state, elec, hyd, fx);
  reportTable(model, r);

  // shared invariants
  check(r.converged, "converged");
  check(r.massImbalance < 1e-3, `mass balance < 1e-3 (got ${r.massImbalance.toExponential(2)})`);
  let badNode = null;
  for (const n of model.flowNodes.values()) {
    if (n.role === "pipe" || n.role === "pump" || n.role.startsWith("valve")) continue;
    if (!r.reachable.has(n.id)) continue;
    const p = r.pressureBar[epOf(n.id)];
    // pressure-side nodes must be finite and non-negative; suction-side nodes may sit below
    // atmospheric under lift, but must still be finite.
    if (!Number.isFinite(p) || (p < -1e-6 && !suctionSide.has(n.id))) badNode = `${n.id}=${p}`;
  }
  check(!badNode, `no NaN/negative pressure on filled nodes${badNode ? ` (${badNode})` : ""}`);

  if (c.kind === "idle") {
    check(elec.pumpPowered === false, "pump not powered (controller off)");
    check(Math.abs(r.pumpFlow) < 1e-6, "pump flow ~ 0 when off");
    let allZero = true;
    for (const q of r.demands.values()) if (Math.abs(q) > 1e-9) allZero = false;
    check(allZero, "all outlet demands 0");
    check(!r.reachable.has(ROTOR), "downstream of stopped pump is not filled");
  } else if (c.kind === "z1") {
    check(elec.pumpPowered === true, "pump powered (mv commanded through healthy wiring)");
    check(r.valveOpen[Z2_VALVE] === true, "Z2 valve open");
    for (const id of OTHER_VALVES) {
      check(r.valveOpen[id] === false, `${id} stays closed (not commanded)`);
    }
    for (const id of Z2_HEADS) {
      check(r.demands.get(id) > 0, `${id} discharges (> 0)`);
    }
    for (const id of autoZoneHeads.filter((h) => /^Z[345]_emitter/.test(h))) {
      check(r.demands.get(id) === 0 && !r.reachable.has(id), `${id} dry (0, unfilled)`);
    }
    // catalog fidelity: at convergence each demand equals its law at the inlet pressure
    for (const o of model.flowNodes.values()) {
      if (o.role !== "outlet" || !r.reachable.has(o.id)) continue;
      const inlet = r.pressureBar[epOf(o.id)];
      const law = outletDemandAt(o, inlet, model.curves);
      const got = r.demands.get(o.id);
      check(Math.abs(got - law) < 1e-3, `${o.id} demand matches catalog law (${got.toFixed(4)} vs ${law.toFixed(4)})`);
    }
    // spray regulator: the MP3000/270 spray clamps at 2.76 bar
    const sprayInlet = r.pressureBar[epOf(SPRAY_A)];
    if (sprayInlet > 2.76) {
      const mp = model.curves.nozzleMp;
      const at276 = interp(mp.pressure_bar, mp.flow_m3h_by_arc.MP3000["270"], 2.76);
      check(
        Math.abs(r.demands.get(SPRAY_A) - at276) < 1e-3,
        `spray ${SPRAY_A} clamped at 2.76 bar (inlet ${sprayInlet.toFixed(2)} bar -> ${at276.toFixed(4)} m3/h)`,
      );
    }
    // pump operating point lands on the catalog curve
    const pump = r.topo.pumps[0];
    const pumpHead = r.headM[pump.n2] - r.headM[pump.n1];
    const expected = interp(model.curves.pump.flow_m3h, model.curves.pump.head_m, r.pumpFlow);
    check(
      Math.abs(pumpHead - expected) < 0.5,
      `pump operating point on curve (head ${pumpHead.toFixed(2)} m vs curve ${expected.toFixed(2)} m at ${r.pumpFlow.toFixed(3)} m3/h)`,
    );
    z1Result = r;
  } else if (c.kind === "allzones") {
    // R2: any combination of open valves must settle — the heaviest healthy state, where
    // one pump feeds all the heads and the manifold sags near the valves' lift threshold.
    check(elec.pumpPowered === true, "pump powered");
    check(!r.valvesFrozen, "settled without the anti-flap freeze engaging");
    for (const id of ALL_VALVES) {
      check(r.valveOpen[id] === true, `${id} open`);
      check(r.commandedNotOpening[id] === false, `${id} not flagged commandedNotOpening`);
    }
    for (const id of autoZoneHeads) {
      check(r.demands.get(id) > 0, `${id} discharges (> 0)`);
    }
    // monotonicity: with all zones drawing, every Z2 head sees less pressure than alone
    for (const id of Z2_HEADS) {
      const alone = z1Result.pressureBar[epOf(id)];
      const now = r.pressureBar[epOf(id)];
      check(now < alone, `${id} pressure drops vs Z2-only (${now.toFixed(3)} < ${alone.toFixed(3)} bar)`);
    }
    check(r.pumpFlow > z1Result.pumpFlow, "total pump flow exceeds the single-zone flow");
  } else if (c.kind === "notopening") {
    // an energised valve with no supply pressure cannot lift: commanded-but-not-opening
    check(elec.zoneEnergised[2] === true, "zone 2 energised (wiring healthy)");
    check(elec.pumpPowered === false, "pump not powered (mv off)");
    check(r.valveOpen[Z2_VALVE] === false, "Z2 valve stays shut without supply pressure");
    check(r.commandedNotOpening[Z2_VALVE] === true, "Z2 reported commanded-but-not-opening");
    check(Math.abs(r.pumpFlow) < 1e-6, "no flow anywhere");
    let allZero = true;
    for (const q of r.demands.values()) if (Math.abs(q) > 1e-9) allZero = false;
    check(allZero, "all outlet demands 0");
  } else if (c.kind === "z5") {
    // M3: the manual hand-watering branch — valve.manual TCV + stream-nozzle orifice.
    const z1 = model.flowNodes.get("Z1_emitter.stream");
    check(r.reachable.has("Z1_emitter.stream"), "Z1 stream reachable (manual handle open)");
    const q5 = r.demands.get("Z1_emitter.stream");
    check(q5 > 0, `Z1 stream discharges (> 0), got ${q5.toFixed(4)} m3/h`);
    // an open hose end on 30 m of narrow 16 mm line streams at a substantial but
    // friction-limited rate, discharging at near-atmospheric pressure
    check(q5 > 0.5, `Z1 hand nozzle streams a substantial flow, got ${q5.toFixed(4)} m3/h`);
    const inlet5 = r.pressureBar[epOf("Z1_emitter.stream")];
    check(inlet5 >= -1e-6 && inlet5 < 0.5, `Z1 stream discharges near atmospheric (${inlet5.toFixed(3)} bar)`);
    // the EPANET emitter flow must equal the orifice law evaluated at the solved pressure
    const law5 = outletDemandAt(z1, inlet5, model.curves);
    check(Math.abs(q5 - law5) < 1e-3, `Z1 stream emitter matches orifice law (${q5.toFixed(4)} vs ${law5.toFixed(4)})`);
    // no electrical zone commanded -> every auto valve stays shut, every auto head dry
    for (const id of ALL_VALVES) {
      check(r.valveOpen[id] === false, `${id} stays closed (no zone energised)`);
    }
    for (const id of autoZoneHeads) {
      check(r.demands.get(id) === 0 && !r.reachable.has(id), `${id} dry`);
    }
  } else if (c.kind === "electrical") {
    // M4: actuation routed through the wiring; broken wires drop the right zones.
    check(elec.pumpPowered === c.expect.pump, `pump powered == ${c.expect.pump}`);
    for (const z of c.expect.zonesOpen) {
      check(elec.zoneEnergised[z] === true, `zone ${z} energised`);
      check(r.valveOpen[`Z${z}_valve.auto`] === true, `Z${z} valve open`);
    }
    for (const z of c.expect.zonesClosed) {
      check(elec.zoneEnergised[z] === false, `zone ${z} de-energised (broken wiring)`);
      check(r.valveOpen[`Z${z}_valve.auto`] === false, `Z${z} valve stays closed`);
    }
  } else if (c.kind === "flostop") {
    // M6: a rotor flo-stop is mechanically shut — the head stays on a filled branch
    // (pressure displays) but discharges nothing, and the zone re-balances.
    check(r.valveOpen[Z2_VALVE] === true, "Z2 valve open");
    check(r.reachable.has(ROTOR), "flo-stopped rotor still filled (pressure displays)");
    check(r.demands.get(ROTOR) === 0, "flo-stopped rotor discharges nothing");
    const pStopped = r.pressureBar[epOf(ROTOR)];
    const pAlone = z1Result.pressureBar[epOf(ROTOR)];
    check(
      pStopped > pAlone,
      `pressure at the stopped rotor rises vs plain Z2 (${pStopped.toFixed(3)} > ${pAlone.toFixed(3)} bar)`,
    );
    for (const id of [SPRAY_A, SPRAY_B]) {
      check(
        r.demands.get(id) >= z1Result.demands.get(id) - 1e-6,
        `${id} discharge not reduced by the stopped rotor`,
      );
    }
    check(r.pumpFlow < z1Result.pumpFlow, "total pump flow drops with the rotor stopped");
  } else if (c.kind === "throttle") {
    // M6: the flow-control screw throttles but does not shut — the valve still lifts,
    // every head still discharges, at lower pressure/flow than factory-open.
    check(r.valveOpen[Z2_VALVE] === true, "throttled valve still opens");
    for (const id of Z2_HEADS) {
      check(r.demands.get(id) > 0, `${id} still discharges`);
      const pNow = r.pressureBar[epOf(id)];
      const pAlone = z1Result.pressureBar[epOf(id)];
      check(pNow < pAlone, `${id} pressure drops vs factory-open (${pNow.toFixed(3)} < ${pAlone.toFixed(3)} bar)`);
    }
    check(
      r.demands.get(ROTOR) < z1Result.demands.get(ROTOR),
      "the unregulated rotor's discharge drops",
    );
    check(r.pumpFlow < z1Result.pumpFlow, "total pump flow drops");
    // catalog fidelity: at 40% opening the valve's headloss is the catalog loss scaled by 1/0.4²
    const v = r.topo.valves.find((x) => x.flowId === Z2_VALVE);
    const q = r.flow[epOf(Z2_VALVE)];
    const lossM = r.headM[v.n1] - r.headM[v.n2];
    const vl = model.curves.valveLoss;
    const want = (interp(vl.flow_m3h, vl.loss_bar, q) * M_PER_BAR) / (0.4 * 0.4);
    check(
      Math.abs(lossM - want) < 0.3,
      `valve headloss matches the scaled catalog law (${lossM.toFixed(2)} m vs ${want.toFixed(2)} m at ${q.toFixed(3)} m3/h)`,
    );
  } else if (c.kind === "clogfull") {
    // M8: a fully clogged hose seals the branch — heads dry, no NaN, still converges.
    check(r.valveOpen[Z2_VALVE] === true, "Z2 valve still opens (clog is downstream)");
    for (const id of Z2_HEADS) {
      check(r.demands.get(id) === 0 && !r.reachable.has(id), `${id} dry beyond the full clog`);
    }
    check(Math.abs(r.pumpFlow) < 0.02, "pump dead-heads (no path for water)");
  } else if (c.kind === "clogpartial") {
    // M8: a partial clog restricts: everything still discharges, at reduced rates.
    for (const id of Z2_HEADS) {
      check(r.demands.get(id) > 0, `${id} still discharges past the partial clog`);
    }
    check(
      r.demands.get(ROTOR) < z1Result.demands.get(ROTOR),
      "the unregulated rotor's discharge drops",
    );
    const pNow = r.pressureBar[epOf(ROTOR)];
    const pAlone = z1Result.pressureBar[epOf(ROTOR)];
    check(pNow < pAlone, `head pressure drops past the clog (${pNow.toFixed(3)} < ${pAlone.toFixed(3)} bar)`);
    check(r.pumpFlow < z1Result.pumpFlow, "total pump flow drops");
  } else if (c.kind === "seatclog") {
    // M8: a partial seat clog must restrict PROGRESSIVELY (the loss curve scales by 1/a²)
    // — not sit inert until 100% (EPANET ignores GPV minor losses).
    check(r.valveOpen[Z2_VALVE] === true, "valve still lifts past a partial seat clog");
    for (const id of Z2_HEADS) {
      check(r.demands.get(id) > 0, `${id} still discharges`);
    }
    check(
      r.demands.get(ROTOR) < z1Result.demands.get(ROTOR),
      "the unregulated rotor's discharge drops",
    );
    check(r.pumpFlow < z1Result.pumpFlow, "total pump flow drops");
    // the valve's headloss is the catalog loss scaled by 1/(1-0.6)² at the solved flow
    const v = r.topo.valves.find((x) => x.flowId === Z2_VALVE);
    const q = r.flow[epOf(Z2_VALVE)];
    const lossM = r.headM[v.n1] - r.headM[v.n2];
    const vl = model.curves.valveLoss;
    const want = (interp(vl.flow_m3h, vl.loss_bar, q) * M_PER_BAR) / (0.4 * 0.4);
    check(
      Math.abs(lossM - want) < 0.3,
      `valve headloss matches the scaled catalog law (${lossM.toFixed(2)} m vs ${want.toFixed(2)} m at ${q.toFixed(3)} m3/h)`,
    );
  } else if (c.kind === "seatfull") {
    // M8: a fully packed seat passes nothing — shown commanded-but-not-opening, not
    // green-open over a dead branch.
    check(r.valveOpen[Z2_VALVE] === false, "fully packed valve does not show open");
    check(r.commandedNotOpening[Z2_VALVE] === true, "reported commanded-but-not-opening");
    for (const id of Z2_HEADS) {
      check(r.demands.get(id) === 0 && !r.reachable.has(id), `${id} dry`);
    }
    check(Math.abs(r.pumpFlow) < 0.02, "pump dead-heads");
  } else if (c.kind === "leak") {
    // M8: a burst hose escapes water at its downstream junction; the heads keep
    // discharging at lower pressure and the leak is part of the mass balance.
    const leakNode = "Z2_fitting.coupling_3";
    const leakQ = r.leakFlows.get(leakNode);
    check(leakQ > 0.3, `leak escapes at ${leakNode} (${(leakQ ?? NaN).toFixed(4)} m3/h)`);
    for (const id of Z2_HEADS) {
      check(r.demands.get(id) > 0, `${id} still discharges`);
    }
    const pNow = r.pressureBar[epOf(SPRAY_A)];
    const pAlone = z1Result.pressureBar[epOf(SPRAY_A)];
    check(pNow < pAlone, `pressure at the head past the leak drops (${pNow.toFixed(3)} < ${pAlone.toFixed(3)} bar)`);
    check(r.pumpFlow > z1Result.pumpFlow, "pump delivers more in total (the leak is extra discharge)");
    const headSum = Z2_HEADS.reduce((a, id) => a + r.demands.get(id), 0);
    check(
      Math.abs(r.outSum - (headSum + leakQ)) < 1e-6,
      "total outflow = heads + leak",
    );
  } else if (c.kind === "bleedstuck") {
    // M8 special: a bleed screw stuck open runs the zone without any controller command.
    check(elec.zoneEnergised[2] === false, "zone 2 not energised (controller never asked)");
    check(r.valveOpen[Z2_VALVE] === true, "Z2 valve lifts off the stuck-open bleed");
    check(r.commandedNotOpening[Z2_VALVE] === false, "not flagged commanded-but-not-opening");
    for (const id of Z2_HEADS) {
      check(r.demands.get(id) > 0, `${id} waters`);
    }
    for (const id of OTHER_VALVES) {
      check(r.valveOpen[id] === false, `${id} stays closed`);
    }
  } else if (c.kind === "weakpump") {
    // M8: a half-clogged impeller scales the head curve down — everything still runs, weaker.
    check(r.valveOpen[Z2_VALVE] === true, "Z2 valve still opens");
    for (const id of Z2_HEADS) {
      check(r.demands.get(id) > 0, `${id} still discharges`);
    }
    check(r.pumpFlow < z1Result.pumpFlow, "weak pump moves less water");
    check(
      r.demands.get(ROTOR) < z1Result.demands.get(ROTOR),
      "the unregulated rotor's discharge drops",
    );
  } else if (c.kind === "pumpdead") {
    // M8: a broken motor (one fault key, shared by the hydraulic and circuit sides) kills
    // the pump even though the wiring would deliver power.
    check(elec.pumpPowered === true, "relay/wiring would power the pump");
    check(Math.abs(r.pumpFlow) < 1e-6, "broken motor: no flow");
    check(!r.reachable.has(ROTOR), "nothing downstream is wetted");
    check(r.commandedNotOpening[Z2_VALVE] === true, "Z2 reported commanded-but-not-opening");
  } else if (c.kind === "noclamp") {
    // M8 special: with the regulator broken the spray follows the raw nozzle table at its
    // full inlet pressure instead of the 2.76 bar clamp.
    const o = model.flowNodes.get(SPRAY_A);
    const inlet = r.pressureBar[epOf(SPRAY_A)];
    const law = outletDemandAt(o, inlet, model.curves, { noClamp: true });
    const got = r.demands.get(SPRAY_A);
    check(Math.abs(got - law) < 1e-3, `unregulated spray matches the raw table law (${got.toFixed(4)} vs ${law.toFixed(4)})`);
    if (inlet > 2.76) {
      check(
        got > z1Result.demands.get(SPRAY_A),
        `above 2.76 bar it discharges more than the regulated head (${got.toFixed(4)} > ${z1Result.demands.get(SPRAY_A).toFixed(4)})`,
      );
    }
  }
  console.log("");
}

// Electrical-only spot checks (no hydraulic solve): the loop semantics in isolation.
console.log("Case: electrical-only continuity checks");
{
  const all = { mv: true, zones: { 2: true, 3: true, 4: true, 5: true } };
  const healthy = solveElectrical(model, all);
  check(healthy.pumpPowered && [2, 3, 4, 5].every((z) => healthy.zoneEnergised[z]),
    "healthy wiring: pump + all four zones energised");

  // breaking the pump's mains feed (S1 230 V) de-powers the pump but not the low-voltage side
  const noGrid = solveElectrical(model, { mv: true, zones: { 2: true } }, new Set(["S1_wiring.230v_1"]));
  check(noGrid.pumpPowered === false, "broken pump mains de-powers the pump");
  check(noGrid.zoneEnergised[2] === true, "...but the low-voltage zone circuit is unaffected");

  // breaking a controller supply lead kills the controller (and everything it drives)
  const noController = solveElectrical(model, all, new Set(["H1_wiring.24v_1"]));
  check(noController.controllerPowered === false, "broken controller supply de-powers the controller");
  check(noController.pumpPowered === false && [2, 3, 4, 5].every((z) => !noController.zoneEnergised[z]),
    "...so nothing actuates");

  // breaking one zone's signal lead drops only that zone
  const noZ3 = solveElectrical(model, all, new Set(["P1_wiring.24v_2"]));
  check(noZ3.zoneEnergised[3] === false && [2, 4, 5].every((z) => noZ3.zoneEnergised[z]),
    "broken P1_wiring.24v_2 drops only zone 3 (its own signal lead)");

  // breaking the last common-return link drops every zone (shared return)
  const noReturn = solveElectrical(model, all, new Set(["V1_wiring.24v_4"]));
  check([2, 3, 4, 5].every((z) => !noReturn.zoneEnergised[z]) && noReturn.pumpPowered,
    "broken shared common return drops all zones, pump unaffected");

  // Per-wire energization: cables on a closed current path light; an off zone's signal stays dark.
  const ew = healthy.energisedWires;
  for (const w of ["S1_wiring.230v_1", "S1_wiring.230v_2", "H1_wiring.230v_1", "H1_wiring.24v_1",
    "H1_wiring.24v_2", "S1_wiring.24v_1", "S1_wiring.24v_2", "P1_wiring.24v_1", "V1_wiring.24v_4"]) {
    check(ew.has(w), `healthy all-on: ${w} carries current`);
  }

  const z2only = solveElectrical(model, { zones: { 2: true } });
  check(z2only.energisedWires.has("P1_wiring.24v_1") && z2only.energisedWires.has("V1_wiring.24v_4"),
    "zone 2 alone lights its signal lead and the shared return");
  check(!z2only.energisedWires.has("P1_wiring.24v_2") && !z2only.energisedWires.has("S1_wiring.230v_1"),
    "zone 2 alone leaves other zones' signals and the (uncommanded) pump mains dark");

  // Plug toggles are commands, not faults.
  const noAdapter = solveElectrical(model, { ...all, adapterPower: false });
  check(noAdapter.controllerPowered === false && noAdapter.pumpPowered === false &&
    noAdapter.energisedWires.size === 0,
    "controller unplugged: controller dead, nothing energised");
  const noGridPlug = solveElectrical(model, { ...all, gridPower: false });
  check(noGridPlug.pumpPowered === false && noGridPlug.relayCoil === true &&
    [2, 3, 4, 5].every((z) => noGridPlug.zoneEnergised[z]),
    "pump unplugged: pump dead, low-voltage side unaffected");
  check(noGridPlug.energisedWires.has("P1_wiring.24v_1") && !noGridPlug.energisedWires.has("S1_wiring.230v_2"),
    "...zone wires lit, pump loop dark");
}
console.log("");

// M8: the fault model's pure half — the fault set enumerates every fail: entry in
// graph.yaml, and the grouped (role x failtype) dispatch emits the right effects.
console.log("Case: M8 fault list + compiled effects");
{
  const faults = listFaults(model);
  const keys = new Set(faults.map((f) => f.key));
  check(keys.size === faults.length, `fault keys unique (${faults.length} faults)`);
  check(faults.length > 300, `every fail: entry enumerated (got ${faults.length})`);
  for (const k of [
    "Z2_hose.ldpe25_1:clogged",
    "Z2_valve.auto.diaphragm:broken",
    "W1_pump.jet.body.impeller:clogged",
    "Z3_emitter.rotor_2.body.nozzle:misconfigured",
    "Z1_emitter.stream:clogged",
    "H1_control.controller.port_7:broken",
    "V1_wiring.splice_2:broken",
    "Z6_fitting.cap.body:broken",
  ]) {
    check(keys.has(k), `fault list includes ${k}`);
  }
  check(
    faults.filter((f) => f.key === "W1_pump.jet.motor:broken").length === 1,
    "the pump motor is a single fault (it lives once, in the pump component)",
  );
  check(
    faults.every((f) => f.severity === (f.type === "clogged")),
    "exactly the clogs carry a 0..1 severity",
  );

  // inert/threshold metadata: the UI greys these without duplicating rule knowledge
  const byMetaKey = new Map(faults.map((f) => [f.key, f]));
  check(byMetaKey.get("Z2_emitter.rotor.body.gear:broken").inert === true, "cosmetic rotor gear fault reported inert");
  check(byMetaKey.get("Z2_valve.auto.bonnet.flow_control:broken").inert === true,
    "broken flow-control stem reported inert at steady state");
  check(byMetaKey.get("Z2_valve.auto.diaphragm.metering_port:clogged").threshold === 0.5,
    "pilot-fill clog carries its acting threshold");
  check(byMetaKey.get("Z2_valve.auto.solenoid.plunger:clogged").threshold === 0.5,
    "pilot-drain clog carries its acting threshold");
  check(!byMetaKey.get("Z2_hose.ldpe25_1:clogged").inert && byMetaKey.get("Z2_hose.ldpe25_1:clogged").threshold == null,
    "ordinary clog carries no inert/threshold flags");
  check(byMetaKey.get("Z2_valve.auto.bonnet.bleed_screw:misconfigured").inert == null,
    "acting SPECIAL fault not marked inert");
  check(byMetaKey.get("H1_control.controller.port_7:broken").inert == null, "circuit faults always act");

  const full = compileFaults(model, { "Z2_hose.ldpe25_1:clogged": 1 });
  check(full.closedLinks.has("Z2_hose.ldpe25_1") && !full.linkK.has("Z2_hose.ldpe25_1"), "full clog seals the link");
  const part = compileFaults(model, { "Z2_hose.ldpe25_1:clogged": 0.5 });
  check(!part.closedLinks.has("Z2_hose.ldpe25_1") && part.linkK.get("Z2_hose.ldpe25_1") > 0, "partial clog adds minor loss");
  const burst = compileFaults(model, { "Z2_hose.ldpe25_2:broken": true });
  check(burst.leaks.get("Z2_fitting.coupling_3") > 0, "burst hose leaks at its downstream junction");
  const seatHalf = compileFaults(model, { "Z2_valve.auto.body.seat:clogged": 0.5 });
  check(
    Math.abs(seatHalf.valveLossScale.get("Z2_valve.auto") - 4) < 1e-9 && !seatHalf.linkK.has("Z2_valve.auto"),
    "partial seat clog scales the valve's loss curve by 1/a² (GPV minor losses are ignored by EPANET)",
  );
  const seatFull = compileFaults(model, { "Z2_valve.auto.body.seat:clogged": 1 });
  check(
    seatFull.closedLinks.has("Z2_valve.auto") && seatFull.valveDisabled.has("Z2_valve.auto"),
    "fully packed seat seals the valve and reports it commanded-but-not-opening",
  );
  check(compileFaults(model, { "W1_hose.suction:broken": true }).pumpDisabled, "suction-side break loses prime");
  check(
    compileFaults(model, { "Z3_valve.auto.solenoid.coil:broken": true }).elecBlocked.has("Z3_valve.auto/solenoid/coil"),
    "broken solenoid coil becomes an electrical cut",
  );
  check(
    compileFaults(model, { "Z2_valve.auto.bonnet.flow_control:misconfigured": true }).valveDisabled.has("Z2_valve.auto"),
    "seated flow-control screw pins the valve shut",
  );
  check(
    compileFaults(model, { "Z3_valve.auto.diaphragm:broken": true }).valveForcedOpen.has("Z3_valve.auto"),
    "torn diaphragm sticks the valve open",
  );
  check(
    compileFaults(model, { "Z2_valve.auto.solenoid.plunger:broken": true }).valveDisabled.has("Z2_valve.auto"),
    "broken solenoid plunger: valve cannot lift",
  );
  check(compileFaults(model, { "W1_pump.jet.body.priming_cap:misconfigured": true }).pumpDisabled, "loose priming cap loses prime");
  // pump sub-assemblies: venturi/thermal protector are nested fault nodes
  check(compileFaults(model, { "W1_pump.jet.body.venturi:clogged": 0.5 }).pumpHeadScale < 1,
    "a clogged venturi weakens the pump head curve");
  check(compileFaults(model, { "W1_pump.jet.motor.thermal_protector:broken": true }).pumpDisabled,
    "a tripped thermal protector stops the pump");
  // 20 L pressure tank: only a split shell is visible to the steady-state solve (a leak);
  // a burst bladder / wrong pre-charge are cycling faults, inert here.
  check(compileFaults(model, { "W1_tank.diaphragm.shell:broken": true }).leaks.get("W1_tank.diaphragm") > 0,
    "a split tank shell weeps at the tank");
  const tankBladder = compileFaults(model, { "W1_tank.diaphragm.bladder:broken": true });
  check(tankBladder.leaks.size === 0 && !tankBladder.pumpDisabled,
    "a burst tank bladder is inert at steady state");
  check(byMetaKey.get("W1_tank.diaphragm.bladder:broken").inert === true, "tank bladder fault reported inert");
  check(byMetaKey.get("W1_tank.diaphragm.shell:broken").inert == null, "tank shell leak is an acting fault");
  check(
    compileFaults(model, { "Z2_emitter.rotor.body.nozzle:misconfigured": true }).outletMods.get("Z2_emitter.rotor").nozzle === "8.0",
    "rotor wrong-nozzle swaps to another catalog size",
  );
  check(
    compileFaults(model, { "Z2_emitter.spray_1.body.nozzle:misconfigured": true }).outletMods.get("Z2_emitter.spray_1").nozzle === "MP2000",
    "spray wrong-nozzle swaps to a family that has the same arc",
  );
  check(
    !!compileFaults(model, { "Z4_emitter.spray_2.body.flush_plug:misconfigured": true }).outletMods.get("Z4_emitter.spray_2").asOrifice,
    "flush plug left in: the head dumps as an open orifice",
  );
  const circ = compileFaults(model, { "H1_control.controller.port_7:broken": true });
  check(circ.elecBlocked.has("H1_control.controller/port_7"), "circuit fault becomes a blocked port");
  const e2 = solveElectrical(model, { mv: true, zones: { 2: true, 3: true } }, circ.elecBlocked);
  check(
    e2.zoneEnergised[2] === false && e2.zoneEnergised[3] === true,
    "...which drops exactly that zone",
  );
  let threw = false;
  try {
    compileFaults(model, { "no.such.part:broken": true });
  } catch {
    threw = true;
  }
  check(threw, "unknown fault key throws (a typo is a bug, not a fault)");
  const off = compileFaults(model, { "Z2_hose.ldpe25_1:clogged": 0, "Z2_valve.auto.solenoid.coil:broken": false });
  check(
    off.closedLinks.size === 0 && off.linkK.size === 0 && off.leaks.size === 0 &&
      off.elecBlocked.size === 0 && !off.pumpDisabled,
    "falsy values (false, severity 0) are healthy",
  );
}
console.log("");

if (failures) {
  console.error(`\nHarness FAILED (${failures} assertion(s))`);
  process.exit(1);
}
console.log("Harness PASSED");
