import { loadGraph, loadCatalog } from "./yaml-node.mjs";
import { buildModel } from "../src/model.js";
import { createHydraulics } from "../src/epanet-runner.js";
import { solveSteady } from "../src/solver.js";
import { solveElectrical } from "../src/electrical.js";
import { compileFaults } from "../src/faults.js";
import { outletDemandAt, outletThrowAt, interp } from "../src/outlets.js";
import { open, watering, pressurised, starved, primed } from "../src/readings.js";
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
  console.log("  outlet                  reachable  inlet(bar)  flow(m3/h)  throw(m)  precip(mm/hr)");
  for (const o of [...model.flowNodes.values()].filter((n) => n.role === "outlet")) {
    const p = r.pressureBar[epOf(o.id)];
    const q = r.demands.get(o.id);
    const re = r.reachable.has(o.id);
    const t = r.throws.get(o.id);
    const pr = r.precip.get(o.id);
    console.log(
      `   ${o.id.padEnd(22)} ${String(re).padEnd(9)} ${(re && Number.isFinite(p) ? p.toFixed(3) : "—").padStart(9)} ${q.toFixed(4).padStart(11)} ${(t != null ? t.toFixed(1) : "—").padStart(8)} ${(pr != null ? pr.toFixed(1) : "—").padStart(13)}`,
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
  check(elec.live["S1_pump.jet"] === false, "idle: pump not powered (no command)");
  check([2,3,4,5].every((z) => elec.live[`Z${z}_valve.auto`] === false), "idle: no zone energised");
  const r = solveSteady(model, {}, elec, hyd, noFaults);
  table(model, r);
  check(r.converged, "idle converges");
  check(r.pumpFlow < 1e-6, "no pump flow when off");
  const outlets = [...model.flowNodes.values()].filter((n) => n.role === "outlet");
  check(outlets.every((o) => r.demands.get(o.id) === 0), "every outlet flow is zero");
  check(outlets.every((o) => !r.reachable.has(o.id)), "every outlet is a dead (unreachable) branch");
  // readings/primitives over the solve (no qualitative layer)
  check(!pressurised(model, r, "S1_pump.jet"), "idle: pump unpressurised");
  check(!open(r, "Z2_valve.auto"), "idle: Z2 valve closed");
  check(!watering(r, "Z2_head.rotor"), "idle: Z2 rotor off");
}

{
  console.log("\nCASE pump+Z2");
  const elec = solveElectrical(model, { pumpStart: true, zones: { 2: true } });
  check(elec.live["S1_pump.jet"] === true, "pump powered through healthy wiring");
  check(elec.live["Z2_valve.auto"] === true, "Z2 energised");
  check([3, 4, 5].every((z) => elec.live[`Z${z}_valve.auto`] === false), "Z3/Z4/Z5 not energised");
  const r = solveSteady(model, {}, elec, hyd, noFaults);
  table(model, r);
  check(r.valveOpen["Z2_valve.auto"] === true, "Z2 valve open");
  check(r.converged, "converges");
  // readings facade (src/readings.js) — derived views over the solve, no stored controls
  check(open(r, "Z2_valve.auto") && !open(r, "Z3_valve.auto"), "reading: open(Z2) true, open(Z3) false");
  check(watering(r, "Z2_head.rotor") && pressurised(model, r, "Z2_head.rotor"), "reading: Z2 rotor watering + pressurised");
  check(!watering(r, "Z3_head.rotor_1") && !starved(model, r, "Z3_head.rotor_1"), "reading: Z3 rotor neither watering nor starved (dead branch)");
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
  {
    const o = model.flowNodes.get("Z2_head.rotor");
    const p = r.pressureBar[epOf("Z2_head.rotor")];
    const expect = outletThrowAt(o, p, model.curves);
    const got = r.throws.get("Z2_head.rotor");
    check(got != null && Math.abs(got - expect) < 1e-6, `Z2_head.rotor throw ${got?.toFixed(1)} m matches catalog ${expect.toFixed(1)} m at ${p.toFixed(3)} bar`);
    // MP spray: throw at the PRS40-regulated pressure, precip = flow / wetted sector
    const s = model.flowNodes.get("Z2_head.spray_1");
    const sp = r.pressureBar[epOf("Z2_head.spray_1")];
    const st = r.throws.get("Z2_head.spray_1");
    const sExpect = outletThrowAt(s, sp, model.curves);
    check(st != null && Math.abs(st - sExpect) < 1e-6, `Z2_head.spray_1 (MP3000) throw ${st?.toFixed(1)} m at ${Math.min(sp, SPRAY_CLAMP_BAR).toFixed(2)} bar (regulated)`);
    const sPr = r.precip.get("Z2_head.spray_1");
    check(sPr != null && sPr > 0, `Z2_head.spray_1 precip ${sPr?.toFixed(1)} mm/hr is modeled`);
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

  // readings + the live primitive (no qualitative layer)
  check(pressurised(model, r, "S1_pump.jet") && primed(model, r), "pump pressurised + primed");
  check(open(r, "Z2_valve.auto"), "Z2 valve open");
  check(elec.live["Z2_valve.auto"] === true, "Z2 solenoid coil live");
  check([3, 4, 5].every((z) => !open(r, `Z${z}_valve.auto`)), "Z3/Z4/Z5 valves closed");
  check(watering(r, "Z2_head.rotor"), "Z2 rotor watering");
  check(pressurised(model, r, "Z1_hose.ldpe16_1"), "Z1 hose pressurised (upstream of closed manual valve)");
}

{
  // M4 — broken wire on the shared common return. All four zones commanded, but the daisy-
  // chained common is cut between Z3's and Z5's return splices, so every zone whose return
  // current has to cross that break (Z2, Z3) cannot energise, while Z5/Z4 (downstream of the
  // break, still reaching the controller common) energise normally.
  console.log("\nCASE pump+all zones, broken shared return (O1_wiring.common_2)");
  const blocked = new Set(["O1_wiring.common_2"]);
  const elec = solveElectrical(model, { pumpStart: true, zones: { 2: true, 3: true, 4: true, 5: true } }, blocked);
  check(elec.live["S1_pump.jet"] === true, "pump still powered (separate 230V circuit)");
  check(elec.live["Z4_valve.auto"] === true && elec.live["Z5_valve.auto"] === true, "Z4/Z5 energised (return intact)");
  check(elec.live["Z2_valve.auto"] === false && elec.live["Z3_valve.auto"] === false, "Z2/Z3 de-energised by the shared-return break");
  check(
    elec.live["Z2_valve.auto"] === false && elec.live["Z3_valve.auto"] === false &&
      elec.live["Z4_valve.auto"] === true && elec.live["Z5_valve.auto"] === true,
    "live coils: Z2/Z3 dead (return crosses the cut), Z4/Z5 live",
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

  check(!open(r, "Z2_valve.auto") && !open(r, "Z3_valve.auto"), "Z2/Z3 valves closed (de-energised return)");
  check(open(r, "Z4_valve.auto") && open(r, "Z5_valve.auto"), "Z4/Z5 valves open");
  check(elec.live["Z2_valve.auto"] === false, "Z2 solenoid coil dead (return current crosses the cut)");
}

{
  // A fault that cuts the controller's 230V feed must turn it off gracefully (grid-socket
  // discovery is static topology and must not depend on the fault set).
  console.log("\nCASE cut controller feed wire (electrical fault)");
  const elec = solveElectrical(model, { pumpStart: true, zones: { 2: true } }, new Set(["O1_wiring.230v_1"]));
  check(elec.live["O1_control.controller"] === false, "controller de-powered by the cut feed");
  check(elec.live["S1_pump.jet"] === false, "pump off (relay coil needs the controller)");
  check(elec.live["Z2_valve.auto"] === false, "Z2 de-energised");
  check(elec.live["O1_control.controller"] === false, "controller dead (feed cut)");
  check(elec.live["S2_relay.pumpstart"] === false, "relay coil dead");
}

{
  // The valve mechanism now lives in the solve, not a qualitative rule layer: a bonnet bleed
  // screw vents the chamber and opens the valve with no electrical command.
  console.log("\nCASE bonnet bleed opens an un-commanded valve");
  const bleedControls = { bonnetBleed: { "Z3_valve.auto": true } };
  const elec = solveElectrical(model, { pumpStart: true });
  const r = solveSteady(model, bleedControls, elec, hyd, noFaults);
  check(elec.live["Z3_valve.auto"] !== true, "Z3 not electrically commanded");
  check(open(r, "Z3_valve.auto"), "Z3 valve open via the bonnet bleed screw (no command)");
  check(r.chamberBar["Z3_valve.auto"] < r.pressureBar[epOf("Z3_joint.sm1bm1")], "Z3 bonnet chamber bled below inlet");
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
