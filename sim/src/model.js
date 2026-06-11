export function roleOf(kind) {
  if (kind === "supply") return "reservoir";
  if (kind === "pump") return "pump";
  // valve.foot is a passive check valve, and the pressure tank a dead-end accumulator;
  // both are treated hydraulically as junctions.
  if (kind === "fitting.joint" || kind === "fitting.tee" || kind === "manifold" || kind === "valve.foot" || kind === "tank") {
    return "junction";
  }
  if (kind === "valve.auto") return "valve-auto";
  if (kind === "valve.manual") return "valve-manual";
  if (kind.startsWith("hose.") || kind.startsWith("fitting.swing.")) return "pipe";
  if (kind === "head.rotor" || kind === "head.spray" || kind === "nozzle.stream") return "outlet";
  if (kind === "fitting.cap") return "cap";
  throw new Error(`model: unknown kind "${kind}"`);
}

function subkindOf(kind) {
  if (kind === "head.rotor") return "rotor";
  if (kind === "head.spray") return "spray";
  if (kind === "nozzle.stream") return "stream";
  if (kind.startsWith("fitting.swing.")) return "swing";
  if (kind.startsWith("hose.")) return "hose";
  return kind;
}

// Catalog keys don't always match the YAML `model` string verbatim.
const VALVE_LOSS_ALIAS = {
  "Hunter PGV-101G": "PGV-101G",
};

export function buildModel(rawGraph, rawCatalog) {
  const kinds = rawGraph.kinds || {};
  const flow = rawGraph.flow || {};

  const flowNodes = new Map();
  for (const [id, node] of Object.entries(flow)) {
    const kind = node.kind;
    if (!kind) throw new Error(`model: flow node "${id}" has no kind`);
    const kindDef = kinds[kind];
    if (!kindDef && kind !== "water.level") {
      throw new Error(`model: flow node "${id}" references unknown kind "${kind}"`);
    }
    const role = roleOf(kind);
    // node-level fields override kind fields
    const params = { ...(kindDef || {}), ...node };
    delete params.kind;
    delete params.to;
    delete params.parts;
    flowNodes.set(id, {
      id,
      kind,
      role,
      subkind: subkindOf(kind),
      elevation_m: node.h_m,
      to: node.to || [],
      params,
    });
  }

  for (const n of flowNodes.values()) {
    for (const t of n.to) {
      if (!flowNodes.has(t)) {
        throw new Error(`model: flow node "${n.id}" -> "${t}" which does not exist`);
      }
    }
  }

  const pumpKind = kinds["pump"];
  if (!pumpKind) throw new Error('model: missing "pump" kind definition');
  const pumpModel = pumpKind.model;
  if (!pumpModel) throw new Error('model: "pump" kind has no "model"');
  const pumpCurve = rawCatalog.pump_curves[pumpModel];
  if (!pumpCurve) throw new Error(`model: no pump curve for model "${pumpModel}"`);

  const valveKind = kinds["valve.auto"];
  if (!valveKind) throw new Error('model: missing "valve.auto" kind definition');
  const valveModel = valveKind.model;
  if (!valveModel) throw new Error('model: "valve.auto" kind has no "model"');
  const valveLossKey = VALVE_LOSS_ALIAS[valveModel] || valveModel;
  const valveLoss = rawCatalog.valve_loss[valveLossKey];
  if (!valveLoss) throw new Error(`model: no valve_loss curve for model "${valveModel}"`);

  return {
    flowNodes,
    kinds,
    circuit: rawGraph.circuit,
    // lift threshold from data; solver falls back to config VALVE_OPEN_BAR when absent
    minOperatingBar: valveKind.min_operating_bar,
    curves: {
      pump: pumpCurve, // {flow_m3h:[…], head_m:[…]}
      valveLoss, // {flow_m3h:[…], loss_bar:[…]}
      nozzleI20: rawCatalog.nozzle_i20,
      nozzleMp: rawCatalog.nozzle_mp,
    },
  };
}
