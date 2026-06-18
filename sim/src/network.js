import {
  M_PER_BAR,
  SWING_LEN_M,
  CONNECTOR_LEN_M,
  CONNECTOR_DIAM_MM,
  DEFAULT_ROUGHNESS_MM,
  THROTTLE_MIN,
  kvToTcvK,
} from "./config.js";
import { epOf, isLinkNode } from "./model.js";

const NODE_ROLES = new Set(["reservoir", "junction", "cap", "outlet"]);

export function buildTopology(model, state) {
  const { flowNodes } = model;
  const pumpOn = !!state.pumpOn;
  const valveOpen = state.valveOpen || {};
  const demands = state.demands || new Map();
  const emitters = state.emitters || new Map();
  const throttle = state.throttle || {}; // 0..1, 1 = factory-open
  const closedLinks = state.closedLinks || new Set();
  const linkK = state.linkK || new Map();
  const pumpHeadScale = state.pumpHeadScale ?? 1;
  const valveLossScale = state.valveLossScale || new Map();

  const toEpanet = new Map();
  const toFlow = new Map();
  const ep = (flowId) => {
    if (!toEpanet.has(flowId)) {
      const e = epOf(flowId);
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
  const statusClosed = [];
  const outletList = [];
  const emitterList = [];

  for (const n of flowNodes.values()) {
    if (n.role === "reservoir") {
      reservoirs.push({ id: ep(n.id), head: n.elevation_m });
    } else if (n.role === "junction" || n.role === "cap") {
      junctions.push({ id: ep(n.id), elev: n.elevation_m, demand: 0 });
    } else if (n.role === "outlet") {
      junctions.push({ id: ep(n.id), elev: n.elevation_m, demand: demands.get(n.id) || 0 });
      outletList.push({ flowId: n.id, epanetId: ep(n.id), subkind: n.subkind, params: n.params });
    }
  }

  for (const [flowId, coeff] of emitters) {
    if (coeff > 0) emitterList.push({ id: ep(flowId), coeff });
  }

  // short ids stay under EPANET's 31-char id limit
  const synthetic = new Map();
  const getSyntheticJunction = (upperId, lowerNode) => {
    const key = `${upperId}>${lowerNode.id}`;
    if (!synthetic.has(key)) {
      const id = `SJ${synthetic.size + 1}`;
      junctions.push({ id, elev: lowerNode.elevation_m, demand: 0 });
      synthetic.set(key, id);
    }
    return synthetic.get(key);
  };
  let connSeq = 0;

  const parentOf = new Map();
  for (const n of flowNodes.values()) {
    for (const t of n.to) parentOf.set(t, n.id);
  }

  const foldedK = new Map();
  const addFold = (linkId, k) => foldedK.set(linkId, (foldedK.get(linkId) || 0) + k);

  for (const u of flowNodes.values()) {
    const k = u.params.k_minor || 0;
    for (const childId of u.to) {
      const child = flowNodes.get(childId);
      if (NODE_ROLES.has(u.role) && NODE_ROLES.has(child.role)) {
        pipes.push({
          id: `CONN${++connSeq}`,
          n1: ep(u.id),
          n2: ep(child.id),
          length_m: CONNECTOR_LEN_M,
          diam_mm: u.params.bore_mm || CONNECTOR_DIAM_MM,
          rough_mm: DEFAULT_ROUGHNESS_MM,
          mloss: k,
        });
      } else if (isLinkNode(child) && k > 0) {
        addFold(childId, k);
      }
    }
  }

  const pump = model.curves.pump;
  const vloss = model.curves.valveLoss;
  // anchor at origin, else EPANET extrapolates to negative pressures on a starved branch
  const vpts = vloss.flow_m3h.map((q, i) => [q, vloss.loss_bar[i] * M_PER_BAR]);
  if (vpts.length === 0) throw new Error("network: valve_loss curve is empty");
  if (vpts[0][0] > 0) vpts.unshift([0, 0]);
  const curves = {
    PCURVE: pump.flow_m3h.map((q, i) => [q, pump.head_m[i] * pumpHeadScale]),
    VCURVE: vpts,
  };

  const resolveEndpoint = (neighborId, self, isUpstream) => {
    if (!neighborId) return null;
    const neighbor = flowNodes.get(neighborId);
    if (NODE_ROLES.has(neighbor.role)) return ep(neighborId);
    return isUpstream
      ? getSyntheticJunction(neighbor.id, self)
      : getSyntheticJunction(self.id, neighbor);
  };

  let pumpLinkId = null;
  for (const L of flowNodes.values()) {
    if (!isLinkNode(L)) continue;
    if (L.to.length === 0) continue;
    if (L.to.length > 1) {
      throw new Error(`network: link "${L.id}" has ${L.to.length} downstream nodes`);
    }
    const n1 = resolveEndpoint(parentOf.get(L.id), L, true);
    const n2 = resolveEndpoint(L.to[0], L, false);
    if (!n1) throw new Error(`network: link "${L.id}" has no upstream node`);
    if (!n2) throw new Error(`network: link "${L.id}" has no downstream node`);
    const mloss = (foldedK.get(L.id) || 0) + (linkK.get(L.id) || 0);
    if (closedLinks.has(L.id)) statusClosed.push(ep(L.id));

    if (L.role === "pipe") {
      const isSwing = L.subkind === "swing";
      pipes.push({
        id: ep(L.id),
        n1,
        n2,
        length_m: isSwing ? SWING_LEN_M : L.params.length_m,
        diam_mm: isSwing ? L.params.bore_mm : L.params.inner_diameter_mm,
        rough_mm: L.params.roughness_mm || DEFAULT_ROUGHNESS_MM,
        mloss: mloss + (isSwing ? L.params.k_minor || 0 : 0),
      });
    } else if (L.role === "pump") {
      pumpLinkId = ep(L.id);
      pumps.push({ id: ep(L.id), n1, n2, curveId: "PCURVE" });
      if (!pumpOn) statusClosed.push(ep(L.id));
    } else if (L.role === "valve-auto") {
      // EPANET ignores minor-loss on GPVs, so throttle and seat clog scale the curve instead
      const t = throttle[L.id] ?? 1;
      const lossScale = valveLossScale.get(L.id) ?? 1;
      let setting = "VCURVE";
      if (t < 1 || lossScale !== 1) {
        const tt = Math.max(t, THROTTLE_MIN);
        setting = `VC_${ep(L.id)}`;
        curves[setting] = curves.VCURVE.map(([q, h]) => [q, (h * lossScale) / (tt * tt)]);
      }
      valves.push({ id: ep(L.id), flowId: L.id, n1, n2, diam_mm: CONNECTOR_DIAM_MM, type: "GPV", setting, mloss, isAuto: true });
      if (!valveOpen[L.id]) statusClosed.push(ep(L.id));
    } else if (L.role === "valve-manual") {
      // a TCV's setting IS its loss K, so seat clog scales it
      const diam = L.params.bore_mm || 16;
      valves.push({
        id: ep(L.id),
        flowId: L.id,
        n1,
        n2,
        diam_mm: diam,
        type: "TCV",
        setting: kvToTcvK(L.params.Kv, diam) * (valveLossScale.get(L.id) ?? 1),
        mloss,
        isAuto: false,
      });
      if (!valveOpen[L.id]) statusClosed.push(ep(L.id));
    }
  }

  const nodeIds = [...reservoirs.map((r) => r.id), ...junctions.map((j) => j.id)];
  const linkIds = [...pipes.map((p) => p.id), ...pumps.map((p) => p.id), ...valves.map((v) => v.id)];

  return {
    junctions,
    reservoirs,
    pipes,
    pumps,
    valves,
    statusClosed,
    emitters: emitterList,
    curves,
    outletList,
    pumpLinkId,
    nodeIds,
    linkIds,
    idMap: { toEpanet, toFlow },
  };
}
