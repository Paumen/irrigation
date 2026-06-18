// Valve chamber pressure is computed here as a local resistor divider, NOT spliced into the
// EPANET network. chamber = (inlet*rVent + outlet*rMeter) / (rMeter + rVent).

import { VALVE_OPEN_BAR } from "./config.js";

// Only resistance ratios matter. Shut passages stay high-but-finite (never infinite) so the
// divider is always defined and a clogged metering port resolves continuously into stuck-open.
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

  // Test conductances (rVent < rMeter), NOT outlet pressure: stays valid when the valve is shut
  // and the outlet is isolated/garbage.
  const vented = throttle > 0 && rVent < rMeter;
  const open = vented && inletBar >= liftBar;
  const meterFlow = (inletBar - chamberBar) / rMeter;

  return { chamberBar, vented, open, meterFlow };
}
