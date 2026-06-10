// Load the wasm Workspace once (the slow part); reuse it across every solveInp call.
import { Workspace, Project, NodeProperty, LinkProperty } from "epanet-js";
import { M_PER_BAR } from "./config.js";

export async function createHydraulics() {
  const ws = new Workspace();
  await ws.loadModule();
  return { ws, version: ws.version };
}

export function solveInp(hyd, inpText, { nodeIds, linkIds }) {
  const { ws } = hyd;
  ws.writeFile("net.inp", inpText);
  const p = new Project(ws);
  p.open("net.inp", "net.rpt", "net.bin");

  let solveWarning = null;
  try {
    p.solveH();
  } catch (err) {
    // Dead branches raise non-fatal warnings; results stay readable, so continue.
    // A truly fatal open/read failure throws below.
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
