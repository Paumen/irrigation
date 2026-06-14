import {
  Workspace,
  Project,
  NodeProperty,
  LinkProperty,
} from "epanet-js";

const M_PER_BAR = 10.197;

const INP = `[TITLE]
M0 smoke test

[JUNCTIONS]
;ID    Elev   Demand
 PIN   8.2    0
 POUT  8.2    0
 VIN   11.2   0
 HEAD  11.2   0.6

[RESERVOIRS]
;ID    Head
 WELL  5.5

[PIPES]
;ID    Node1  Node2  Length  Diam   Rough     Mloss  Status
 SUCT  WELL   PIN    4.5     19.6   0.0015    0.1    Open
 MAIN  POUT   VIN    21      26     0.0015    1.0    Open

[PUMPS]
;ID    Node1  Node2  Params
 PUMP  PIN    POUT   HEAD PCURVE

[VALVES]
;ID    Node1  Node2  Diam  Type  Setting  Mloss
 VALVE VIN    HEAD   25    GPV   VCURVE   0

[CURVES]
;ID      X(flow m3/h)  Y
 PCURVE  0     48.3
 PCURVE  0.6   45.6
 PCURVE  1.2   42.8
 PCURVE  1.8   40
 PCURVE  2.4   37.6
 PCURVE  3.0   35
 PCURVE  3.6   32.5
 PCURVE  4.2   30
 PCURVE  4.8   27.2
;GPV headloss curve: flow m3/h vs head loss m (catalog valve_loss, bar*10.197)
 VCURVE  0.2   2.14
 VCURVE  1.1   2.86
 VCURVE  2.3   2.86
 VCURVE  4.5   3.47
 VCURVE  6.8   5.61
 VCURVE  9.1   9.89

[OPTIONS]
 UNITS    CMH
 HEADLOSS D-W
 TRIALS   200
 ACCURACY 0.001

[REPORT]
 STATUS   NO
 SUMMARY  NO

[END]
`;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

function isFiniteNum(x) {
  return typeof x === "number" && Number.isFinite(x);
}

async function main() {
  const ws = new Workspace();
  await ws.loadModule();
  console.log(`epanet-js engine version: ${ws.version}`);

  const model = new Project(ws);
  ws.writeFile("m0.inp", INP);
  model.open("m0.inp", "m0.rpt", "m0.bin");
  model.solveH();

  const nodes = ["WELL", "PIN", "POUT", "VIN", "HEAD"];
  const links = ["SUCT", "PUMP", "MAIN", "VALVE"];

  const pressureBar = {};
  for (const id of nodes) {
    const idx = model.getNodeIndex(id);
    const p = model.getNodeValue(idx, NodeProperty.Pressure);
    pressureBar[id] = p / M_PER_BAR;
  }
  const flow = {};
  for (const id of links) {
    const idx = model.getLinkIndex(id);
    flow[id] = model.getLinkValue(idx, LinkProperty.Flow);
  }

  console.log("\nNode pressures:");
  for (const id of nodes) {
    console.log(`  ${id.padEnd(5)} ${pressureBar[id].toFixed(3)} bar`);
  }
  console.log("\nLink flows:");
  for (const id of links) {
    console.log(`  ${id.padEnd(5)} ${flow[id].toFixed(4)} m3/h`);
  }

  for (const id of nodes) {
    if (!isFiniteNum(pressureBar[id])) fail(`pressure at ${id} is not finite`);
  }
  for (const id of links) {
    if (!isFiniteNum(flow[id])) fail(`flow in ${id} is not finite`);
  }
  const demandIdx = model.getNodeIndex("HEAD");
  const headDemand = model.getNodeValue(demandIdx, NodeProperty.Demand);
  if (Math.abs(headDemand - 0.6) > 1e-3) {
    fail(`HEAD demand ${headDemand} != 0.6 m3/h`);
  }
  for (const id of links) {
    if (Math.abs(flow[id] - 0.6) > 1e-2) {
      fail(`series flow in ${id} = ${flow[id]} m3/h, expected ~0.6`);
    }
  }
  if (!(pressureBar["POUT"] > pressureBar["PIN"])) {
    fail(`pump did not add head (PIN=${pressureBar["PIN"]}, POUT=${pressureBar["POUT"]})`);
  }
  if (!(pressureBar["VIN"] > pressureBar["HEAD"])) {
    fail(`valve did not drop head (VIN=${pressureBar["VIN"]}, HEAD=${pressureBar["HEAD"]})`);
  }
  if (!(pressureBar["HEAD"] > 0 && pressureBar["HEAD"] < 6)) {
    fail(`HEAD pressure ${pressureBar["HEAD"]} bar out of sane 0-6 bar band`);
  }

  model.close();

  if (process.exitCode === 1) {
    console.error("\nM0 smoke test FAILED");
  } else {
    console.log("\nM0 smoke test PASSED — epanet-js API, CMH units, D-W, pump HEAD curve, and GPV all verified.");
  }
}

main().catch((err) => {
  console.error("M0 smoke test threw:", err);
  process.exit(1);
});
