// Translate a Model + current state into an EPANET Topology (nodes + links).
//
// The flow graph mixes node-like vertices (well, joint, tee, manifold, head, cap)
// with link-like vertices (hose, swing, pump, valve). EPANET is strictly node-link-
// node, so:
//   - each node-like vertex  -> one EPANET node
//   - each link-like vertex  -> one EPANET link whose endpoints are the EPANET nodes
//     of its upstream/downstream neighbours
//   - where two node-like vertices are directly adjacent (e.g. manifold -> zone joint,
//     with no hose between them) we insert a synthetic short connector PIPE, because
//     EPANET cannot join two junctions directly
//   - where two link-like vertices are directly adjacent (hose1 -> pump) we insert a
//     synthetic junction between them (the pump inlet)
//
// Minor-loss folding: EPANET carries minor losses on links, not nodes. A fitting's
// k_minor is added to the Mloss of the link element on the edge leaving it; a tee /
// manifold with several outgoing edges contributes its full k_minor to each (every
// flow path traverses the fitting once — the standard lumped approximation).

import {
  M_PER_BAR,
  SWING_LEN_M,
  CONNECTOR_LEN_M,
  CONNECTOR_DIAM_MM,
  DEFAULT_ROUGHNESS_MM,
} from "./config.js";
import { kvToTcvK } from "./units.js";

const LINK_ROLES = new Set(["pipe", "pump", "valve-auto", "valve-manual"]);
const NODE_ROLES = new Set(["reservoir", "junction", "cap", "outlet"]);

function isLink(node) {
  return LINK_ROLES.has(node.role);
}

export function buildTopology(model, state) {
  const { flowNodes } = model;
  const pumpOn = !!state.pumpOn;
  const valveOpen = state.valveOpen || {}; // flow id -> bool (auto + manual)
  const demands = state.demands || new Map(); // outlet flow id -> q (m3/h)

  // --- id mapping (EPANET ids may not contain '.') ---
  const toEpanet = new Map();
  const toFlow = new Map();
  const ep = (flowId) => {
    if (!toEpanet.has(flowId)) {
      const e = flowId.replace(/\./g, "_");
      toEpanet.set(flowId, e);
      toFlow.set(e, flowId);
    }
    return toEpanet.get(flowId);
  };

  const junctions = [];
  const reservoirs = [];
  const pipes = [];
  const pumps = [];
  const valves = [];
  const statusClosed = []; // link epanet ids forced closed
  const outletList = [];

  // --- register every node-like vertex as an EPANET node ---
  for (const n of flowNodes.values()) {
    if (n.role === "reservoir") {
      reservoirs.push({ id: ep(n.id), head: n.elevation_m });
    } else if (n.role === "junction" || n.role === "cap") {
      junctions.push({ id: ep(n.id), elev: n.elevation_m, demand: 0 });
    } else if (n.role === "outlet") {
      junctions.push({ id: ep(n.id), elev: n.elevation_m, demand: demands.get(n.id) || 0 });
      outletList.push({
        flowId: n.id,
        epanetId: ep(n.id),
        subkind: n.subkind, // rotor | spray | stream
        params: n.params,
      });
    }
  }

  // synthetic junctions inserted between two adjacent links (the pump inlet)
  const synthetic = new Map(); // key -> epanet id
  const getSyntheticJunction = (upperFlowId, lowerNode) => {
    const key = `sj__${upperFlowId}__${lowerNode.id}`;
    if (!synthetic.has(key)) {
      const id = `SJ_${ep(upperFlowId)}__${ep(lowerNode.id)}`;
      junctions.push({ id, elev: lowerNode.elevation_m, demand: 0 });
      synthetic.set(key, id);
    }
    return synthetic.get(key);
  };

  // parent map (the graph is a tree rooted at the reservoir)
  const parentOf = new Map();
  for (const n of flowNodes.values()) {
    for (const t of n.to) parentOf.set(t, n.id);
  }

  // Minor losses to fold onto each link element, keyed by the link's flow id, plus
  // connector pipes for node->node edges (which carry the upstream fitting's k_minor).
  const foldedK = new Map(); // link flow id -> summed upstream k_minor
  const addFold = (linkFlowId, k) => foldedK.set(linkFlowId, (foldedK.get(linkFlowId) || 0) + k);

  for (const u of flowNodes.values()) {
    const k = u.params.k_minor || 0;
    for (const childId of u.to) {
      const child = flowNodes.get(childId);
      if (NODE_ROLES.has(u.role) && NODE_ROLES.has(child.role)) {
        // node -> node: bridge with a synthetic connector pipe carrying u's k_minor
        pipes.push({
          id: `CONN_${ep(u.id)}__${ep(child.id)}`,
          n1: ep(u.id),
          n2: ep(child.id),
          length_m: CONNECTOR_LEN_M,
          diam_mm: u.params.bore_mm || CONNECTOR_DIAM_MM,
          rough_mm: DEFAULT_ROUGHNESS_MM,
          mloss: k,
        });
      } else if (isLink(child) && k > 0) {
        // node -> link: u's k_minor rides on that link element's Mloss
        addFold(childId, k);
      }
    }
  }

  // --- emit one EPANET link per link-like vertex ---
  const resolveEndpoint = (neighborId, self, isUpstream) => {
    if (!neighborId) return null;
    const neighbor = flowNodes.get(neighborId);
    if (NODE_ROLES.has(neighbor.role)) return ep(neighborId);
    // neighbour is itself a link -> insert a synthetic junction between them
    return isUpstream
      ? getSyntheticJunction(neighborId, self) // junction sits at self's elevation
      : getSyntheticJunction(self.id, neighbor); // junction sits at neighbour's elevation
  };

  let pumpLinkId = null;
  for (const L of flowNodes.values()) {
    if (!isLink(L)) continue;
    const n1 = resolveEndpoint(parentOf.get(L.id), L, true);
    const n2 = resolveEndpoint(L.to[0], L, false);
    const mloss = foldedK.get(L.id) || 0;

    if (L.role === "pipe") {
      const isSwing = L.subkind === "swing";
      pipes.push({
        id: ep(L.id),
        n1,
        n2,
        length_m: isSwing ? SWING_LEN_M : L.params.length_m,
        diam_mm: isSwing ? L.params.bore_mm : L.params.inner_diameter_mm,
        rough_mm: L.params.roughness_mm || DEFAULT_ROUGHNESS_MM,
        // a swing carries its own k_minor as well as anything folded from upstream
        mloss: mloss + (isSwing ? L.params.k_minor || 0 : 0),
      });
    } else if (L.role === "pump") {
      pumpLinkId = ep(L.id);
      pumps.push({ id: ep(L.id), n1, n2, curveId: "PCURVE" });
      if (!pumpOn) statusClosed.push(ep(L.id));
    } else if (L.role === "valve-auto") {
      valves.push({
        id: ep(L.id),
        flowId: L.id,
        n1,
        n2,
        diam_mm: CONNECTOR_DIAM_MM,
        type: "GPV",
        setting: "VCURVE",
        mloss,
        isAuto: true,
      });
      if (!valveOpen[L.id]) statusClosed.push(ep(L.id));
    } else if (L.role === "valve-manual") {
      const diam = L.params.bore_mm || 16;
      valves.push({
        id: ep(L.id),
        flowId: L.id,
        n1,
        n2,
        diam_mm: diam,
        type: "TCV",
        setting: kvToTcvK(L.params.Kv, diam),
        mloss,
        isAuto: false,
      });
      if (!valveOpen[L.id]) statusClosed.push(ep(L.id));
    }
  }

  // --- shared head curves ---
  const pump = model.curves.pump;
  const vloss = model.curves.valveLoss;
  const curves = {
    PCURVE: pump.flow_m3h.map((q, i) => [q, pump.head_m[i]]),
    VCURVE: vloss.flow_m3h.map((q, i) => [q, vloss.loss_bar[i] * M_PER_BAR]),
  };

  const nodeIds = [
    ...reservoirs.map((r) => r.id),
    ...junctions.map((j) => j.id),
  ];
  const linkIds = [
    ...pipes.map((p) => p.id),
    ...pumps.map((p) => p.id),
    ...valves.map((v) => v.id),
  ];

  return {
    junctions,
    reservoirs,
    pipes,
    pumps,
    valves,
    statusClosed,
    curves,
    outletList,
    pumpLinkId,
    nodeIds,
    linkIds,
    idMap: { toEpanet, toFlow },
  };
}
