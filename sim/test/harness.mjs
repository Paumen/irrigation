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
import { computeLayout } from "../src/layout.js";
import { buildScene, pressureColor, strokeWidth } from "../src/scene.js";
import { fmtFlow } from "../src/units.js";
import { CIRCUIT_BAND_GAP, DEAD_COLOR, STROKE_MIN_PX, STROKE_MAX_PX } from "../src/config.js";

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
let z1Elec = null;
let idleResult = null; // stashed for the M5 scene checks
let idleElec = null;
let s2Result = null; // broken-signal_2 case, for the M5 wiring-state checks
let s2Elec = null;

for (const c of cases) {
  console.log(`Case: ${c.name}`);
  const elec = solveElectrical(circuit, c.commands, c.blocked || new Set());
  const r = solveSteady(model, c.state, elec, hyd);
  reportTable(model, r);
  if (c.kind === "idle") [idleResult, idleElec] = [r, elec];
  if (c.kind === "z1") z1Elec = elec;
  if (c.blocked?.has("signal_2")) [s2Result, s2Elec] = [r, elec];

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

// M5: elkjs layout + scene building. Positions depend only on the static graph and
// must never move between states; per-frame visuals (width/color/dash/labels/wire
// states) are asserted against the stashed solved cases.
console.log("Case: M5 layout (elkjs)");
const layout = await computeLayout(model, circuit);
{
  const inCanvas = ({ x, y }) =>
    Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= layout.width && y >= 0 && y <= layout.height;

  let badNode = null;
  let badEdge = null;
  for (const n of model.flowNodes.values()) {
    if (n.subkind === "hose" || n.subkind === "swing") {
      const e = layout.flow.edges.get(n.id);
      if (!e || e.points.length < 2 || !e.points.every(inCanvas)) badEdge = n.id;
    } else {
      const pos = layout.flow.nodes.get(n.id);
      if (!pos || !inCanvas(pos)) badNode = n.id;
    }
  }
  check(!badNode, `every non-pipe flow node placed in-canvas${badNode ? ` (${badNode})` : ""}`);
  check(!badEdge, `every hose/swing routed as an edge with >= 2 in-canvas points${badEdge ? ` (${badEdge})` : ""}`);

  const x = (id) => layout.flow.nodes.get(id).x;
  check(
    x("well") < x("pump") && x("pump") < x("manifold") && x("manifold") < x("Z1.valve") && x("Z1.valve") < x("Z1.head2"),
    "direction=RIGHT: well < pump < manifold < Z1.valve < Z1.head2 in x",
  );

  const zoneIds = [...layout.flow.zones.keys()].sort();
  check(zoneIds.join(",") === "Z1,Z2,Z3,Z4,Z5,Z6", `zone clusters Z1..Z6 (got ${zoneIds.join(",")})`);
  const inBox = (pos, b) =>
    pos.x >= b.x && pos.y >= b.y && pos.x + pos.w <= b.x + b.w && pos.y + pos.h <= b.y + b.h;
  const z1box = layout.flow.zones.get("Z1");
  let outOfZone = null;
  for (const [id, pos] of layout.flow.nodes) {
    if (/^Z1\./.test(id) && !inBox(pos, z1box)) outOfZone = id;
  }
  check(!outOfZone, `every Z1.* glyph inside the Z1 cluster box${outOfZone ? ` (${outOfZone})` : ""}`);
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  let zonesOverlap = false;
  for (const a of zoneIds) {
    for (const b of zoneIds) {
      if (a < b && overlap(layout.flow.zones.get(a), layout.flow.zones.get(b))) zonesOverlap = true;
    }
  }
  check(!zonesOverlap, "zone cluster boxes do not overlap");
  check(
    zoneIds.every((z) => layout.flow.zones.get(z).x > x("manifold")),
    "every zone cluster sits right of the manifold",
  );

  // the splice part renders as per-port field-splice dots; every other part is a box
  const expectedParts = [
    ...Object.keys(circuit.parts).filter((p) => p !== "splice"),
    "Z1.valve", "Z2.valve", "Z3.valve", "Z4.valve",
  ];
  check(
    expectedParts.every((p) => layout.circuit.parts.has(p)) && !layout.circuit.parts.has("splice"),
    "every circuit part placed as a box, splice as field-splice dots",
  );
  const spliceDots = Object.keys(circuit.parts.splice).map((p) => `splice.${p}`);
  check(
    spliceDots.every((p) => layout.circuit.splices.has(p) && inCanvas(layout.circuit.splices.get(p))),
    `all ${spliceDots.length} splice ports placed as field-splice dots`,
  );
  check(
    ["splice.sig_1", "splice.sig_2", "splice.sig_3", "splice.sig_4"].every(
      (p) => layout.circuit.leads.get(`lead:${p}`)?.points.length >= 2,
    ),
    "the four splice->coil leads routed as polylines",
  );
  // every wire drawn, all segments orthogonal (circuit-layout validates and throws,
  // but pin the invariant here too), conductor class assigned
  const orthogonal = (pts) =>
    pts.every((p, i) => i === 0 || p.x === pts[i - 1].x || p.y === pts[i - 1].y);
  check(
    Object.keys(circuit.wires).every((w) => {
      const e = layout.circuit.wires.get(w);
      return e && e.points.length >= 2 && orthogonal(e.points) && e.cls;
    }),
    "every wire routed as an orthogonal polyline with a conductor class",
  );
  check(
    layout.circuit.wires.get("grid_live").cls === "live" &&
      layout.circuit.wires.get("pump_neutral").cls === "neutral" &&
      layout.circuit.wires.get("grid_earth").cls === "earth" &&
      layout.circuit.wires.get("signal_2").cls === "lv" &&
      layout.circuit.wires.get("common_return").cls === "lv",
    "conductor classes: live / neutral / earth / 24 VAC",
  );
  const flowBottom = Math.max(...[...layout.flow.nodes.values()].map((n) => n.y + n.h));
  const circuitTop = Math.min(
    ...[...layout.circuit.parts.values()].map((p) => p.y),
    ...[...layout.circuit.splices.values()].map((p) => p.y),
  );
  check(
    circuitTop >= flowBottom + CIRCUIT_BAND_GAP - 1e-6,
    `circuit band reserved below the hydraulics (gap ${(circuitTop - flowBottom).toFixed(0)} px)`,
  );

  const again = await computeLayout(model, circuit);
  check(
    JSON.stringify([...again.flow.nodes]) === JSON.stringify([...layout.flow.nodes]) &&
      JSON.stringify([...again.circuit.wires]) === JSON.stringify([...layout.circuit.wires]),
    "layout is deterministic (same graph -> same coordinates)",
  );
}
console.log("");

console.log("Case: M5 scene (visual attribute computation)");
{
  check(pressureColor(0) === "hsl(220, 80%, 45%)", "pressureColor(0 bar) is blue (hue 220)");
  check(pressureColor(2.5) === "hsl(110, 80%, 45%)", "pressureColor(2.5 bar) is green (hue 110)");
  check(
    pressureColor(99) === pressureColor(5) && pressureColor(5) === "hsl(0, 80%, 45%)",
    "pressureColor clamps to red (hue 0) at scale top",
  );
  check(strokeWidth(0) === STROKE_MIN_PX && strokeWidth(99) === STROKE_MAX_PX, "strokeWidth spans min..max");
  check(strokeWidth(1) < strokeWidth(2), "strokeWidth monotone in |q|");

  const idleScene = buildScene(model, layout, idleResult, idleElec);
  const z1Scene = buildScene(model, layout, z1Result, z1Elec);
  const byKey = (arr) => new Map(arr.map((p) => [p.key, p]));

  const idlePipes = byKey(idleScene.pipes);
  check(
    [...idlePipes.values()].filter((p) => p.key !== "hose1" && p.key !== "well->pump").every((p) => p.dead && p.dashed && p.width === STROKE_MIN_PX),
    "idle: every pipe downstream of the stopped pump is dead, dashed, min width",
  );
  check(
    idleScene.labels.every((l) => l.text === "—"),
    "idle: every outlet label shows — (no false flows)",
  );
  check(byKey(idleScene.nodes).get("pump").state === "off", "idle: pump glyph state off");

  const z1Pipes = byKey(z1Scene.pipes);
  check(
    !z1Pipes.get("Z1.hose1").dead && z1Pipes.get("Z1.hose1").width > STROKE_MIN_PX && z1Pipes.get("Z1.hose1").color !== DEAD_COLOR,
    "pump+Z1: Z1.hose1 live, bold, pressure-colored",
  );
  check(z1Pipes.get("Z2.hose1").dead && z1Pipes.get("Z2.hose1").color === DEAD_COLOR, "pump+Z1: Z2.hose1 dead grey");
  check(
    z1Pipes.get("Z1.valve->Z1.joint2").dead === false && z1Pipes.get("Z2.valve->Z2.joint2").dead === true,
    "pump+Z1: half-edge downstream of a closed valve renders dead, open valve's doesn't",
  );
  const z1HeadLabel = byKey(z1Scene.labels).get("Z1.head1");
  check(
    z1HeadLabel.text === fmtFlow(z1Result.demands.get("Z1.head1"), false),
    `pump+Z1: Z1.head1 label shows its discharge (${z1HeadLabel.text})`,
  );
  const z1SceneLmin = buildScene(model, layout, z1Result, z1Elec, { lmin: true });
  check(
    byKey(z1SceneLmin.labels).get("Z1.head1").text.endsWith("L/min"),
    "lmin flag switches outlet labels to L/min",
  );
  const z1Nodes = byKey(z1Scene.nodes);
  check(z1Nodes.get("Z1.valve").state === "open" && z1Nodes.get("Z2.valve").state === "closed", "valve glyph states open/closed");
  check(z1Nodes.get("pump").state === "on", "pump glyph state on");

  const z1Splices = byKey(z1Scene.splices);
  check(
    z1Splices.get("splice.sig_1").state === "powered" && z1Splices.get("splice.com_4").state === "powered",
    "pump+Z1: zone-1 signal splice and shared-return splice powered",
  );
  check(z1Splices.get("splice.sig_2").state === "off", "pump+Z1: zone-2 signal splice off");
  const z1Leads = byKey(z1Scene.leads);
  check(z1Leads.get("lead:splice.sig_1").state === "powered", "pump+Z1: zone-1 solenoid lead powered");
  check(z1Leads.get("lead:splice.sig_2").state === "off", "pump+Z1: zone-2 solenoid lead off");

  const s2Scene = buildScene(model, layout, s2Result, s2Elec);
  const s2Wires = byKey(s2Scene.wires);
  check(s2Wires.get("signal_2").state === "broken", "broken signal_2 wire shown broken");
  check(
    s2Wires.get("signal_1").state === "powered" && s2Wires.get("common_return").state === "powered",
    "other zone wiring shown powered",
  );
  check(
    byKey(s2Scene.leads).get("lead:splice.sig_2").state !== "broken",
    "broken signal_2: the lead beyond the gap is dead, not itself broken",
  );
  const idleWires = byKey(idleScene.wires);
  check(idleWires.get("signal_1").state === "off", "idle: zone wire off");
  check(idleWires.get("adapter_supply_1").state === "powered", "idle: controller supply still powered");

  // R11 invariant: geometry comes from the one startup layout; only visual
  // attributes may differ between states
  const geomOf = (scene) =>
    JSON.stringify([
      scene.pipes.map((p) => [p.key, p.points]),
      scene.nodes.map((n) => [n.key, n.x, n.y]),
      scene.wires.map((w) => [w.key, w.points]),
      scene.leads.map((l) => [l.key, l.points]),
      scene.splices.map((s) => [s.key, s.x, s.y]),
    ]);
  check(geomOf(idleScene) === geomOf(z1Scene), "positions never move between states");
}
console.log("");

if (failures) {
  console.error(`\nHarness FAILED (${failures} assertion(s))`);
  process.exit(1);
}
console.log("Harness PASSED");
