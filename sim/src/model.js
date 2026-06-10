// Normalize the raw graph.yaml + catalog.yaml into a Model the rest of the core
// consumes. Pure: takes already-parsed JS objects (callers load YAML their own way
// and pass the parsed objects in). No EPANET here.

// Map a flow-node `kind` to a hydraulic role. network.js keeps the original `kind`
// too, so it can fold the right k_minor and pick the right diameter.
export function roleOf(kind) {
  if (kind === "water.level") return "reservoir";
  if (kind === "pump.well") return "pump";
  if (kind === "joint" || kind === "tee" || kind === "manifold") return "junction";
  if (kind === "valve.auto") return "valve-auto";
  if (kind === "valve.manual") return "valve-manual";
  if (kind.startsWith("hose.") || kind.startsWith("swing.")) return "pipe";
  if (kind === "head.rotor" || kind === "head.spray" || kind === "nozzle.stream") return "outlet";
  if (kind === "cap") return "cap";
  throw new Error(`model: unknown kind "${kind}"`);
}

// The subkind distinguishes outlet discharge laws (outlets.js) and lets network.js
// treat a swing as a pipe with its own k_minor.
function subkindOf(kind) {
  if (kind === "head.rotor") return "rotor";
  if (kind === "head.spray") return "spray";
  if (kind === "nozzle.stream") return "stream";
  if (kind.startsWith("swing.")) return "swing";
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
    // water.level is a virtual kind (the well surface); it has no kinds entry.
    if (!kindDef && kind !== "water.level") {
      throw new Error(`model: flow node "${id}" references unknown kind "${kind}"`);
    }
    const role = roleOf(kind);
    // params = kind fields, then node-level fields override (length_m, nozzle, arc, …).
    const params = { ...(kindDef || {}), ...node };
    delete params.kind;
    delete params.to;
    delete params.parts; // structural sub-part tree, not hydraulic params
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

  // Validate edges point somewhere real.
  for (const n of flowNodes.values()) {
    for (const t of n.to) {
      if (!flowNodes.has(t)) {
        throw new Error(`model: flow node "${n.id}" -> "${t}" which does not exist`);
      }
    }
  }

  // Resolve catalog curves now so a missing definition or table fails fast.
  const pumpKind = kinds["pump.well"];
  if (!pumpKind) throw new Error('model: missing "pump.well" kind definition');
  const pumpModel = pumpKind.model;
  if (!pumpModel) throw new Error('model: "pump.well" kind has no "model"');
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
    circuit: rawGraph.circuit, // consumed by electrical.js (solveElectrical)
    // The diaphragm lift threshold comes from the data, not a constant, so a YAML
    // change propagates; solver falls back to config VALVE_OPEN_BAR when absent.
    minOperatingBar: valveKind.min_operating_bar,
    curves: {
      pump: pumpCurve, // {flow_m3h:[…], head_m:[…]}
      valveLoss, // {flow_m3h:[…], loss_bar:[…]}
      nozzleI20: rawCatalog.nozzle_i20,
      nozzleMp: rawCatalog.nozzle_mp,
    },
  };
}
