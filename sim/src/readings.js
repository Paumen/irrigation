// Readings — derived views over the solved state. Pure functions; nothing is stored.
// Each adds something to the raw primitive (a threshold, a location, a domain term).
//
// (Cut-over note: these read the current solveSteady output. When the solve outputs are reduced
// to the `live`/`pressure`/`flow` primitives, only the accessors below change, not their meaning.)

import { PRESSURISED_BAR } from "./config.js";

const epOf = (id) => id.replace(/\./g, "_");
const flow = (hyd, id) => hyd.demands.get(id) || 0;

// EPANET reports gauge pressure on junctions only; pipes/pumps/valves (link-role nodes) carry no
// node pressure, so a reachable link is pressurised whenever the pump is driving the branch.
const LINK_ROLES = new Set(["pipe", "pump", "valve-auto", "valve-manual"]);

// Fed (reachable) and either driven (link node) or above the working-pressure floor (junction).
export const pressurised = (model, hyd, id) => {
  const node = model.flowNodes.get(id);
  if (!node) throw new Error(`pressurised: no flow node "${id}"`); // fail loud, never silently return false
  if (!hyd.reachable.has(id)) return false;
  if (LINK_ROLES.has(node.role)) return !!hyd.pumpOn;
  const p = hyd.pressureBar[epOf(id)];
  return Number.isFinite(p) && p >= PRESSURISED_BAR;
};

// The pump's suction side holds water — the nearest junction/reservoir upstream of the pump is
// fed and carries pressure. Traverse past link nodes (pipes/hoses), which carry no node pressure.
export const primed = (model, hyd) => {
  const pump = [...model.flowNodes.values()].find((n) => n.role === "pump");
  if (!pump) throw new Error("primed: no pump node");
  const parentOf = (id) => [...model.flowNodes.values()].find((n) => n.to.includes(id));
  let node = parentOf(pump.id);
  if (!node) throw new Error("primed: pump has no inlet node");
  while (LINK_ROLES.has(node.role)) {
    node = parentOf(node.id);
    if (!node) throw new Error("primed: no junction/reservoir upstream of the pump");
  }
  return hyd.reachable.has(node.id) && Number.isFinite(hyd.pressureBar[epOf(node.id)]);
};

// The valve passes flow — the solver's actuation result.
export const open = (hyd, id) => !!hyd.valveOpen[id];

// Water actually leaves the head.
export const watering = (hyd, id) => flow(hyd, id) > 0;

// Pressurised but not delivering — fed yet shut/blocked at the head (e.g. below its table minimum).
export const starved = (model, hyd, id) => pressurised(model, hyd, id) && flow(hyd, id) <= 0;
