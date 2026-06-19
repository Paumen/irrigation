export const M_PER_BAR = 10.197;

export const ALPHA = 0.5;
export const ALPHA_MIN = 0.05;
// Gate emitters off below this; EPANET emitters suck water IN at negative p.
export const EMITTER_GATE_BAR = 0.02;
export const P_TOL_BAR = 1e-3;
export const Q_TOL_M3H = 1e-4;
export const MAX_ITERS = 60;
export const STABLE_ITERS = 2;

// Open/stay asymmetry is physical; do not collapse the two thresholds.
export const VALVE_OPEN_BAR = 1.5;
export const VALVE_STAY_BAR = 0.3;
export const VALVE_FREEZE_TAIL = 12;

export const SPRAY_CLAMP_BAR = 2.76;

// Must stay below VALVE_OPEN_BAR so a dead-headed reachable branch reads pressurised.
export const PRESSURISED_BAR = 0.1;

// Must be > 0 to keep 1/t² loss scaling finite.
export const THROTTLE_MIN = 0.05;

export const SWING_LEN_M = 0.3;

export const G = 9.81;

export const EPANET_TRIALS = 200;
export const EPANET_ACCURACY = 0.001;

export const CONNECTOR_LEN_M = 0.1;
export const CONNECTOR_DIAM_MM = 25;
export const DEFAULT_ROUGHNESS_MM = 0.0015;

// diam_mm MUST match the diameter declared on the TCV link (K scales with diam^4).
export function kvToTcvK(kv_m3h, diam_mm) {
  if (kv_m3h <= 0) return 1e9;
  const d = diam_mm / 1000;
  const A = (Math.PI / 4) * d * d;
  const Q = kv_m3h / 3600;
  const h = M_PER_BAR;
  return (2 * G * h * A * A) / (Q * Q);
}
