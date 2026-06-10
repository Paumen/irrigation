// Headless verification of the physics core. Loads the real root YAMLs, builds the
// model, solves each case (faults -> electrical -> hydraulic), and asserts
// convergence, mass balance, catalog fidelity, dead-branch handling, the Z5 manual
// hand-watering branch, electrical actuation (pump power + zone energisation incl.
// shared-return breaks), and fault effects (clogs, leaks, weak pump, stuck valves).
// Exits non-zero on any failure.
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
  console.log("  outlet           reachable  inlet(bar)  demand(m3/h)");
  for (const o of heads) {
    const p = result.pressureBar[epOf(o.id)];
    const q = result.demands.get(o.id);
    const r = result.reachable.has(o.id);
    console.log(
      `   ${o.id.padEnd(14)} ${String(r).padEnd(9)} ${(Number.isFinite(p) ? p.toFixed(3) : "—").padStart(9)}  ${q.toFixed(4).padStart(10)}`,
    );
  }
  console.log(
    `  pumpFlow=${result.pumpFlow.toFixed(4)} m3/h  outSum=${result.outSum.toFixed(4)}  ` +
      `imbalance=${result.massImbalance.toExponential(2)}  iters=${result.iters}  converged=${result.converged}`,
  );
}

const rawGraph = loadGraph();
const model = buildModel(rawGraph, loadCatalog());
const circuit = rawGraph.circuit;
const hyd = await createHydraulics();
console.log(`epanet-js engine version: ${hyd.version}\n`);

const autoZoneHeads = [...model.flowNodes.values()]
  .filter((n) => n.role === "outlet" && /^Z[1234]\./.test(n.id))
  .map((n) => n.id);

let z1Result = null; // stashed by the z1 case for cross-case monotonicity checks

for (const c of cases) {
  console.log(`Case: ${c.name}`);
  const fx = c.faults ? compileFaults(model, c.faults) : undefined;
  const blocked = new Set([...(c.blocked || []), ...(fx ? fx.elecBlocked : [])]);
  const elec = solveElectrical(circuit, c.commands, blocked);
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
    if (!Number.isFinite(p) || p < -1e-6) badNode = `${n.id}=${p}`;
  }
  check(!badNode, `no NaN/negative pressure on filled nodes${badNode ? ` (${badNode})` : ""}`);

  if (c.kind === "idle") {
    check(elec.pumpPowered === false, "pump not powered (controller off)");
    check(Math.abs(r.pumpFlow) < 1e-6, "pump flow ~ 0 when off");
    let allZero = true;
    for (const q of r.demands.values()) if (Math.abs(q) > 1e-9) allZero = false;
    check(allZero, "all outlet demands 0");
    check(!r.reachable.has("Z1.head1"), "downstream of stopped pump is not filled");
  } else if (c.kind === "z1") {
    check(elec.pumpPowered === true, "pump powered (mv commanded through healthy wiring)");
    check(r.valveOpen["Z1.valve"] === true, "Z1 valve open");
    for (const id of ["Z2.valve", "Z3.valve", "Z4.valve"]) {
      check(r.valveOpen[id] === false, `${id} stays closed (not commanded)`);
    }
    for (const id of ["Z1.head1", "Z1.head2", "Z1.head3"]) {
      check(r.demands.get(id) > 0, `${id} discharges (> 0)`);
    }
    for (const id of autoZoneHeads.filter((h) => /^Z[234]\./.test(h))) {
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
    // spray regulator: Z1.head1 (MP3000/270) clamps at 2.76 bar
    const sprayInlet = r.pressureBar[epOf("Z1.head1")];
    if (sprayInlet > 2.76) {
      const mp = model.curves.nozzleMp;
      const at276 = interp(mp.pressure_bar, mp.flow_m3h_by_arc.MP3000["270"], 2.76);
      check(
        Math.abs(r.demands.get("Z1.head1") - at276) < 1e-3,
        `spray Z1.head1 clamped at 2.76 bar (inlet ${sprayInlet.toFixed(2)} bar -> ${at276.toFixed(4)} m3/h)`,
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
    // R2: any combination of open valves must settle — this is the heaviest healthy
    // state, where one pump feeds all ten heads and the manifold sags near the
    // valves' lift threshold.
    check(elec.pumpPowered === true, "pump powered");
    check(!r.valvesFrozen, "settled without the anti-flap freeze engaging");
    for (const id of ["Z1.valve", "Z2.valve", "Z3.valve", "Z4.valve"]) {
      check(r.valveOpen[id] === true, `${id} open`);
      check(r.commandedNotOpening[id] === false, `${id} not flagged commandedNotOpening`);
    }
    for (const id of autoZoneHeads) {
      check(r.demands.get(id) > 0, `${id} discharges (> 0)`);
    }
    // monotonicity: with all four zones drawing, every Z1 head sees less pressure
    // than when Z1 ran alone
    for (const id of ["Z1.head1", "Z1.head2", "Z1.head3"]) {
      const alone = z1Result.pressureBar[epOf(id)];
      const now = r.pressureBar[epOf(id)];
      check(now < alone, `${id} pressure drops vs Z1-only (${now.toFixed(3)} < ${alone.toFixed(3)} bar)`);
    }
    check(r.pumpFlow > z1Result.pumpFlow, "total pump flow exceeds the single-zone flow");
  } else if (c.kind === "notopening") {
    // an energised valve with no supply pressure cannot lift: commanded-but-not-opening
    check(elec.zoneEnergised[1] === true, "zone 1 energised (wiring healthy)");
    check(elec.pumpPowered === false, "pump not powered (mv off)");
    check(r.valveOpen["Z1.valve"] === false, "Z1 valve stays shut without supply pressure");
    check(r.commandedNotOpening["Z1.valve"] === true, "Z1 reported commanded-but-not-opening");
    check(Math.abs(r.pumpFlow) < 1e-6, "no flow anywhere");
    let allZero = true;
    for (const q of r.demands.values()) if (Math.abs(q) > 1e-9) allZero = false;
    check(allZero, "all outlet demands 0");
  } else if (c.kind === "z5") {
    // M3: the manual hand-watering branch — valve.manual TCV + nozzle.stream orifice.
    const z5 = model.flowNodes.get("Z5.nozzle");
    check(r.reachable.has("Z5.nozzle"), "Z5.nozzle reachable (manual handle open)");
    const q5 = r.demands.get("Z5.nozzle");
    check(q5 > 0, `Z5.nozzle discharges (> 0), got ${q5.toFixed(4)} m3/h`);
    // an open hose end on 30 m of narrow 10 mm line streams at a substantial but
    // friction-limited rate, discharging at near-atmospheric pressure
    check(q5 > 0.5, `Z5 hand nozzle streams a substantial flow, got ${q5.toFixed(4)} m3/h`);
    const inlet5 = r.pressureBar[epOf("Z5.nozzle")];
    check(inlet5 >= -1e-6 && inlet5 < 0.5, `Z5.nozzle discharges near atmospheric (${inlet5.toFixed(3)} bar)`);
    // the EPANET emitter flow must equal the orifice law evaluated at the solved pressure
    const law5 = outletDemandAt(z5, inlet5, model.curves);
    check(Math.abs(q5 - law5) < 1e-3, `Z5.nozzle emitter matches orifice law (${q5.toFixed(4)} vs ${law5.toFixed(4)})`);
    // no electrical zone commanded -> every auto valve stays shut, every auto head dry
    for (const id of ["Z1.valve", "Z2.valve", "Z3.valve", "Z4.valve"]) {
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
      check(r.valveOpen[`Z${z}.valve`] === true, `Z${z}.valve open`);
    }
    for (const z of c.expect.zonesClosed) {
      check(elec.zoneEnergised[z] === false, `zone ${z} de-energised (broken wiring)`);
      check(r.valveOpen[`Z${z}.valve`] === false, `Z${z}.valve stays closed`);
    }
  } else if (c.kind === "flostop") {
    // M6: a rotor flo-stop is mechanically shut — the head stays on a filled branch
    // (pressure displays) but discharges nothing, and the zone re-balances.
    check(r.valveOpen["Z1.valve"] === true, "Z1 valve open");
    check(r.reachable.has("Z1.head2"), "flo-stopped rotor still filled (pressure displays)");
    check(r.demands.get("Z1.head2") === 0, "flo-stopped rotor discharges nothing");
    const pStopped = r.pressureBar[epOf("Z1.head2")];
    const pAlone = z1Result.pressureBar[epOf("Z1.head2")];
    check(
      pStopped > pAlone,
      `pressure at the stopped rotor rises vs plain Z1 (${pStopped.toFixed(3)} > ${pAlone.toFixed(3)} bar)`,
    );
    for (const id of ["Z1.head1", "Z1.head3"]) {
      check(
        r.demands.get(id) >= z1Result.demands.get(id) - 1e-6,
        `${id} discharge not reduced by the stopped rotor`,
      );
    }
    check(r.pumpFlow < z1Result.pumpFlow, "total pump flow drops with the rotor stopped");
  } else if (c.kind === "throttle") {
    // M6: the flow-control screw throttles but does not shut — the valve still lifts,
    // every head still discharges, at lower pressure/flow than factory-open.
    check(r.valveOpen["Z1.valve"] === true, "throttled valve still opens");
    for (const id of ["Z1.head1", "Z1.head2", "Z1.head3"]) {
      check(r.demands.get(id) > 0, `${id} still discharges`);
      const pNow = r.pressureBar[epOf(id)];
      const pAlone = z1Result.pressureBar[epOf(id)];
      check(pNow < pAlone, `${id} pressure drops vs factory-open (${pNow.toFixed(3)} < ${pAlone.toFixed(3)} bar)`);
    }
    check(
      r.demands.get("Z1.head2") < z1Result.demands.get("Z1.head2"),
      "the unregulated rotor's discharge drops",
    );
    check(r.pumpFlow < z1Result.pumpFlow, "total pump flow drops");
    // catalog fidelity: at 40% opening the valve's headloss is the catalog loss
    // scaled by 1/0.4² at the solved flow
    const v = r.topo.valves.find((x) => x.flowId === "Z1.valve");
    const q = r.flow[epOf("Z1.valve")];
    const lossM = r.headM[v.n1] - r.headM[v.n2];
    const vl = model.curves.valveLoss;
    const want = (interp(vl.flow_m3h, vl.loss_bar, q) * M_PER_BAR) / (0.4 * 0.4);
    check(
      Math.abs(lossM - want) < 0.3,
      `valve headloss matches the scaled catalog law (${lossM.toFixed(2)} m vs ${want.toFixed(2)} m at ${q.toFixed(3)} m3/h)`,
    );
  } else if (c.kind === "clogfull") {
    // M8: a fully clogged hose seals the branch — heads dry, no NaN, still converges.
    check(r.valveOpen["Z1.valve"] === true, "Z1 valve still opens (clog is downstream)");
    for (const id of ["Z1.head1", "Z1.head2", "Z1.head3"]) {
      check(r.demands.get(id) === 0 && !r.reachable.has(id), `${id} dry beyond the full clog`);
    }
    check(Math.abs(r.pumpFlow) < 0.02, "pump dead-heads (no path for water)");
  } else if (c.kind === "clogpartial") {
    // M8: a partial clog restricts: everything still discharges, at reduced rates.
    for (const id of ["Z1.head1", "Z1.head2", "Z1.head3"]) {
      check(r.demands.get(id) > 0, `${id} still discharges past the partial clog`);
    }
    check(
      r.demands.get("Z1.head2") < z1Result.demands.get("Z1.head2"),
      "the unregulated rotor's discharge drops",
    );
    const pNow = r.pressureBar[epOf("Z1.head2")];
    const pAlone = z1Result.pressureBar[epOf("Z1.head2")];
    check(pNow < pAlone, `head pressure drops past the clog (${pNow.toFixed(3)} < ${pAlone.toFixed(3)} bar)`);
    check(r.pumpFlow < z1Result.pumpFlow, "total pump flow drops");
  } else if (c.kind === "seatclog") {
    // M8: a partial seat clog must restrict PROGRESSIVELY (the loss curve scales by
    // 1/a²) — not sit inert until 100% (EPANET ignores GPV minor losses).
    check(r.valveOpen["Z1.valve"] === true, "valve still lifts past a partial seat clog");
    for (const id of ["Z1.head1", "Z1.head2", "Z1.head3"]) {
      check(r.demands.get(id) > 0, `${id} still discharges`);
    }
    check(
      r.demands.get("Z1.head2") < z1Result.demands.get("Z1.head2"),
      "the unregulated rotor's discharge drops",
    );
    check(r.pumpFlow < z1Result.pumpFlow, "total pump flow drops");
    // the valve's headloss is the catalog loss scaled by 1/(1-0.6)² at the solved flow
    const v = r.topo.valves.find((x) => x.flowId === "Z1.valve");
    const q = r.flow[epOf("Z1.valve")];
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
    check(r.valveOpen["Z1.valve"] === false, "fully packed valve does not show open");
    check(r.commandedNotOpening["Z1.valve"] === true, "reported commanded-but-not-opening");
    for (const id of ["Z1.head1", "Z1.head2", "Z1.head3"]) {
      check(r.demands.get(id) === 0 && !r.reachable.has(id), `${id} dry`);
    }
    check(Math.abs(r.pumpFlow) < 0.02, "pump dead-heads");
  } else if (c.kind === "leak") {
    // M8: a burst hose escapes water at its downstream junction; the heads keep
    // discharging at lower pressure and the leak is part of the mass balance.
    const leakQ = r.leakFlows.get("Z1.joint3");
    check(leakQ > 0.3, `leak escapes at Z1.joint3 (${(leakQ ?? NaN).toFixed(4)} m3/h)`);
    for (const id of ["Z1.head1", "Z1.head2", "Z1.head3"]) {
      check(r.demands.get(id) > 0, `${id} still discharges`);
    }
    const pNow = r.pressureBar[epOf("Z1.head1")];
    const pAlone = z1Result.pressureBar[epOf("Z1.head1")];
    check(pNow < pAlone, `pressure at the head past the leak drops (${pNow.toFixed(3)} < ${pAlone.toFixed(3)} bar)`);
    check(r.pumpFlow > z1Result.pumpFlow, "pump delivers more in total (the leak is extra discharge)");
    const headSum = ["Z1.head1", "Z1.head2", "Z1.head3"].reduce((a, id) => a + r.demands.get(id), 0);
    check(
      Math.abs(r.outSum - (headSum + leakQ)) < 1e-6,
      "total outflow = heads + leak",
    );
  } else if (c.kind === "bleedstuck") {
    // M8 special: a bleed screw stuck open runs the zone without any controller command.
    check(elec.zoneEnergised[1] === false, "zone 1 not energised (controller never asked)");
    check(r.valveOpen["Z1.valve"] === true, "Z1 valve lifts off the stuck-open bleed");
    check(r.commandedNotOpening["Z1.valve"] === false, "not flagged commanded-but-not-opening");
    for (const id of ["Z1.head1", "Z1.head2", "Z1.head3"]) {
      check(r.demands.get(id) > 0, `${id} waters`);
    }
    for (const id of ["Z2.valve", "Z3.valve", "Z4.valve"]) {
      check(r.valveOpen[id] === false, `${id} stays closed`);
    }
  } else if (c.kind === "weakpump") {
    // M8: a half-clogged impeller scales the head curve down — everything still runs,
    // weaker.
    check(r.valveOpen["Z1.valve"] === true, "Z1 valve still opens");
    for (const id of ["Z1.head1", "Z1.head2", "Z1.head3"]) {
      check(r.demands.get(id) > 0, `${id} still discharges`);
    }
    check(r.pumpFlow < z1Result.pumpFlow, "weak pump moves less water");
    check(
      r.demands.get("Z1.head2") < z1Result.demands.get("Z1.head2"),
      "the unregulated rotor's discharge drops",
    );
  } else if (c.kind === "pumpdead") {
    // M8: a broken motor (one fault key, shared by the hydraulic and circuit sides)
    // kills the pump even though the wiring would deliver power.
    check(elec.pumpPowered === true, "relay/wiring would power the pump");
    check(Math.abs(r.pumpFlow) < 1e-6, "broken motor: no flow");
    check(!r.reachable.has("Z1.head1"), "nothing downstream is wetted");
    check(r.commandedNotOpening["Z1.valve"] === true, "Z1 reported commanded-but-not-opening");
  } else if (c.kind === "noclamp") {
    // M8 special: with the regulator broken the spray follows the raw nozzle table
    // at its full inlet pressure instead of the 2.76 bar clamp.
    const o = model.flowNodes.get("Z1.head1");
    const inlet = r.pressureBar[epOf("Z1.head1")];
    const law = outletDemandAt(o, inlet, model.curves, { noClamp: true });
    const got = r.demands.get("Z1.head1");
    check(Math.abs(got - law) < 1e-3, `unregulated spray matches the raw table law (${got.toFixed(4)} vs ${law.toFixed(4)})`);
    if (inlet > 2.76) {
      check(
        got > z1Result.demands.get("Z1.head1"),
        `above 2.76 bar it discharges more than the regulated head (${got.toFixed(4)} > ${z1Result.demands.get("Z1.head1").toFixed(4)})`,
      );
    }
  } else if (c.kind === "throttle0") {
    // M6: a fully-seated flow control pins the diaphragm shut — energised or not.
    check(elec.zoneEnergised[1] === true, "zone 1 energised (wiring healthy)");
    check(r.valveOpen["Z1.valve"] === false, "fully-seated flow control holds the valve shut");
    check(r.commandedNotOpening["Z1.valve"] === true, "reported commanded-but-not-opening");
    for (const id of ["Z1.head1", "Z1.head2", "Z1.head3"]) {
      check(r.demands.get(id) === 0 && !r.reachable.has(id), `${id} dry`);
    }
    check(Math.abs(r.outSum) < 1e-9, "no outflow anywhere");
  }
  console.log("");
}

// Electrical-only spot checks (no hydraulic solve): the loop semantics in isolation.
console.log("Case: electrical-only continuity checks");
{
  const all = { mv: true, zones: { 1: true, 2: true, 3: true, 4: true } };
  const healthy = solveElectrical(circuit, all);
  check(healthy.pumpPowered && [1, 2, 3, 4].every((z) => healthy.zoneEnergised[z]),
    "healthy wiring: pump + all four zones energised");

  const noGrid = solveElectrical(circuit, { mv: true, zones: { 1: true } }, new Set(["grid_live"]));
  check(noGrid.pumpPowered === false, "broken grid_live de-powers the pump");
  check(noGrid.zoneEnergised[1] === true, "...but the low-voltage zone circuit is unaffected");

  const noController = solveElectrical(circuit, all, new Set(["adapter_supply_1"]));
  check(noController.controllerPowered === false, "broken adapter supply de-powers the controller");
  check(noController.pumpPowered === false && [1, 2, 3, 4].every((z) => !noController.zoneEnergised[z]),
    "...so nothing actuates");

  const lead3 = solveElectrical(circuit, all, new Set(["common_lead_3"]));
  check(lead3.zoneEnergised[3] === false &&
    [1, 2, 4].every((z) => lead3.zoneEnergised[z]),
    "broken common_lead_3 drops only zone 3 (its own return lead)");
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
    "Z1.hose1:clogged",
    "Z1.valve.diaphragm:broken",
    "pump.impeller:clogged",
    "Z3.head2.nozzle:misconfigured",
    "Z5.nozzle:clogged",
    "controller.zone_2:broken",
    "splice.com_3:broken",
    "Z6.cap:broken",
  ]) {
    check(keys.has(k), `fault list includes ${k}`);
  }
  check(
    faults.filter((f) => f.key === "pump.motor:broken").length === 1,
    "the pump motor (in both kinds and circuit) is one fault, not two",
  );
  check(
    faults.every((f) => f.severity === (f.type === "clogged")),
    "exactly the clogs carry a 0..1 severity",
  );

  const full = compileFaults(model, { "Z1.hose1:clogged": 1 });
  check(full.closedLinks.has("Z1.hose1") && !full.linkK.has("Z1.hose1"), "full clog seals the link");
  const part = compileFaults(model, { "Z1.hose1:clogged": 0.5 });
  check(!part.closedLinks.has("Z1.hose1") && part.linkK.get("Z1.hose1") > 0, "partial clog adds minor loss");
  const burst = compileFaults(model, { "Z1.hose2:broken": true });
  check(burst.leaks.get("Z1.joint3") > 0, "burst hose leaks at its downstream junction");
  const seatHalf = compileFaults(model, { "Z1.valve.seat:clogged": 0.5 });
  check(
    Math.abs(seatHalf.valveLossScale.get("Z1.valve") - 4) < 1e-9 && !seatHalf.linkK.has("Z1.valve"),
    "partial seat clog scales the valve's loss curve by 1/a² (GPV minor losses are ignored by EPANET)",
  );
  const seatFull = compileFaults(model, { "Z1.valve.seat:clogged": 1 });
  check(
    seatFull.closedLinks.has("Z1.valve") && seatFull.valveDisabled.has("Z1.valve"),
    "fully packed seat seals the valve and reports it commanded-but-not-opening",
  );
  check(compileFaults(model, { "hose1:broken": true }).pumpDisabled, "suction-side break loses prime");
  check(
    compileFaults(model, { "Z3.valve.coil:broken": true }).elecBlocked.has("Z3.valve.coil"),
    "broken solenoid coil becomes an electrical cut",
  );
  check(
    compileFaults(model, { "Z1.valve.flow_control:misconfigured": true }).valveDisabled.has("Z1.valve"),
    "seated flow-control screw pins the valve shut",
  );
  check(
    compileFaults(model, { "Z2.valve.diaphragm:broken": true }).valveForcedOpen.has("Z2.valve"),
    "torn diaphragm sticks the valve open",
  );
  check(
    compileFaults(model, { "Z1.valve.plunger:broken": true }).valveDisabled.has("Z1.valve"),
    "broken solenoid plunger: valve cannot lift",
  );
  check(compileFaults(model, { "pump.priming_cap:misconfigured": true }).pumpDisabled, "loose priming cap loses prime");
  check(
    compileFaults(model, { "Z1.head2.nozzle:misconfigured": true }).outletMods.get("Z1.head2").nozzle === "8.0",
    "rotor wrong-nozzle swaps to another catalog size",
  );
  check(
    compileFaults(model, { "Z1.head1.nozzle:misconfigured": true }).outletMods.get("Z1.head1").nozzle === "MP2000",
    "spray wrong-nozzle swaps to a family that has the same arc",
  );
  check(
    !!compileFaults(model, { "Z4.head2.flush_plug:misconfigured": true }).outletMods.get("Z4.head2").asOrifice,
    "flush plug left in: the head dumps as an open orifice",
  );
  const circ = compileFaults(model, { "controller.zone_2:broken": true });
  check(circ.elecBlocked.has("controller.zone_2"), "circuit fault becomes a blocked port");
  const e2 = solveElectrical(circuit, { mv: true, zones: { 1: true, 2: true } }, circ.elecBlocked);
  check(
    e2.zoneEnergised[2] === false && e2.zoneEnergised[1] === true,
    "...which drops exactly that zone",
  );
  let threw = false;
  try {
    compileFaults(model, { "no.such.part:broken": true });
  } catch {
    threw = true;
  }
  check(threw, "unknown fault key throws (a typo is a bug, not a fault)");
  const off = compileFaults(model, { "Z1.hose1:clogged": 0, "Z1.valve.coil:broken": false });
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
