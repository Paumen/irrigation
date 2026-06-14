// Headless verification of the physics core (M1-M4). Loads the real system.yaml, builds the
// model, and solves a minimal set of states (faults -> electrical -> hydraulic), asserting
// convergence, mass balance, catalog fidelity, the manual hand-watering branch, and electrical
// actuation incl. a shared-return break. Exits non-zero on any failure.
//
// system.yaml's auto zones are Z2/Z3/Z4/Z5 (Z2 is the reference zone: rotor + two MP sprays);
// Z1 is the manual stream branch. Run: node test/harness.mjs  (from sim/, via `npm test`).

import { loadGraph, loadCatalog } from "./yaml-node.mjs";
import { buildModel } from "../src/model.js";
import { createHydraulics } from "../src/epanet-runner.js";
import { solveSteady } from "../src/solver.js";
import { solveElectrical } from "../src/electrical.js";
import { compileFaults } from "../src/faults.js";
import { outletDemandAt, interp } from "../src/outlets.js";
import { SPRAY_CLAMP_BAR } from "../src/config.js";

const epOf = (id) => id.replace(/\./g, "_");
const Z2_HEADS = ["Z2_emitter.rotor", "Z2_emitter.spray_1", "Z2_emitter.spray_2"];
const OTHER_AUTO_HEADS = [
  "Z3_emitter.rotor_1",
  "Z3_emitter.rotor_2",
  "Z4_emitter.spray_1",
  "Z4_emitter.spray_2",
  "Z4_emitter.spray_3",
  "Z4_emitter.spray_4",
  "Z5_emitter.rotor_1",
  "Z5_emitter.rotor_2",
];

let failures = 0;
function check(cond, msg) {
  if (cond) console.log(`  ok: ${msg}`);
  else {
    console.error(`  FAIL: ${msg}`);
    failures++;
  }
}

function table(model, r) {
  console.log("  outlet                  reachable  inlet(bar)  flow(m3/h)");
  for (const o of [...model.flowNodes.values()].filter((n) => n.role === "outlet")) {
    const p = r.pressureBar[epOf(o.id)];
    const q = r.demands.get(o.id);
    const re = r.reachable.has(o.id);
    console.log(
      `   ${o.id.padEnd(22)} ${String(re).padEnd(9)} ${(re && Number.isFinite(p) ? p.toFixed(3) : "—").padStart(9)} ${q.toFixed(4).padStart(11)}`,
    );
  }
  console.log(
    `  pumpFlow=${r.pumpFlow.toFixed(4)}  outSum=${r.outSum.toFixed(4)}  imbalance=${r.massImbalance.toExponential(2)}  iters=${r.iters}  converged=${r.converged}`,
  );
}

const model = buildModel(loadGraph(), loadCatalog());
const hyd = await createHydraulics();
console.log(`epanet-js engine version: ${hyd.version}\n`);
const noFaults = compileFaults(model, {});

// --- 1. idle: pump off, nothing commanded ---
{
  console.log("CASE idle");
  const elec = solveElectrical(model, {});
  const r = solveSteady(model, {}, elec, hyd, noFaults);
  table(model, r);
  check(r.converged, "idle converges");
  check(r.pumpFlow < 1e-6, "no pump flow when off");
  const outlets = [...model.flowNodes.values()].filter((n) => n.role === "outlet");
  check(outlets.every((o) => r.demands.get(o.id) === 0), "every outlet flow is zero");
  check(outlets.every((o) => !r.reachable.has(o.id)), "every outlet is a dead (unreachable) branch");
}

// --- 2. pump + Z2: the reference running zone ---
{
  console.log("\nCASE pump+Z2");
  const elec = solveElectrical(model, { mv: true, zones: { 2: true } });
  const r = solveSteady(model, {}, elec, hyd, noFaults);
  table(model, r);
  check(elec.pumpPowered, "pump powered");
  check(elec.zoneEnergised[2] === true, "Z2 energised");
  check(r.valveOpen["Z2_valve.auto"] === true, "Z2 valve open");
  check(r.converged, "converges");
  const allP = [...model.flowNodes.values()].filter((n) => n.role === "outlet" && r.reachable.has(n.id));
  check(allP.every((o) => Number.isFinite(r.pressureBar[epOf(o.id)])), "no NaN pressure on filled outlets");
  check(r.massImbalance < 1e-3, `mass balance < 1e-3 (got ${r.massImbalance.toExponential(2)})`);
  // catalog fidelity: each Z2 head's flow matches its law at the pressure reaching it
  for (const id of Z2_HEADS) {
    const o = model.flowNodes.get(id);
    const p = r.pressureBar[epOf(id)];
    const q = r.demands.get(id);
    const expect = outletDemandAt(o, p, model.curves);
    check(Math.abs(q - expect) < 5e-3, `${id} flow ${q.toFixed(4)} matches catalog ${expect.toFixed(4)} at ${p.toFixed(3)} bar`);
  }
  // MP sprays are regulated: a spray above the clamp must read the clamped table value
  const sprayP = r.pressureBar[epOf("Z2_emitter.spray_1")];
  if (sprayP > SPRAY_CLAMP_BAR) {
    const o = model.flowNodes.get("Z2_emitter.spray_1");
    const clamped = outletDemandAt(o, SPRAY_CLAMP_BAR, model.curves);
    check(Math.abs(r.demands.get("Z2_emitter.spray_1") - clamped) < 5e-3, "MP spray clamped at 2.76 bar");
  } else {
    console.log(`  (spray_1 inlet ${sprayP.toFixed(3)} bar below clamp; regulator inactive)`);
  }
  check(OTHER_AUTO_HEADS.every((id) => r.demands.get(id) === 0), "Z3/Z4/Z5 heads are dry");
  // operating point sits on the pump curve
  const pump = r.topo.pumps[0];
  const gain = r.headM[pump.n2] - r.headM[pump.n1];
  const curveHead = interp(model.curves.pump.flow_m3h, model.curves.pump.head_m, r.pumpFlow);
  check(Math.abs(gain - curveHead) < 0.5, `pump head gain ${gain.toFixed(2)} m on curve (${curveHead.toFixed(2)} m at ${r.pumpFlow.toFixed(3)} m3/h)`);
}

// --- 3. Z1 manual stream branch ---
{
  console.log("\nCASE pump+Z1 manual");
  const elec = solveElectrical(model, { mv: true });
  const r = solveSteady(model, { manualOpen: { "Z1_valve.manual": true } }, elec, hyd, noFaults);
  table(model, r);
  check(r.converged, "converges");
  check(r.reachable.has("Z1_emitter.stream"), "stream nozzle is fed");
  check(r.demands.get("Z1_emitter.stream") > 0, "stream nozzle discharges");
  check(r.massImbalance < 1e-3, `mass balance < 1e-3 (got ${r.massImbalance.toExponential(2)})`);
  check(
    [...Z2_HEADS, ...OTHER_AUTO_HEADS].every((id) => r.demands.get(id) === 0),
    "no auto-zone flow (only the manual branch is open)",
  );
}

// --- 4. broken shared common return: every commanded zone de-energises, pump unaffected ---
{
  console.log("\nCASE broken common return");
  const blocked = new Set(["P1_wiring.24v/common/inlet", "P1_wiring.24v/common/outlet"]);
  const elec = solveElectrical(model, { mv: true, zones: { 2: true, 3: true, 4: true, 5: true } }, blocked);
  const r = solveSteady(model, {}, elec, hyd, noFaults);
  table(model, r);
  check(elec.pumpPowered, "pump still powered (separate circuit)");
  check([2, 3, 4, 5].every((z) => elec.zoneEnergised[z] === false), "all four zones de-energised by the shared-return break");
  const autoValves = [...model.flowNodes.values()].filter((n) => n.role === "valve-auto");
  check(autoValves.every((v) => r.valveOpen[v.id] === false), "all auto valves stay shut");
  check([...Z2_HEADS, ...OTHER_AUTO_HEADS].every((id) => r.demands.get(id) === 0), "no zone discharges");
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
