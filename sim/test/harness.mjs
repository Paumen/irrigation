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

let z1Result = null; // stashed by the z1 case for cross-case monotonicity checks

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

// Per-wire / per-port display states (asked / powered / broken) for the schematic.
console.log("Case: electrical wire/port display states");
{
  const all = { mv: true, zones: { 1: true, 2: true, 3: true, 4: true } };

  const healthy = solveElectrical(circuit, all);
  check(healthy.wires.signal_1.asked && healthy.wires.signal_1.powered,
    "healthy: signal_1 asked + powered");
  check(healthy.wires.common_return.powered, "healthy: shared common return powered");
  check(healthy.wires.grid_live.powered && healthy.wires.pump_live.powered,
    "healthy: pump mains run powered");
  check(healthy.ports["Z1.valve.coil"].powered, "healthy: Z1 solenoid coil powered");
  check(healthy.ports["relay.contact"].powered, "healthy: relay contact on the powered pump path");
  check(Object.values(healthy.wires).every((w) => !w.broken), "healthy: nothing broken");

  const idle = solveElectrical(circuit, { mv: false, zones: {} });
  check(!idle.wires.signal_1.asked && !idle.wires.signal_1.powered,
    "idle: zone wiring neither asked nor powered");
  check(!idle.wires.pump_live.asked, "idle: pump mains run not asked");
  check(idle.wires.adapter_supply_1.asked && idle.wires.adapter_supply_1.powered,
    "idle: controller supply still asked + powered");

  const s2 = solveElectrical(circuit, all, new Set(["signal_2"]));
  check(s2.wires.signal_2.asked && !s2.wires.signal_2.powered && s2.wires.signal_2.broken,
    "broken signal_2: wire asked, dead, shown broken");
  check(s2.ports["splice.sig_2"].asked && !s2.ports["splice.sig_2"].powered && !s2.ports["splice.sig_2"].broken,
    "broken signal_2: splice beyond the gap is asked-but-dead, not broken");
  check(s2.wires.signal_1.powered && s2.wires.common_return.powered,
    "broken signal_2: other zones and the shared return stay powered");

  const cr = solveElectrical(circuit, all, new Set(["common_return"]));
  check(cr.wires.common_return.asked && cr.wires.common_return.broken,
    "broken common_return: shown broken on the asked path");
  check(cr.wires.signal_1.asked && !cr.wires.signal_1.powered && !cr.wires.signal_1.broken,
    "broken common_return: zone signal wires asked-but-dead, not themselves broken");

  const sigPort = solveElectrical(circuit, all, new Set(["splice.sig_2"]));
  check(sigPort.ports["splice.sig_2"].broken, "blocked splice port shown broken");
  check(!sigPort.wires.signal_2.broken && sigPort.wires.signal_2.asked,
    "blocked splice port: the wire feeding it is asked, not broken");

  const noGrid = solveElectrical(circuit, all, new Set(["grid_live"]));
  check(noGrid.wires.grid_live.broken, "broken grid_live shown broken");
  check(noGrid.wires.pump_live.asked && !noGrid.wires.pump_live.powered && !noGrid.wires.pump_live.broken,
    "broken grid_live: rest of the pump run asked-but-dead, not broken");
  check(noGrid.wires.signal_relay.powered, "broken grid_live: relay coil loop still powered");
}
console.log("");

if (failures) {
  console.error(`\nHarness FAILED (${failures} assertion(s))`);
  process.exit(1);
}
console.log("Harness PASSED");
