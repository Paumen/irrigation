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

// Catalog tables start well above zero (rotors at 1.7 bar, sprays at 1.72). Below the
// lowest tabulated point a nozzle's discharge must keep falling with pressure (an
// orifice-like √p), not hold the lowest row flat — otherwise a starved head would
// "discharge" its full minimum-table flow at near-zero pressure.
function tableFlow(pressures, row, p) {
  let i0 = 0;
  while (i0 < pressures.length && row[i0] == null) i0++;
  if (i0 >= pressures.length) return 0;
  const pMin = pressures[i0];
  if (p < pMin) return row[i0] * Math.sqrt(p / pMin);
  return interp(pressures, row, p);
}

// outlet = { subkind, params:{nozzle, arc, bore_mm, cd, …} }; p_bar = inlet pressure.
// opts.noClamp drops the spray head's regulator clamp (M8: regulator broken).
export function outletDemandAt(outlet, p_bar, curves, { noClamp = false } = {}) {
  if (!(p_bar > 0)) return 0;
  const { subkind, params } = outlet;

  if (subkind === "rotor") {
    // I-20: unregulated, follows the nozzle_i20 table for the fitted size.
    const match = String(params.nozzle ?? "").match(/[\d.]+/);
    if (!match) throw new Error(`outlets: no nozzle size in "${params.nozzle}"`);
    const size = match[0];
    const row = curves.nozzleI20.flow_m3h[size];
    if (!row) throw new Error(`outlets: no nozzle_i20 row for "${params.nozzle}"`);
    return tableFlow(curves.nozzleI20.pressure_bar, row, p_bar);
  }

  if (subkind === "spray") {
    // MP rotator: built-in regulator clamps the nozzle inlet to <= 2.76 bar, then
    // read the raw nozzle table for the fitted nozzle + arc.
    const pLook = noClamp ? p_bar : Math.min(p_bar, SPRAY_CLAMP_BAR);
    const arcRow = curves.nozzleMp.flow_m3h_by_arc[params.nozzle];
    if (!arcRow) throw new Error(`outlets: no nozzle_mp nozzle "${params.nozzle}"`);
    const row = arcRow[String(params.arc)];
    if (!row) throw new Error(`outlets: no nozzle_mp arc ${params.arc} for ${params.nozzle}`);
    return tableFlow(curves.nozzleMp.pressure_bar, row, pLook);
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

// The lowest tabulated point of a table outlet's law: below pMin_bar the discharge
// is exactly qMin*sqrt(p/pMin) (see tableFlow) — an emitter law. The solver swaps a
// starved outlet to an EPANET emitter there, because the demand fixed point turns
// singular as p -> 0 (dq/dp -> infinity) and no fixed damping converges.
export function outletTableMin(outlet, curves) {
  const { subkind, params } = outlet;
  let pressures, row;
  if (subkind === "rotor") {
    const size = String(params.nozzle ?? "").match(/[\d.]+/)?.[0];
    pressures = curves.nozzleI20.pressure_bar;
    row = curves.nozzleI20.flow_m3h[size];
  } else if (subkind === "spray") {
    pressures = curves.nozzleMp.pressure_bar;
    row = curves.nozzleMp.flow_m3h_by_arc[params.nozzle]?.[String(params.arc)];
  } else {
    return null; // stream nozzles are full-range emitters already
  }
  if (!row) throw new Error(`outlets: no catalog row for ${outlet.id ?? subkind}`);
  let i0 = 0;
  while (i0 < pressures.length && row[i0] == null) i0++;
  if (i0 >= pressures.length) return null;
  return { pMin_bar: pressures[i0], qMin: row[i0] };
}

// An open-orifice stream nozzle is a true EPANET emitter: q = C * h^0.5 with h in
// metres of head (the default emitter exponent). Modelling it as an emitter lets EPANET
// solve its discharge simultaneously with the network, which is essential because a
// free hose end settles at near-zero pressure where the outer demand fixed point (q ∝
// √p) turns singular and oscillates. Returns C in EPANET CMH/m units so that
// q[m³/h] = C * sqrt(head_m); evaluating at head = p_bar*M_PER_BAR reproduces the
// orifice law above exactly.
export function streamEmitterCoeff(params) {
  if (!params || !(params.bore_mm > 0) || !(params.cd > 0)) {
    throw new Error(
      `outlets: stream nozzle needs positive bore_mm and cd (got bore_mm=${params?.bore_mm}, cd=${params?.cd})`,
    );
  }
  const A = (Math.PI / 4) * (params.bore_mm / 1000) ** 2; // m^2
  return params.cd * A * Math.sqrt(2 * G) * 3600;
}
