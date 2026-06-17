import { SPRAY_CLAMP_BAR } from "./config.js";

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

// Effective nozzle/arc for an outlet: runtime controls (state.nozzle / state.arc, keyed by
// outlet id) override the baked-in catalog config (outlet.params). Returned object is what the
// table lookups below read, so changing a control rebuilds the affected head's law without a
// model rebuild.
export function effectiveOutletCfg(outlet, state = {}) {
  const nozzleOv = (state.nozzle || {})[outlet.id];
  const arcOv = (state.arc || {})[outlet.id];
  return {
    nozzle: nozzleOv != null ? nozzleOv : outlet.params.nozzle,
    arc: arcOv != null ? arcOv : outlet.params.arc,
  };
}

function tableRows(outlet, curves, cfg = effectiveOutletCfg(outlet)) {
  if (outlet.subkind === "rotor") {
    const size = String(cfg.nozzle).split(/\s+/)[0];
    const row = curves.nozzleI20.flow_m3h[size];
    if (!row) throw new Error(`outlets: no head.rotor/nozzle row for size "${size}"`);
    return { pressures: curves.nozzleI20.pressure_bar, row };
  }
  if (outlet.subkind === "spray") {
    const fam = String(cfg.nozzle);
    const arc = cfg.arc;
    const row = curves.nozzleMp.flow_m3h_by_arc[fam]?.[arc];
    if (!row) throw new Error(`outlets: no head.spray/nozzle row for "${fam}" arc ${arc}`);
    return { pressures: curves.nozzleMp.pressure_bar, row };
  }
  throw new Error(`outlets: unsupported outlet subkind "${outlet.subkind}"`);
}

export function outletDemandAt(outlet, p_bar, curves, cfg = effectiveOutletCfg(outlet), { noClamp = false } = {}) {
  const { pressures, row } = tableRows(outlet, curves, cfg);
  const lookup = outlet.subkind === "spray" && !noClamp ? Math.min(p_bar, SPRAY_CLAMP_BAR) : p_bar;
  return interp(pressures, row, lookup);
}

// Throw radius (m) for an outlet at its inlet pressure, from the catalog radius_m tables.
// Rotors read head.rotor/nozzle by nozzle size; sprays read head.spray/nozzle by model
// (MP radius is matched-precip, so independent of arc) at the PRS40-regulated pressure.
export function outletThrowAt(outlet, p_bar, curves, cfg = effectiveOutletCfg(outlet)) {
  if (outlet.subkind === "rotor") {
    const row = curves.nozzleI20.radius_m?.[String(cfg.nozzle).split(/\s+/)[0]];
    return row ? interp(curves.nozzleI20.pressure_bar, row, p_bar) : null;
  }
  if (outlet.subkind === "spray") {
    const row = curves.nozzleMp.radius_m?.[String(cfg.nozzle)];
    if (!row) return null;
    return interp(curves.nozzleMp.pressure_bar, row, Math.min(p_bar, SPRAY_CLAMP_BAR));
  }
  return null;
}

// Single-head application rate (mm/hr) = flow spread over the head's wetted sector.
// arc in degrees, throw in m, q in m3/h. 1 L over 1 m2 = 1 mm.
export function outletPrecipMmHr(q_m3h, arc_deg, throw_m) {
  if (!throw_m || !arc_deg || q_m3h <= 0) return null;
  const area = (arc_deg / 360) * Math.PI * throw_m * throw_m;
  return area > 0 ? (q_m3h * 1000) / area : null;
}

// Below pMin_bar the solver runs the outlet as an emitter; the table cannot extrapolate toward 0 bar.
export function outletTableMin(outlet, curves, cfg = effectiveOutletCfg(outlet)) {
  const { pressures, row } = tableRows(outlet, curves, cfg);
  for (let i = 0; i < row.length; i++) {
    if (row[i] != null) return { pMin_bar: pressures[i], qMin: row[i] };
  }
  return { pMin_bar: pressures[0], qMin: 0 };
}

// Catalog-constrained choices for a head's nozzle/arc controls (the UI reads this to offer only
// legal options). The body type (outlet.subkind) is fixed; it decides which set applies and how
// arc behaves: a rotor's arc is continuous and flow-independent (geometry only), a spray's arc is
// discrete and flow-determining (one tabulated flow row per arc), re-constrained per MP model.
export function validOutletOptions(outlet, curves) {
  if (outlet.subkind === "rotor") {
    return {
      nozzle: Object.keys(curves.nozzleI20.flow_m3h),
      arc: { kind: "continuous", min: 0, max: 360 },
    };
  }
  if (outlet.subkind === "spray") {
    const families = Object.keys(curves.nozzleMp.flow_m3h_by_arc);
    const arcByFamily = {};
    for (const f of families) {
      arcByFamily[f] = Object.keys(curves.nozzleMp.flow_m3h_by_arc[f]).map(Number).sort((a, b) => a - b);
    }
    return { nozzle: families, arcByFamily };
  }
  throw new Error(`outlets: unsupported outlet subkind "${outlet.subkind}"`);
}

// Fail-fast validation of runtime nozzle/arc overrides against the catalog, with a located error.
// Called once at the top of the solve (and exported so the UI can pre-validate a pending change).
export function validateOutletOverrides(model, state = {}) {
  const outlets = [...model.flowNodes.values()].filter((n) => n.role === "outlet");
  for (const o of outlets) {
    const cfg = effectiveOutletCfg(o, state);
    const opts = validOutletOptions(o, model.curves);
    if (o.subkind === "rotor") {
      const size = String(cfg.nozzle).split(/\s+/)[0];
      if (!opts.nozzle.includes(size)) {
        throw new Error(`${o.id}: nozzle "${cfg.nozzle}" invalid (valid: ${opts.nozzle.join(", ")})`);
      }
      const arc = Number(cfg.arc);
      if (!Number.isFinite(arc) || arc <= opts.arc.min || arc > opts.arc.max) {
        throw new Error(`${o.id}: arc ${cfg.arc} invalid (valid: >${opts.arc.min}..${opts.arc.max})`);
      }
    } else if (o.subkind === "spray") {
      const fam = String(cfg.nozzle);
      if (!opts.nozzle.includes(fam)) {
        throw new Error(`${o.id}: nozzle "${fam}" invalid (valid: ${opts.nozzle.join(", ")})`);
      }
      const arcs = opts.arcByFamily[fam];
      if (!arcs.includes(Number(cfg.arc))) {
        throw new Error(`${o.id}: arc ${cfg.arc} invalid for family ${fam} (valid: ${arcs.join(", ")})`);
      }
    }
  }
}
