import { loadGraph, loadCatalog } from "./yaml-node.mjs";
import { buildModel } from "../src/model.js";
import { createHydraulics } from "../src/epanet-runner.js";
import { solveSteady } from "../src/solver.js";
import { solveElectrical } from "../src/electrical.js";
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
  const elec = solveElectrical(model, {});
  check(elec.pumpPowered === false, "idle: pump not powered (no command)");
  check(Object.values(elec.zoneEnergised).every((v) => v === false), "idle: no zone energised");
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
  const elec = solveElectrical(model, { pumpStart: true, zones: { 2: true } });
  check(elec.pumpPowered === true, "pump powered through healthy wiring");
  check(elec.zoneEnergised[2] === true, "Z2 energised");
  check([3, 4, 5].every((z) => elec.zoneEnergised[z] === false), "Z3/Z4/Z5 not energised");
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

{
  // M4 — broken wire on the shared common return. All four zones commanded, but the daisy-
  // chained common is cut between Z3's and Z5's return splices, so every zone whose return
  // current has to cross that break (Z2, Z3) cannot energise, while Z5/Z4 (downstream of the
  // break, still reaching the controller common) energise normally.
  console.log("\nCASE pump+all zones, broken shared return (O1_wiring.common_2)");
  const blocked = new Set(["O1_wiring.common_2"]);
  const elec = solveElectrical(model, { pumpStart: true, zones: { 2: true, 3: true, 4: true, 5: true } }, blocked);
  check(elec.pumpPowered === true, "pump still powered (separate 230V circuit)");
  check(elec.zoneEnergised[4] === true && elec.zoneEnergised[5] === true, "Z4/Z5 energised (return intact)");
  check(elec.zoneEnergised[2] === false && elec.zoneEnergised[3] === false, "Z2/Z3 de-energised by the shared-return break");
  check(
    elec.commandedNotEnergised.has(2) && elec.commandedNotEnergised.has(3) && elec.commandedNotEnergised.size === 2,
    "commandedNotEnergised is exactly {Z2, Z3}",
  );

  const r = solveSteady(model, {}, elec, hyd, noFaults);
  table(model, r);
  check(r.converged, "converges");
  check(r.massImbalance < 1e-3, `mass balance < 1e-3 (got ${r.massImbalance.toExponential(2)})`);
  check(
    r.valveOpen["Z2_valve.auto"] === false && r.valveOpen["Z3_valve.auto"] === false,
    "Z2/Z3 valves stay closed",
  );
  check(
    r.valveOpen["Z4_valve.auto"] === true && r.valveOpen["Z5_valve.auto"] === true,
    "Z4/Z5 valves open",
  );
  const dryHeads = ["Z2_head.rotor", "Z2_head.spray_1", "Z2_head.spray_2", "Z3_head.rotor_1", "Z3_head.rotor_2"];
  check(dryHeads.every((id) => r.demands.get(id) === 0), "every Z2/Z3 head is dry");
  const wetHeads = ["Z4_head.spray_1", "Z5_head.rotor_1"];
  check(wetHeads.every((id) => r.demands.get(id) > 0), "Z4/Z5 heads flow");
}

{
  // A fault that cuts the controller's 230V feed must turn it off gracefully (grid-socket
  // discovery is static topology and must not depend on the fault set).
  console.log("\nCASE cut controller feed wire (electrical fault)");
  const elec = solveElectrical(model, { pumpStart: true, zones: { 2: true } }, new Set(["O1_wiring.230v_1"]));
  check(elec.controllerPowered === false, "controller de-powered by the cut feed");
  check(elec.pumpPowered === false, "pump off (relay coil needs the controller)");
  check(elec.zoneEnergised[2] === false, "Z2 de-energised");
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
