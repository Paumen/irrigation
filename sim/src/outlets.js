import { M_PER_BAR, G, SPRAY_CLAMP_BAR } from "./config.js";

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

function tableRows(outlet, curves) {
  if (outlet.subkind === "rotor") {
    const size = String(outlet.params.nozzle).split(/\s+/)[0];
    const row = curves.nozzleI20.flow_m3h[size];
    if (!row) throw new Error(`outlets: no head.rotor/nozzle row for size "${size}"`);
    return { pressures: curves.nozzleI20.pressure_bar, row };
  }
  if (outlet.subkind === "spray") {
    const fam = String(outlet.params.nozzle);
    const arc = outlet.params.arc;
    const row = curves.nozzleMp.flow_m3h_by_arc[fam]?.[arc];
    if (!row) throw new Error(`outlets: no head.spray/nozzle row for "${fam}" arc ${arc}`);
    return { pressures: curves.nozzleMp.pressure_bar, row };
  }
  return null;
}

export function outletDemandAt(outlet, p_bar, curves, { noClamp = false } = {}) {
  if (outlet.subkind === "stream") {
    const C = streamEmitterCoeff(outlet.params);
    const h = Math.max(p_bar, 0) * M_PER_BAR;
    return C * Math.sqrt(h);
  }
  const { pressures, row } = tableRows(outlet, curves);
  const lookup = outlet.subkind === "spray" && !noClamp ? Math.min(p_bar, SPRAY_CLAMP_BAR) : p_bar;
  return interp(pressures, row, lookup);
}

// Throw radius (m) for a rotor outlet at its inlet pressure, from the catalog radius_m table.
// Sprays/streams have no modeled radius, so they return null.
export function outletThrowAt(outlet, p_bar, curves) {
  if (outlet.subkind !== "rotor") return null;
  const radii = curves.nozzleI20.radius_m;
  if (!radii) return null;
  const size = String(outlet.params.nozzle).split(/\s+/)[0];
  const row = radii[size];
  if (!row) return null;
  return interp(curves.nozzleI20.pressure_bar, row, p_bar);
}

// Below pMin_bar the solver runs the outlet as an emitter; the table cannot extrapolate toward 0 bar.
export function outletTableMin(outlet, curves) {
  if (outlet.subkind === "stream") return null;
  const { pressures, row } = tableRows(outlet, curves);
  for (let i = 0; i < row.length; i++) {
    if (row[i] != null) return { pMin_bar: pressures[i], qMin: row[i] };
  }
  return { pMin_bar: pressures[0], qMin: 0 };
}

// C such that q_m3h = C*sqrt(head_m) reproduces Q = Cd*A*sqrt(2*g*h).
export function streamEmitterCoeff(params) {
  const bore = params.bore_mm;
  if (bore == null || bore <= 0) throw new Error("streamEmitterCoeff: missing or invalid bore_mm");
  const d = bore / 1000;
  const A = (Math.PI / 4) * d * d;
  const cd = params.cd ?? 0.62;
  return 3600 * cd * A * Math.sqrt(2 * G);
}
