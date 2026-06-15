// Strips a leading prefix and a pure-numeric suffix only; `coupling_bm1c32` keeps its suffix.
export function typeOf(id) {
  return id.replace(/^[A-Z]+[0-9]+_/, "").replace(/_[0-9]+$/, "");
}

export function roleOf(type) {
  if (type === "source.well") return "reservoir";
  if (type === "pump.jet") return "pump";
  if (type === "valve.auto") return "valve-auto";
  if (type === "valve.manual") return "valve-manual";
  if (type === "valve.foot") return "junction";
  if (type === "fitting.cap") return "cap";
  if (type.startsWith("head.")) return "outlet";
  // swing joints model as short pipes carrying their own k_minor
  if (type === "fitting.sj34x12" || type === "fitting.sj34x34") return "pipe";
  if (type.startsWith("hose.")) return "pipe";
  if (type.startsWith("fitting.")) return "junction";
  throw new Error(`model: unknown water component type "${type}"`);
}

function subkindOf(type) {
  if (type === "head.rotor") return "rotor";
  if (type === "head.spray") return "spray";
  if (type === "head.stream") return "stream";
  if (type === "fitting.sj34x12" || type === "fitting.sj34x34") return "swing";
  if (type.startsWith("hose.")) return "hose";
  return type;
}

// Override hook for pump brand mismatches; empty because catalog keys already match the YAML `model`.
const PUMP_CURVE_ALIAS = {};

function flattenItems(items, out = {}) {
  if (!items || typeof items !== "object") return out;
  for (const [key, val] of Object.entries(items)) {
    if (key.includes(".")) out[key] = val;
    if (val && typeof val === "object" && val.items) flattenItems(val.items, out);
  }
  return out;
}

function paramsOf(compDef, instance, defaults) {
  const params = {};
  // item_defaults (keyed by kind) are lowest precedence: compDef and instance win.
  for (const [k, v] of Object.entries(defaults || {})) {
    if (v !== null && typeof v === "object") continue;
    params[k] = v;
  }
  for (const [k, v] of Object.entries(compDef || {})) {
    if (k === "ports" || k === "items") continue;
    if (v !== null && typeof v === "object") continue;
    params[k] = v;
  }
  for (const [k, v] of Object.entries(instance || {})) {
    if (k === "to" || k === "h_m") continue;
    params[k] = v;
  }
  if (params.k != null) params.k_minor = params.k;
  if (params.l_m != null) params.length_m = params.l_m;
  return params;
}

function downstreamOf(to) {
  const refs = [];
  if (Array.isArray(to)) refs.push(...to);
  else if (to && typeof to === "object") {
    for (const v of Object.values(to)) refs.push(...(Array.isArray(v) ? v : [v]));
  }
  const ids = [];
  for (const r of refs) {
    const base = String(r).split("/")[0];
    if (!ids.includes(base)) ids.push(base);
  }
  return ids;
}

export function buildModel(rawGraph, rawCatalog) {
  if (!rawGraph) throw new Error("buildModel: rawGraph is required");
  if (!rawCatalog) throw new Error("buildModel: rawCatalog is required");
  const components = flattenItems(rawGraph.items);
  const itemDefaults = rawGraph.item_defaults || {};
  const water = rawGraph.water || {};

  const flowNodes = new Map();
  for (const [id, node] of Object.entries(water)) {
    const type = typeOf(id);
    const compDef = components[type];
    if (!compDef) throw new Error(`model: water node "${id}" references unknown type "${type}"`);
    flowNodes.set(id, {
      id,
      kind: type,
      role: roleOf(type),
      subkind: subkindOf(type),
      elevation_m: node.h_m,
      to: downstreamOf(node.to),
      params: paramsOf(compDef, node, itemDefaults[type.split(".")[0]]),
    });
  }

  // EPANET links are strictly 2-port: splice a junction for a pump's outlet fan-out.
  for (const n of [...flowNodes.values()]) {
    if (n.role === "pump" && n.to.length > 1) {
      const junctionId = `${n.id}__out`;
      flowNodes.set(junctionId, {
        id: junctionId,
        kind: "fitting.coupling",
        role: "junction",
        subkind: "fitting.coupling",
        elevation_m: n.elevation_m,
        to: n.to,
        params: { k_minor: 0 },
        synthetic: true,
      });
      n.to = [junctionId];
    }
  }

  for (const n of flowNodes.values()) {
    for (const t of n.to) {
      if (!flowNodes.has(t)) {
        throw new Error(`model: water node "${n.id}" -> "${t}" which does not exist`);
      }
    }
  }

  const pumpDef = components["pump.jet"];
  if (!pumpDef?.model) throw new Error('model: missing "pump.jet" or its "model"');
  const pumpKey = PUMP_CURVE_ALIAS[pumpDef.model] || pumpDef.model;
  const pumpCurve = rawCatalog["pump.jet_curves"]?.[pumpKey];
  if (!pumpCurve) throw new Error(`model: no pump curve for "${pumpDef.model}"`);

  // valve.auto_loss is one flat table, not a per-model map like the pump curves.
  const valveDef = components["valve.auto"];
  if (!valveDef) throw new Error('model: missing "valve.auto"');
  const valveLoss = rawCatalog["valve.auto_loss"];
  if (!valveLoss) throw new Error("model: no valve.auto_loss curve");

  const nozzleI20 = rawCatalog["head.rotor/nozzle"];
  if (!nozzleI20) throw new Error("model: no head.rotor/nozzle curve");
  const nozzleMp = rawCatalog["head.spray/nozzle"];
  if (!nozzleMp) throw new Error("model: no head.spray/nozzle curve");

  return {
    flowNodes,
    kinds: components,
    components,
    electrical: rawGraph.electrical || {},
    minOperatingBar: valveDef.min_bar,
    curves: {
      pump: pumpCurve,
      valveLoss,
      nozzleI20,
      nozzleMp,
    },
  };
}
