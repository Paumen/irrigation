// system.yaml schema: instance ids are `<PREFIX>_<component>[_<n>]` (e.g. W1_pump.jet,
// Z2_emitter.spray_1). The component type is the dotted middle; `components` holds the
// type definitions (ports/parts/scalars), `category` the loss/requirement metadata, and
// `water`/`electrical` the two topologies. buildModel flattens this into the internal
// model the solver consumes: flowNodes (hydraulic), electrical (raw circuit graph), and
// kinds (= components, for the fault walker).

// type = the dotted middle of an instance id: strip the `W1_`/`Z2_`/… prefix and any
// `_<n>` instance suffix.
export function typeOf(id) {
  return id.replace(/^[A-Z]+[0-9]+_/, "").replace(/_[0-9]+$/, "");
}

export function roleOf(type) {
  if (type === "source.well") return "reservoir";
  if (type === "pump.jet") return "pump";
  // valve.foot is a passive check valve, the diaphragm tank a dead-end accumulator, and
  // the inline fittings zero-length junctions; all are treated hydraulically as junctions.
  if (
    type === "tank.diaphragm" ||
    type === "valve.foot" ||
    type === "fitting.coupling" ||
    type === "fitting.tee" ||
    type === "fitting.manifold" ||
    type === "fitting.strainer_basket" ||
    type === "fitting.hosetail_brass" ||
    type === "fitting.hosetail_plastic"
  ) {
    return "junction";
  }
  if (type === "fitting.cap") return "cap";
  if (type === "valve.auto") return "valve-auto";
  if (type === "valve.manual") return "valve-manual";
  if (type.startsWith("hose.") || type === "fitting.sj34x34" || type === "fitting.sj34x12") {
    return "pipe";
  }
  if (type === "emitter.rotor" || type === "emitter.spray" || type === "emitter.stream") {
    return "outlet";
  }
  throw new Error(`model: unknown component type "${type}"`);
}

function subkindOf(type) {
  if (type === "emitter.rotor") return "rotor";
  if (type === "emitter.spray") return "spray";
  if (type === "emitter.stream") return "stream";
  if (type === "fitting.sj34x34" || type === "fitting.sj34x12") return "swing";
  if (type.startsWith("hose.")) return "hose";
  return type;
}

// Catalog keys don't always match the YAML `model` string verbatim.
const VALVE_LOSS_ALIAS = {
  "Hunter PGV-101G": "PGV-101G",
};

// Scalar component fields the solver reads, normalised to the names network.js/outlets.js
// expect. Connection/metadata blocks (ports, parts, *_conn, note, model) are dropped.
function paramsOf(compDef, instance) {
  const params = {};
  for (const [k, v] of Object.entries(compDef || {})) {
    if (k === "ports" || k === "parts") continue;
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
  else if (to && typeof to === "object") for (const v of Object.values(to)) refs.push(...(Array.isArray(v) ? v : [v]));
  const ids = [];
  for (const r of refs) {
    const base = String(r).split("/")[0];
    if (!ids.includes(base)) ids.push(base);
  }
  return ids;
}

export function buildModel(rawGraph, rawCatalog) {
  const components = rawGraph.components || {};
  const water = rawGraph.water || {};

  const flowNodes = new Map();
  for (const [id, node] of Object.entries(water)) {
    const type = typeOf(id);
    const compDef = components[type];
    if (!compDef) throw new Error(`model: water node "${id}" references unknown component "${type}"`);
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

  // The pump fans its outlet to both the main line and the pressure-tank fill line. EPANET
  // links are strictly 2-port, so splice in a junction at the pump outlet carrying the fan-out.
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

  const pumpModel = components["pump.jet"]?.model;
  if (!pumpModel) throw new Error('model: missing "pump.jet" component or its "model"');
  const pumpCurve = rawCatalog.pump_curves[pumpModel];
  if (!pumpCurve) throw new Error(`model: no pump curve for model "${pumpModel}"`);

  const valveDef = components["valve.auto"];
  const valveModel = valveDef?.model;
  if (!valveModel) throw new Error('model: missing "valve.auto" component or its "model"');
  const valveLossKey = VALVE_LOSS_ALIAS[valveModel] || valveModel;
  const valveLoss = rawCatalog.valve_loss[valveLossKey];
  if (!valveLoss) throw new Error(`model: no valve_loss curve for model "${valveModel}"`);

  return {
    flowNodes,
    kinds: components, // the fault walker reads parts/fail off the component definitions
    components,
    electrical: rawGraph.electrical || {},
    // lift threshold from data; solver falls back to config VALVE_OPEN_BAR when absent
    minOperatingBar: valveDef.min_bar,
    curves: {
      pump: pumpCurve, // {flow_m3h:[…], head_m:[…]}
      valveLoss, // {flow_m3h:[…], loss_bar:[…]}
      nozzleI20: rawCatalog.nozzle_i20,
      nozzleMp: rawCatalog.nozzle_mp,
    },
  };
}
