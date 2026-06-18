// Chamber pressure is a local resistor divider, NOT spliced into the EPANET network.

import { VALVE_OPEN_BAR } from "./config.js";

// Shut passages must stay finite (never Infinity) or the divider is undefined.
export const R_METER = 1;
export const R_VENT_OPEN = 0.01;
export const R_VENT_SHUT = 1e4;

const parallelR = (...Rs) => 1 / Rs.reduce((g, R) => g + 1 / R, 0);

export function valveActuation({
  inletBar,
  outletBar,
  coilLive = false,
  solenoidBleed = false,
  bonnetBleed = false,
  throttle = 1,
  rMeter = R_METER,
  liftBar = VALVE_OPEN_BAR,
}) {
  const pilotR = coilLive || solenoidBleed ? R_VENT_OPEN : R_VENT_SHUT;
  const bleedR = bonnetBleed ? R_VENT_OPEN : R_VENT_SHUT;
  const rVent = parallelR(pilotR, bleedR);

  const chamberBar = (inletBar * rVent + outletBar * rMeter) / (rMeter + rVent);

  // Test conductances, NOT outlet pressure: outlet is garbage when the valve is shut.
  const vented = throttle > 0 && rVent < rMeter;
  const open = vented && inletBar >= liftBar;
  const meterFlow = (inletBar - chamberBar) / rMeter;

  return { chamberBar, vented, open, meterFlow };
}
