import { loadGraph, loadCatalog } from "./yaml-node.mjs";
import { buildModel } from "../src/model.js";
import { createHydraulics } from "../src/epanet-runner.js";
import { solveSteady } from "../src/solver.js";
import { compileFaults } from "../src/faults.js";
import { outletDemandAt, interp } from "../src/outlets.js";
import { SPRAY_CLAMP_BAR } from "../src/config.js";

const epOf = (id) => id.replace(/\./g, "_");
const Z2_HEADS = ["Z2_head.rotor", "Z2_head.spray_1", "Z2_head.spray_2"];
const OTHER_AUTO_HEADS = [
  "Z3_head.rotor_1",
  "Z3_head.rotor_2",
  "Z4_head.spray_1",
  "Z4_head.spray_2",
  "Z4_head.spray_3",
  "Z4_head.spray_4",
  "Z5_head.rotor_1",
  "Z5_head.rotor_2",
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

{
  console.log("CASE idle");
  const elec = { pumpPowered: false, zoneEnergised: {} };
  const r = solveSteady(model, {}, elec, hyd, noFaults);
  table(model, r);
  check(r.converged, "idle converges");
  check(r.pumpFlow < 1e-6, "no pump flow when off");
  const outlets = [...model.flowNodes.values()].filter((n) => n.role === "outlet");
  check(outlets.every((o) => r.demands.get(o.id) === 0), "every outlet flow is zero");
  check(outlets.every((o) => !r.reachable.has(o.id)), "every outlet is a dead (unreachable) branch");
}

{
  console.log("\nCASE pump+Z2");
  const elec = { pumpPowered: true, zoneEnergised: { 2: true } };
  const r = solveSteady(model, {}, elec, hyd, noFaults);
  table(model, r);
  check(r.valveOpen["Z2_valve.auto"] === true, "Z2 valve open");
  check(r.converged, "converges");
  const allP = [...model.flowNodes.values()].filter((n) => n.role === "outlet" && r.reachable.has(n.id));
  check(allP.every((o) => Number.isFinite(r.pressureBar[epOf(o.id)])), "no NaN pressure on filled outlets");
  check(r.massImbalance < 1e-3, `mass balance < 1e-3 (got ${r.massImbalance.toExponential(2)})`);
  for (const id of Z2_HEADS) {
    const o = model.flowNodes.get(id);
    const p = r.pressureBar[epOf(id)];
    const q = r.demands.get(id);
    const expect = outletDemandAt(o, p, model.curves);
    check(Math.abs(q - expect) < 5e-3, `${id} flow ${q.toFixed(4)} matches catalog ${expect.toFixed(4)} at ${p.toFixed(3)} bar`);
  }
  const sprayP = r.pressureBar[epOf("Z2_head.spray_1")];
  if (sprayP > SPRAY_CLAMP_BAR) {
    const o = model.flowNodes.get("Z2_head.spray_1");
    const clamped = outletDemandAt(o, SPRAY_CLAMP_BAR, model.curves);
    check(Math.abs(r.demands.get("Z2_head.spray_1") - clamped) < 5e-3, "MP spray clamped at 2.76 bar");
  } else {
    console.log(`  (spray_1 inlet ${sprayP.toFixed(3)} bar below clamp; regulator inactive)`);
  }
  check(OTHER_AUTO_HEADS.every((id) => r.demands.get(id) === 0), "Z3/Z4/Z5 heads are dry");
  const pump = r.topo.pumps[0];
  const gain = r.headM[pump.n2] - r.headM[pump.n1];
  const curveHead = interp(model.curves.pump.flow_m3h, model.curves.pump.head_m, r.pumpFlow);
  check(Math.abs(gain - curveHead) < 0.5, `pump head gain ${gain.toFixed(2)} m on curve (${curveHead.toFixed(2)} m at ${r.pumpFlow.toFixed(3)} m3/h)`);
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
