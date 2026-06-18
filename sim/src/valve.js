// Local valve actuation relation.
//
// An auto valve's actuation circuit — metering port, bonnet chamber, pilot seat, bleed screw —
// is local to the valve: both its ends are the valve's own inlet and outlet, which the EPANET
// delivery solve has already produced. So the bonnet-chamber pressure is a small resistor
// divider over the port conductances, computed here directly — NOT spliced into the EPANET
// network (see docs/sim_state_model.md, "two scales of hydraulics").
//
// Steady state: inflow through the metering port equals outflow through the vent path.
//   (inlet - chamber) / rMeter = (chamber - outlet) / rVent
//   => chamber = (inlet*rVent + outlet*rMeter) / (rMeter + rVent)
// A low chamber pressure lets inlet pressure lift the diaphragm (valve opens); a chamber near
// inlet pressure seats it (valve closed).

import { VALVE_OPEN_BAR } from "./config.js";

// Port resistances (consistent arbitrary units; only ratios set the chamber pressure). A shut
// passage is high-but-finite, never infinite, so the divider is always well-defined and a
// clogged metering port resolves continuously into "chamber drains to outlet -> stuck open".
export const R_METER = 1; // metering port: inlet -> chamber (the deliberate restriction)
export const R_VENT_OPEN = 0.01; // pilot seat or bleed screw when open (far less restrictive than the metering orifice)
export const R_VENT_SHUT = 1e4; // any vent path when shut (tiny residual leak)

const parallelR = (...Rs) => 1 / Rs.reduce((g, R) => g + 1 / R, 0);

// Compute one auto valve's chamber pressure, main-seat open/closed, and metering-port flow,
// from its solved inlet/outlet pressures and its actuation controls.
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
  // The chamber vents through the pilot seat (lifted by the coil OR the manual solenoid bleed)
  // and/or the bonnet bleed screw. Open paths are low resistance; shut paths a residual leak.
  const pilotR = coilLive || solenoidBleed ? R_VENT_OPEN : R_VENT_SHUT;
  const bleedR = bonnetBleed ? R_VENT_OPEN : R_VENT_SHUT;
  const rVent = parallelR(pilotR, bleedR);

  const chamberBar = (inletBar * rVent + outletBar * rMeter) / (rMeter + rVent);
  const open = throttle > 0 && inletBar - chamberBar >= liftBar;
  const meterFlow = (inletBar - chamberBar) / rMeter;

  return { chamberBar, open, meterFlow };
}
