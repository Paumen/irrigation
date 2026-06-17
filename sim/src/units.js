import { M_PER_BAR, G } from "./config.js";

// EPANET TCV minor-loss coefficient K from a valve's Kv rating, at the Kv reference
// point (Q=Kv, h=M_PER_BAR). K scales with A^2 ~ diam^4, so it MUST be computed from
// the same diameter declared on the TCV link.
export function kvToTcvK(kv_m3h, diam_mm) {
  if (kv_m3h <= 0) return 1e9; // a non-positive Kv is an effectively shut/invalid valve
  const d = diam_mm / 1000; // m
  const A = (Math.PI / 4) * d * d; // m^2
  const Q = kv_m3h / 3600; // m^3/s at the reference point
  const h = M_PER_BAR; // m, the 1-bar reference drop
  return (2 * G * h * A * A) / (Q * Q);
}
