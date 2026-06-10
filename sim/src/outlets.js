import { M_PER_BAR, G, SPRAY_CLAMP_BAR } from "./config.js";

// Linear interpolation over a catalog row, clamped flat past either end, skipping
// null entries (some rows have no value at their lowest pressure).
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

// Below the lowest tabulated point, discharge must keep falling as orifice-like √p,
// not hold the lowest row flat (else a starved head dumps full min flow near zero p).
function tableFlow(pressures, row, p) {
  let i0 = 0;
  while (i0 < pressures.length && row[i0] == null) i0++;
  if (i0 >= pressures.length) return 0;
  const pMin = pressures[i0];
  if (p < pMin) return row[i0] * Math.sqrt(p / pMin);
  return interp(pressures, row, p);
}

// opts.noClamp drops the spray head's regulator clamp (regulator broken).
export function outletDemandAt(outlet, p_bar, curves, { noClamp = false } = {}) {
  if (!(p_bar > 0)) return 0;
  const { subkind, params } = outlet;

  if (subkind === "rotor") {
    const match = String(params.nozzle ?? "").match(/[\d.]+/);
    if (!match) throw new Error(`outlets: no nozzle size in "${params.nozzle}"`);
    const size = match[0];
    const row = curves.nozzleI20.flow_m3h[size];
    if (!row) throw new Error(`outlets: no nozzle_i20 row for "${params.nozzle}"`);
    return tableFlow(curves.nozzleI20.pressure_bar, row, p_bar);
  }

  if (subkind === "spray") {
    // Regulator clamps the nozzle inlet before reading the table.
    const pLook = noClamp ? p_bar : Math.min(p_bar, SPRAY_CLAMP_BAR);
    const arcRow = curves.nozzleMp.flow_m3h_by_arc[params.nozzle];
    if (!arcRow) throw new Error(`outlets: no nozzle_mp nozzle "${params.nozzle}"`);
    const row = arcRow[String(params.arc)];
    if (!row) throw new Error(`outlets: no nozzle_mp arc ${params.arc} for ${params.nozzle}`);
    return tableFlow(curves.nozzleMp.pressure_bar, row, pLook);
  }

  if (subkind === "stream") {
    const h = p_bar * M_PER_BAR; // m of head
    const A = (Math.PI / 4) * (params.bore_mm / 1000) ** 2; // m^2
    const q_m3s = params.cd * A * Math.sqrt(2 * G * h);
    return q_m3s * 3600;
  }

  throw new Error(`outlets: unknown outlet subkind "${subkind}"`);
}

// Lowest tabulated point of a table outlet; below it the law is the emitter
// qMin*sqrt(p/pMin). The solver swaps to an EPANET emitter there because the demand
// fixed point turns singular as p -> 0.
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

// Returns emitter C in EPANET CMH/m units (exponent 0.5) so q[m³/h] = C*sqrt(head_m),
// matching the orifice law at head = p_bar*M_PER_BAR. Modelled as an emitter so EPANET
// solves the free-hose-end discharge, where the outer demand fixed point turns singular.
export function streamEmitterCoeff(params) {
  if (!params || !(params.bore_mm > 0) || !(params.cd > 0)) {
    throw new Error(
      `outlets: stream nozzle needs positive bore_mm and cd (got bore_mm=${params?.bore_mm}, cd=${params?.cd})`,
    );
  }
  const A = (Math.PI / 4) * (params.bore_mm / 1000) ** 2; // m^2
  return params.cd * A * Math.sqrt(2 * G) * 3600;
}
