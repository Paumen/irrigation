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
  if (!hyd.reachable.has(id)) return false;
  if (LINK_ROLES.has(model.flowNodes.get(id)?.role)) return !!hyd.pumpOn;
  const p = hyd.pressureBar[epOf(id)];
  return Number.isFinite(p) && p >= PRESSURISED_BAR;
};

// The valve passes flow — the solver's actuation result.
export const open = (hyd, id) => !!hyd.valveOpen[id];

// Water actually leaves the head.
export const watering = (hyd, id) => flow(hyd, id) > 0;

// Pressurised but not delivering — fed yet shut/blocked at the head (e.g. below its table minimum).
export const starved = (model, hyd, id) => pressurised(model, hyd, id) && flow(hyd, id) <= 0;
