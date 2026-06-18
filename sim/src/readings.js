import { PRESSURISED_BAR } from "./config.js";
import { epOf, isLinkNode, nodeByRole } from "./model.js";

const flow = (hyd, id) => hyd.demands.get(id) || 0;

// EPANET reports pressure on junctions only; link-role nodes carry none, so a reachable
// link counts as pressurised whenever the pump is driving the branch.
export const pressurised = (model, hyd, id) => {
  const node = model.flowNodes.get(id);
  if (!node) throw new Error(`pressurised: no flow node "${id}"`);
  if (!hyd.reachable.has(id)) return false;
  if (isLinkNode(node)) return !!hyd.pumpOn;
  const p = hyd.pressureBar[epOf(id)];
  return Number.isFinite(p) && p >= PRESSURISED_BAR;
};

// Traverse past link nodes (which carry no node pressure) to the nearest junction/reservoir
// upstream of the pump.
export const primed = (model, hyd) => {
  const pump = nodeByRole(model, "pump");
  if (!pump) throw new Error("primed: no pump node");
  const parentOf = (id) => [...model.flowNodes.values()].find((n) => n.to.includes(id));
  let node = parentOf(pump.id);
  if (!node) throw new Error("primed: pump has no inlet node");
  while (isLinkNode(node)) {
    node = parentOf(node.id);
    if (!node) throw new Error("primed: no junction/reservoir upstream of the pump");
  }
  return hyd.reachable.has(node.id) && Number.isFinite(hyd.pressureBar[epOf(node.id)]);
};

export const open = (hyd, id) => !!hyd.valveOpen[id];

export const watering = (hyd, id) => flow(hyd, id) > 0;

export const starved = (model, hyd, id) => pressurised(model, hyd, id) && flow(hyd, id) <= 0;
