// Thin wrapper over epanet-js. Mirrors the lifecycle locked in test/m0-smoke.mjs:
// load the wasm Workspace once (the slow part), then per solve write the INP, open a
// fresh Project, solveH, read results, and close it. The solver rebuilds the INP and
// calls solveInp every iteration; reusing the warm Workspace keeps that sub-ms.

import { Workspace, Project, NodeProperty, LinkProperty } from "epanet-js";
import { M_PER_BAR } from "./config.js";

export async function createHydraulics() {
  const ws = new Workspace();
  await ws.loadModule();
  return { ws, version: ws.version };
}

// Solve one INP and read back results for the requested ids.
// Returns { pressureBar, headM, demand, flow, status } keyed by EPANET id.
export function solveInp(hyd, inpText, { nodeIds, linkIds }) {
  const { ws } = hyd;
  ws.writeFile("net.inp", inpText);
  const p = new Project(ws);
  p.open("net.inp", "net.rpt", "net.bin");

  let solveWarning = null;
  try {
    p.solveH();
  } catch (err) {
    // Disconnected dead branches raise non-fatal warnings; results are still
    // readable. Capture and continue; a genuinely fatal open/read failure below
    // will throw on its own.
    solveWarning = err;
  }

  const pressureBar = {};
  const headM = {};
  const demand = {};
  const flow = {};
  const status = {};
  try {
    for (const id of nodeIds) {
      const idx = p.getNodeIndex(id);
      pressureBar[id] = p.getNodeValue(idx, NodeProperty.Pressure) / M_PER_BAR;
      headM[id] = p.getNodeValue(idx, NodeProperty.Head);
      demand[id] = p.getNodeValue(idx, NodeProperty.Demand);
    }
    for (const id of linkIds) {
      const idx = p.getLinkIndex(id);
      flow[id] = p.getLinkValue(idx, LinkProperty.Flow);
      status[id] = p.getLinkValue(idx, LinkProperty.Status);
    }
  } finally {
    p.close();
  }

  return { pressureBar, headM, demand, flow, status, solveWarning };
}
