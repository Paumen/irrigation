import { loadGraph, loadCatalog } from "./yaml-node.mjs";
import { buildModel } from "../src/model.js";
import { createHydraulics } from "../src/epanet-runner.js";
import { solveSteady } from "../src/solver.js";
import { solveElectrical } from "../src/electrical.js";
import { compileFaults } from "../src/faults.js";
import { validateStateResolver, computeStates } from "../src/states.js";
import { outletDemandAt, outletThrowAt, interp } from "../src/outlets.js";
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
const resolver = validateStateResolver(model);

// M5 cross-check: rule-derived states must agree with the numeric solve wherever both exist.
function crossCheckStates(label, elec, r) {
  const st = computeStates(model, { elec, hyd: r, resolver });
  check(
    st.mismatches.length === 0,
    `${label}: state cross-check clean (${st.crossChecks.length} checks, ${st.mismatches.length} mismatch)` +
      (st.mismatches.length ? `: ${st.mismatches.map((m) => `${m.instance}.${m.variable} proj=${m.projected} rule=${m.derived}`).join("; ")}` : ""),
  );
  return st;
}

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
  const st = crossCheckStates("idle", elec, r);
  check(st.states["S1_pump.jet"].pressurised === "unpressurised", "idle: pump unpressurised");
  check(st.states["Z2_valve.auto"].open === "closed", "idle: Z2 valve closed");
  check(st.states["Z2_head.rotor"].watering === "off", "idle: Z2 rotor off");
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

  const st = crossCheckStates("pump+Z2", elec, r);
  check(st.states["S1_pump.jet"].pressurised === "pressurised" && st.states["S1_pump.jet"].primed === "primed", "pump primed + pressurised");
  check(st.states["Z2_valve.auto"].open === "open", "Z2 valve open (projected)");
  check(st.states["Z2_valve.auto"]["diaphragm"] === "up" && st.states["Z2_valve.auto"]["solenoid/coil"] === "live", "Z2 valve mechanism: coil live, diaphragm up");
  check([3, 4, 5].every((z) => st.states[`Z${z}_valve.auto`].open === "closed"), "Z3/Z4/Z5 valves closed");
  check(st.states["Z2_head.rotor"].watering === "watering", "Z2 rotor watering");
  check(st.states["Z1_hose.ldpe16_1"].pressurised === "pressurised", "Z1 hose pressurised (upstream of closed manual valve)");
  check(st.states["S1_joint.strainer"].wet === "wet" && st.states["S1_valve.foot"].wet === "wet", "suction chain wet (well wet by default)");
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

  const st = crossCheckStates("broken return", elec, r);
  check(
    st.states["Z2_valve.auto"].open === "closed" && st.states["Z3_valve.auto"].open === "closed",
    "Z2/Z3 valves closed (de-energised return)",
  );
  check(
    st.states["Z4_valve.auto"].open === "open" && st.states["Z5_valve.auto"].open === "open",
    "Z4/Z5 valves open",
  );
  check(st.states["Z2_valve.auto"]["solenoid/coil"] === "dead", "Z2 solenoid coil dead (return current crosses the cut)");
}

{
  // A fault that cuts the controller's 230V feed must turn it off gracefully (grid-socket
  // discovery is static topology and must not depend on the fault set).
  console.log("\nCASE cut controller feed wire (electrical fault)");
  const elec = solveElectrical(model, { pumpStart: true, zones: { 2: true } }, new Set(["O1_wiring.230v_1"]));
  check(elec.controllerPowered === false, "controller de-powered by the cut feed");
  check(elec.pumpPowered === false, "pump off (relay coil needs the controller)");
  check(elec.zoneEnergised[2] === false, "Z2 de-energised");
  const r = solveSteady(model, {}, elec, hyd, noFaults);
  const st = crossCheckStates("cut controller feed", elec, r);
  check(st.states["O1_control.controller"]["transformer"] === "dead", "controller transformer dead");
  check(st.states["S2_relay.pumpstart"]["coil"] === "dead", "relay coil dead");
}

{
  // M5 — qualitative state core: the kind->instance resolver and the rule fixpoint over the
  // intermediate valve mechanism the numeric loop collapses. No new physics; both inputs (M2
  // pressures/demands + M4 electrical) are already merged.
  console.log("\nCASE M5 qualitative state core");
  // Resolver: nearest-scope-first with global-singleton fallback for cross-prefix references.
  const cases = [
    ["S1_pump.jet", "relay.pumpstart/load", "S2_relay.pumpstart", "load"],
    ["S2_relay.pumpstart", "control.controller/terminals/port", "O1_control.controller", "terminals/port"],
    ["O1_control.controller", "source.socket", "O1_source.socket", ""],
    ["S2_relay.pumpstart", "source.socket", "S2_source.socket", ""],
    ["Z3_valve.auto", "control.controller/terminals/port", "O1_control.controller", "terminals/port"],
    ["Z2_hose.ldpe25_1", "valve.auto", "Z2_valve.auto", ""],
    ["Z3_head.rotor_1", "head.rotor", "Z3_head.rotor_1", ""], // self even with two rotors in the zone
    ["Z2_valve.auto", "solenoid/coil", "Z2_valve.auto", "solenoid/coil"],
  ];
  for (const [from, token, id, group] of cases) {
    const t = resolver.resolveRef(from, token);
    check(t.id === id && t.group === group, `resolve ${from} "${token}" -> ${id}/${group || "(primary)"} (got ${t.id}/${t.group || "(primary)"})`);
  }
  check(resolver.instances.size === 89, `resolver indexes every stateful instance (got ${resolver.instances.size})`);

  // Energise Z2: the whole pilot chain falls out of the fixpoint from the grounded coil + inlet.
  const elec = solveElectrical(model, { pumpStart: true, zones: { 2: true } });
  const r = solveSteady(model, {}, elec, hyd, noFaults);
  const st = computeStates(model, { elec, hyd: r, resolver });
  const v = st.states["Z2_valve.auto"];
  check(v["solenoid/plunger"] === "up", "Z2 plunger up (coil live)");
  check(v["solenoid/pilot_seat"] === "open", "Z2 pilot seat open");
  check(v["bonnet/chamber"] === "unpressurised", "Z2 bonnet chamber bled (unpressurised)");
  check(v["diaphragm"] === "up" && v.open === "open", "Z2 diaphragm up -> valve open");
  const v3 = st.states["Z3_valve.auto"];
  check(v3["solenoid/plunger"] === "down" && v3["bonnet/chamber"] === "pressurised" && v3.open === "closed", "Z3 (un-energised) mechanism holds the valve closed");

  // Bleed screw forces the chamber open without a command (qualitative path only — no electrical).
  const bleedState = { bleedOpen: { "Z3_valve.auto": true } };
  const elecOff = solveElectrical(model, {});
  const rb = solveSteady(model, bleedState, elecOff, hyd, noFaults);
  const stb = computeStates(model, { elec: elecOff, hyd: rb, state: bleedState, resolver });
  check(stb.states["Z3_valve.auto"]["bonnet/chamber"] === "unpressurised", "bleed screw open -> chamber unpressurised even with no command");
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
