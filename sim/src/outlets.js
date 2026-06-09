// Pressure -> flow laws for the three outlet types. Each outlet is solved as a
// pressure-driven demand: the solver feeds the previous iteration's inlet pressure
// here and gets the discharge to set as that node's EPANET demand.

import { M_PER_BAR, G, SPRAY_CLAMP_BAR } from "./config.js";

// Linear interpolation over a catalog row, clamped flat past either end, skipping
// null entries (the MP1000 row has no value at its lowest pressure).
export function interp(xs, ys, x) {
  const pts = [];
  for (let i = 0; i < xs.length; i++) {
    if (ys[i] != null) pts.push([xs[i], ys[i]]);
  }
  if (pts.length === 0) return 0;
  if (x <= pts[0][0]) return pts[0][1];
  const last = pts[pts.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return last[1];
}

// outlet = { subkind, params:{nozzle, arc, bore_mm, cd, …} }; p_bar = inlet pressure.
export function outletDemandAt(outlet, p_bar, curves) {
  if (!(p_bar > 0)) return 0;
  const { subkind, params } = outlet;

  if (subkind === "rotor") {
    // I-20: unregulated, follows the nozzle_i20 table for the fitted size.
    const match = String(params.nozzle ?? "").match(/[\d.]+/);
    if (!match) throw new Error(`outlets: no nozzle size in "${params.nozzle}"`);
    const size = match[0];
    const row = curves.nozzleI20.flow_m3h[size];
    if (!row) throw new Error(`outlets: no nozzle_i20 row for "${params.nozzle}"`);
    return interp(curves.nozzleI20.pressure_bar, row, p_bar);
  }

  if (subkind === "spray") {
    // MP rotator: built-in regulator clamps the nozzle inlet to <= 2.76 bar, then
    // read the raw nozzle table for the fitted nozzle + arc.
    const pLook = Math.min(p_bar, SPRAY_CLAMP_BAR);
    const arcRow = curves.nozzleMp.flow_m3h_by_arc[params.nozzle];
    if (!arcRow) throw new Error(`outlets: no nozzle_mp nozzle "${params.nozzle}"`);
    const row = arcRow[String(params.arc)];
    if (!row) throw new Error(`outlets: no nozzle_mp arc ${params.arc} for ${params.nozzle}`);
    return interp(curves.nozzleMp.pressure_bar, row, pLook);
  }

  if (subkind === "stream") {
    // Open-orifice hand nozzle: q = Cd * A * sqrt(2 g h).
    const h = p_bar * M_PER_BAR; // m of head
    const A = (Math.PI / 4) * (params.bore_mm / 1000) ** 2; // m^2
    const q_m3s = params.cd * A * Math.sqrt(2 * G * h);
    return q_m3s * 3600;
  }

  throw new Error(`outlets: unknown outlet subkind "${subkind}"`);
}

// An open-orifice stream nozzle is a true EPANET emitter: q = C * h^0.5 with h in
// metres of head (the default emitter exponent). Modelling it as an emitter lets EPANET
// solve its discharge simultaneously with the network, which is essential because a
// free hose end settles at near-zero pressure where the outer demand fixed point (q ∝
// √p) turns singular and oscillates. Returns C in EPANET CMH/m units so that
// q[m³/h] = C * sqrt(head_m); evaluating at head = p_bar*M_PER_BAR reproduces the
// orifice law above exactly.
export function streamEmitterCoeff(params) {
  const A = (Math.PI / 4) * (params.bore_mm / 1000) ** 2; // m^2
  return params.cd * A * Math.sqrt(2 * G) * 3600;
}
