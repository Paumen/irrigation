// Normalise the raw system.yaml into the model the solver consumes.
//
// system.yaml schema: instance ids are `<PREFIX>_<type>[_<n>]` (e.g. W1_pump.jet,
// Z2_emitter.spray_1). The type is the dotted middle. Component *type* definitions
// (ports/parts/scalars) live in the nested `items:` tree; `category` holds the
// loss/requirement metadata; `water`/`electrical` are the two topologies.
//
// buildModel flattens this into: flowNodes (hydraulic graph), electrical (raw circuit
// graph), kinds (the flattened type defs, for the fault walker and electrical internals),
// and the resolved catalog curves.

// type = the dotted middle of an instance id: strip the `W1_`/`Z2_`/… prefix and any
// pure-numeric `_<n>` instance suffix (couplings like `coupling_bm1c32` keep their suffix
// because it is not all digits).
export function typeOf(id) {
  return id.replace(/^[A-Z]+[0-9]+_/, "").replace(/_[0-9]+$/, "");
}

// Hydraulic role of a water-graph node. Only ever called for ids present in `water:`.
export function roleOf(type) {
  if (type === "source.well") return "reservoir";
  if (type === "pump.jet") return "pump";
  if (type === "valve.auto") return "valve-auto";
  if (type === "valve.manual") return "valve-manual";
  if (type === "valve.foot") return "junction"; // passive check valve -> junction
  if (type === "fitting.cap") return "cap";
  if (type.startsWith("emitter.")) return "outlet";
  // swing joints are short pipes carrying their own k_minor
  if (type === "fitting.sj34x12" || type === "fitting.sj34x34") return "pipe";
  if (type.startsWith("hose.")) return "pipe";
  if (type.startsWith("fitting.")) return "junction"; // couplings, tee, manifold, strainer, hosetails
  throw new Error(`model: unknown water component type "${type}"`);
}

function subkindOf(type) {
  if (type === "emitter.rotor") return "rotor";
  if (type === "emitter.spray") return "spray";
  if (type === "emitter.stream") return "stream";
  if (type === "fitting.sj34x12" || type === "fitting.sj34x34") return "swing";
  if (type.startsWith("hose.")) return "hose";
  return type;
}

// Catalog keys drop the brand prefix the YAML `model` string carries.
const PUMP_CURVE_ALIAS = { "DAB AQUAJET 132 M": "AQUAJET 132 M" };
const VALVE_LOSS_ALIAS = { "Hunter PGV-101G": "PGV-101G" };

// Walk the nested `items:` tree and collect every component *type* definition: any key
// containing a "." is a dotted type id (e.g. `valve.foot`, `fitting.coupling_c25bf34`,
// `hose.ldpe25`). Its own nested `items:` are its parts (un-dotted), kept on the def.
// Type ids are globally unique; identical re-definitions are harmless (last wins).
function flattenItems(items, out = {}) {
  if (!items || typeof items !== "object") return out;
  for (const [key, val] of Object.entries(items)) {
    if (key.includes(".")) out[key] = val;
    if (val && typeof val === "object" && val.items) flattenItems(val.items, out);
  }
  return out;
}

// Scalar component fields the solver reads, normalised to the names network.js/outlets.js
// expect. Connection/metadata blocks (ports, *_conn, items, nested objects) are dropped.
function paramsOf(compDef, instance) {
  const params = {};
  for (const [k, v] of Object.entries(compDef || {})) {
    if (k === "ports" || k === "items") continue;
    if (v !== null && typeof v === "object") continue; // *_conn, nested blocks
    params[k] = v;
  }
  for (const [k, v] of Object.entries(instance || {})) {
    if (k === "to" || k === "h_m") continue;
    params[k] = v;
  }
  // field aliases: system.yaml uses k / l_m; the network layer reads k_minor / length_m.
  if (params.k != null) params.k_minor = params.k;
  if (params.l_m != null) params.length_m = params.l_m;
  return params;
}

// `to:` is either a list of targets or a port-keyed map; either way collapse to the set of
// downstream base node ids (strip any `/port` suffix).
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
  const components = flattenItems(rawGraph.items);
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
      params: paramsOf(compDef, node),
    });
  }

  // EPANET links are strictly 2-port. If a pump (a link) fans its outlet out to more than
  // one downstream node, splice a junction at its outlet to carry the fan-out.
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
  const pumpCurve = rawCatalog.pump_curves?.[pumpKey];
  if (!pumpCurve) throw new Error(`model: no pump curve for "${pumpDef.model}"`);

  const valveDef = components["valve.auto"];
  if (!valveDef?.model) throw new Error('model: missing "valve.auto" or its "model"');
  const valveKey = VALVE_LOSS_ALIAS[valveDef.model] || valveDef.model;
  const valveLoss = rawCatalog.valve_loss?.[valveKey];
  if (!valveLoss) throw new Error(`model: no valve_loss curve for "${valveDef.model}"`);

  return {
    flowNodes,
    kinds: components, // type defs (parts/fail/ports) for the fault walker + electrical internals
    components,
    electrical: rawGraph.electrical || {},
    minOperatingBar: valveDef.min_bar,
    curves: {
      pump: pumpCurve, // {flow_m3h:[…], head_m:[…]}
      valveLoss, // {flow_m3h:[…], loss_bar:[…]}
      nozzleI20: rawCatalog.nozzle_i20,
      nozzleMp: rawCatalog.nozzle_mp,
    },
  };
}
