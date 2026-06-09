// Render an EPANET Topology to INP text. Section format mirrors test/m0-smoke.mjs,
// which locked the dialect epanet-js accepts. Numbers are written in fixed notation
// (never scientific — the parser dislikes "1.5e-3").

import { EPANET_TRIALS, EPANET_ACCURACY } from "./config.js";

function num(x) {
  if (!Number.isFinite(x)) throw new Error(`inp: non-finite number ${x}`);
  if (Number.isInteger(x)) return String(x);
  // up to 6 decimals, trailing zeros trimmed, no exponent
  return x.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

export function toInp(topo) {
  const L = [];
  L.push("[TITLE]");
  L.push("irrigation sim");
  L.push("");

  L.push("[JUNCTIONS]");
  L.push(";ID\tElev\tDemand");
  for (const j of topo.junctions) {
    L.push(` ${j.id}\t${num(j.elev)}\t${num(j.demand)}`);
  }
  L.push("");

  L.push("[RESERVOIRS]");
  L.push(";ID\tHead");
  for (const r of topo.reservoirs) {
    L.push(` ${r.id}\t${num(r.head)}`);
  }
  L.push("");

  L.push("[PIPES]");
  L.push(";ID\tNode1\tNode2\tLength\tDiam\tRough\tMloss\tStatus");
  for (const p of topo.pipes) {
    L.push(
      ` ${p.id}\t${p.n1}\t${p.n2}\t${num(p.length_m)}\t${num(p.diam_mm)}\t${num(p.rough_mm)}\t${num(p.mloss)}\tOpen`,
    );
  }
  L.push("");

  L.push("[PUMPS]");
  L.push(";ID\tNode1\tNode2\tParams");
  for (const p of topo.pumps) {
    L.push(` ${p.id}\t${p.n1}\t${p.n2}\tHEAD ${p.curveId}`);
  }
  L.push("");

  L.push("[VALVES]");
  L.push(";ID\tNode1\tNode2\tDiam\tType\tSetting\tMloss");
  for (const v of topo.valves) {
    const setting = v.type === "GPV" ? v.setting : num(v.setting);
    L.push(` ${v.id}\t${v.n1}\t${v.n2}\t${num(v.diam_mm)}\t${v.type}\t${setting}\t${num(v.mloss)}`);
  }
  L.push("");

  L.push("[CURVES]");
  L.push(";ID\tX\tY");
  for (const [id, pts] of Object.entries(topo.curves)) {
    for (const [x, y] of pts) {
      L.push(` ${id}\t${num(x)}\t${num(y)}`);
    }
  }
  L.push("");

  L.push("[STATUS]");
  L.push(";ID\tStatus");
  for (const id of topo.statusClosed) {
    L.push(` ${id}\tCLOSED`);
  }
  L.push("");

  L.push("[OPTIONS]");
  L.push(" UNITS\tCMH");
  L.push(" HEADLOSS\tD-W");
  L.push(` TRIALS\t${EPANET_TRIALS}`);
  L.push(` ACCURACY\t${EPANET_ACCURACY}`);
  L.push("");

  L.push("[REPORT]");
  L.push(" STATUS\tNO");
  L.push(" SUMMARY\tNO");
  L.push("");

  L.push("[END]");
  L.push("");
  return L.join("\n");
}
