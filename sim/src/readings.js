// Readings — derived views over the solved state. Pure functions; nothing is stored.
// Each adds something to the raw primitive (a threshold, a location, a domain term).
//
// (Cut-over note: these read the current solveSteady output. When the solve outputs are reduced
// to the `live`/`pressure`/`flow` primitives, only the accessors below change, not their meaning.)

import { PRESSURISED_BAR } from "./config.js";

const epOf = (id) => id.replace(/\./g, "_");
const pressureBar = (hyd, id) => hyd.pressureBar[epOf(id)];
const flow = (hyd, id) => hyd.demands.get(id) || 0;

// Fed (reachable) and gauge pressure clears the working floor.
export const pressurised = (hyd, id) =>
  hyd.reachable.has(id) && Number.isFinite(pressureBar(hyd, id)) && pressureBar(hyd, id) >= PRESSURISED_BAR;

// The valve passes flow — the solver's actuation result.
export const open = (hyd, id) => !!hyd.valveOpen[id];

// Water actually leaves the head.
export const watering = (hyd, id) => flow(hyd, id) > 0;

// Pressurised but not delivering — fed yet shut/blocked at the head (e.g. below its table minimum).
export const starved = (hyd, id) => pressurised(hyd, id) && flow(hyd, id) <= 0;
