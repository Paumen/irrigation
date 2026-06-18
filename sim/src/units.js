import { M_PER_BAR, G } from "./config.js";

// K scales with diam^4, so it MUST use the same diameter declared on the TCV link.
export function kvToTcvK(kv_m3h, diam_mm) {
  if (kv_m3h <= 0) return 1e9;
  const d = diam_mm / 1000;
  const A = (Math.PI / 4) * d * d;
  const Q = kv_m3h / 3600;
  const h = M_PER_BAR;
  return (2 * G * h * A * A) / (Q * Q);
}
