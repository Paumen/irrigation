// Slice 1 — the local valve actuation relation (docs/sim_state_model.md).
// Proves the mechanism, including the clogged-metering-port failure, from the three primitives.

import { valveActuation, R_METER } from "../src/valve.js";
import { VALVE_OPEN_BAR } from "../src/config.js";

let failures = 0;
const check = (cond, msg) => {
  if (cond) console.log(`  ok: ${msg}`);
  else {
    console.error(`  FAIL: ${msg}`);
    failures++;
  }
};

console.log("CASE valve actuation — healthy mechanism");

// Inlet at working pressure, outlet a live downstream branch.
const IN = 3.0;
const OUT = 1.0;

// De-energized: chamber fills to ~inlet through the metering port -> diaphragm seats -> closed.
{
  const v = valveActuation({ inletBar: IN, outletBar: OUT, coilLive: false });
  check(!v.open, "de-energized valve is closed");
  check(Math.abs(v.chamberBar - IN) < 0.05, "de-energized chamber sits near inlet pressure");
}

// Energized: pilot vents the chamber toward outlet -> inlet overpressure lifts -> open.
{
  const v = valveActuation({ inletBar: IN, outletBar: OUT, coilLive: true });
  check(v.open, "energized valve opens");
  check(Math.abs(v.chamberBar - OUT) < 0.05, "energized chamber drains toward outlet");
  check(IN - v.chamberBar >= VALVE_OPEN_BAR, "lift overpressure clears the threshold");
}

// Manual solenoid bleed with no power -> opens (the quarter-turn that vents the pilot).
check(valveActuation({ inletBar: IN, outletBar: OUT, solenoidBleed: true }).open, "solenoid bleed opens without power");

// Bonnet bleed screw -> opens without power.
check(valveActuation({ inletBar: IN, outletBar: OUT, bonnetBleed: true }).open, "bonnet bleed opens without power");

// Flow-control screw shut overrides everything.
check(!valveActuation({ inletBar: IN, outletBar: OUT, coilLive: true, throttle: 0 }).open, "throttle shut keeps an energized valve closed");

// Below lift threshold: too little inlet overpressure to open even when energized.
check(!valveActuation({ inletBar: 1.2, outletBar: 1.0, coilLive: true }).open, "insufficient inlet overpressure stays closed");

console.log("\nCASE valve actuation — clogged metering port");

// Clog the metering port (R_meter -> very high). De-energized: the chamber can no longer refill
// from the inlet, so it drains toward outlet -> diaphragm stays lifted -> stuck open / weeping.
{
  const healthy = valveActuation({ inletBar: IN, outletBar: OUT, coilLive: false });
  const clogged = valveActuation({ inletBar: IN, outletBar: OUT, coilLive: false, rMeter: R_METER * 1e6 });
  check(!healthy.open, "baseline: de-energized valve closed");
  check(clogged.open, "clogged metering port: de-energized valve stuck OPEN (weeping)");
  check(clogged.chamberBar < healthy.chamberBar - 1.0, "clog collapses chamber pressure toward outlet");
}

if (failures) {
  console.error(`\n${failures} CHECK(S) FAILED`);
  process.exit(1);
}
console.log("\nALL CHECKS PASSED");
