// Headless verification of the M1–M4 physics core. Loads the real root YAMLs, builds
// the model, solves each case (electrical -> hydraulic), and asserts convergence, mass
// balance, catalog fidelity, dead-branch handling, the Z5 manual hand-watering branch,
// and electrical actuation (pump power + zone energisation incl. shared-return breaks).
// Exits non-zero on any failure.
//
// Run: node test/harness.mjs   (from sim/, via `npm test`)

import { loadGraph, loadCatalog } from "./yaml-node.mjs";
import { cases } from "./cases.mjs";
import { buildModel } from "../src/model.js";
import { createHydraulics } from "../src/epanet-runner.js";
import { solveSteady } from "../src/solver.js";
import { solveElectrical } from "../src/electrical.js";
import { outletDemandAt, interp } from "../src/outlets.js";

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

for (const c of cases) {
  console.log(`Case: ${c.name}`);
  const elec = solveElectrical(circuit, c.commands, c.blocked || new Set());
  const r = solveSteady(model, c.state, elec, hyd);
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

if (failures) {
  console.error(`\nHarness FAILED (${failures} assertion(s))`);
  process.exit(1);
}
console.log("Harness PASSED");
