// Pressure -> flow laws for the three outlet types. The catalog tables give discharge as a
// function of inlet pressure; below the lowest tabulated point the demand law is ill-defined,
// so the solver swaps those outlets to EPANET emitters using outletTableMin / a sqrt law.

import { M_PER_BAR, G, SPRAY_CLAMP_BAR } from "./config.js";

// Linear interpolation of ys over xs at x, clamped flat past either end, skipping null ys
// (some MP rows have no value at their lowest pressure).
export function interp(xs, ys, x) {
  const pts = [];
  for (let i = 0; i < xs.length; i++) {
    if (ys[i] == null) continue;
    pts.push([xs[i], ys[i]]);
  }
  if (pts.length === 0) return 0;
  if (x <= pts[0][0]) return pts[0][1];
  if (x >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
}

// The pressure row + flow row for a table outlet (rotor or spray).
function tableRows(outlet, curves) {
  if (outlet.subkind === "rotor") {
    const size = String(outlet.params.nozzle).split(/\s+/)[0]; // "4.0 blue" -> "4.0"
    const row = curves.nozzleI20.flow_m3h[size];
    if (!row) throw new Error(`outlets: no nozzle_i20 row for size "${size}"`);
    return { pressures: curves.nozzleI20.pressure_bar, row };
  }
  if (outlet.subkind === "spray") {
    const fam = String(outlet.params.nozzle);
    const arc = outlet.params.arc;
    const row = curves.nozzleMp.flow_m3h_by_arc[fam]?.[arc];
    if (!row) throw new Error(`outlets: no nozzle_mp row for "${fam}" arc ${arc}`);
    return { pressures: curves.nozzleMp.pressure_bar, row };
  }
  return null;
}

// Discharge (m3/h) at inlet pressure p_bar.
export function outletDemandAt(outlet, p_bar, curves, { noClamp = false } = {}) {
  if (outlet.subkind === "stream") {
    const C = streamEmitterCoeff(outlet.params);
    const h = Math.max(p_bar, 0) * M_PER_BAR;
    return C * Math.sqrt(h);
  }
  const { pressures, row } = tableRows(outlet, curves);
  // MP rotators are pressure-regulated: clamp the table lookup to the regulator setpoint.
  const lookup = outlet.subkind === "spray" && !noClamp ? Math.min(p_bar, SPRAY_CLAMP_BAR) : p_bar;
  return interp(pressures, row, lookup);
}

// Lowest tabulated point {pMin_bar, qMin}. Below it the solver runs the outlet as an emitter
// whose flow fades to zero with pressure (the table can't extrapolate sanely toward 0 bar).
export function outletTableMin(outlet, curves) {
  if (outlet.subkind === "stream") return null; // always an emitter
  const { pressures, row } = tableRows(outlet, curves);
  for (let i = 0; i < row.length; i++) {
    if (row[i] != null) return { pMin_bar: pressures[i], qMin: row[i] };
  }
  return { pMin_bar: pressures[0], qMin: 0 };
}

// EPANET emitter coefficient C (CMH per sqrt(m)) for the stream open-orifice, so that
// q_m3h = C*sqrt(head_m) reproduces Q = Cd*A*sqrt(2*g*h).
export function streamEmitterCoeff(params) {
  const bore = params.bore_mm;
  if (bore == null || bore <= 0) throw new Error("streamEmitterCoeff: missing or invalid bore_mm");
  const d = bore / 1000; // m
  const A = (Math.PI / 4) * d * d; // m^2
  const cd = params.cd ?? 0.62;
  return 3600 * cd * A * Math.sqrt(2 * G); // *sqrt(h_m) -> m3/h
}
