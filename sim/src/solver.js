// EPANET has only one global emitter exponent, so each outlet's own pressure->flow law
// is fed in as a fixed EPANET demand from the previous iteration's pressure, then damped.
// Closed valves / stopped pump become closed links; their demands are zeroed by reachability.

import {
  ALPHA,
  ALPHA_MIN,
  EMITTER_GATE_BAR,
  M_PER_BAR,
  P_TOL_BAR,
  Q_TOL_M3H,
  MAX_ITERS,
  STABLE_ITERS,
  VALVE_OPEN_BAR,
  VALVE_STAY_BAR,
  VALVE_FREEZE_TAIL,
  THROTTLE_MIN,
} from "./config.js";
import { buildTopology } from "./network.js";
import { toInp } from "./inp.js";
import { solveInp } from "./epanet-runner.js";
import { outletDemandAt, outletTableMin, streamEmitterCoeff } from "./outlets.js";
import { emptyEffects } from "./faults.js";

const epOf = (id) => id.replace(/\./g, "_");

const zoneOf = (flowId) => {
  const m = flowId.match(/^Z(\d+)\./);
  return m ? Number(m[1]) : null;
};

export function computeReachable(model, pumpOn, valveOpen, closedLinks = new Set()) {
  const { flowNodes } = model;
  const reachable = new Set();
  const queue = [];
  for (const n of flowNodes.values()) {
    if (n.role === "reservoir") {
      reachable.add(n.id);
      queue.push(n.id);
    }
  }
  while (queue.length) {
    const node = flowNodes.get(queue.shift());
    if (node.role === "pump" && !pumpOn) continue;
    if ((node.role === "valve-auto" || node.role === "valve-manual") && !valveOpen[node.id]) {
      continue;
    }
    if (closedLinks.has(node.id)) continue;
    for (const c of node.to) {
      if (!reachable.has(c)) {
        reachable.add(c);
        queue.push(c);
      }
    }
  }
  return reachable;
}

// floStop closed: head stays filled but discharges nothing.
// throttle 0..1: <=THROTTLE_MIN = seated shut.
export function solveSteady(model, state, elec, hyd, faults) {
  if (!elec || typeof elec.pumpPowered !== "boolean" || !elec.zoneEnergised) {
    throw new Error("solver: missing or invalid electrical solve result (elec)");
  }
  const fx = faults || emptyEffects();
  const { flowNodes, curves } = model;
  const pumpOn = elec.pumpPowered && !fx.pumpDisabled;
  const zoneEnergised = elec.zoneEnergised;
  const manualOpen = state.manualOpen || {};
  const bleedOpen = state.bleedOpen || {};
  const floStop = state.floStop || {};
  const throttle = state.throttle || {};
  const liftBar = model.minOperatingBar ?? VALVE_OPEN_BAR;

  const outlets = [...flowNodes.values()].filter((n) => n.role === "outlet");

  const eff = new Map();
  for (const o of outlets) {
    const mod = fx.outletMods.get(o.id) || {};
    const params = { ...o.params };
    if (mod.nozzle != null) params.nozzle = mod.nozzle;
    if (mod.arc != null) params.arc = mod.arc;
    if (mod.bore_mm != null) params.bore_mm = mod.bore_mm;
    eff.set(o.id, {
      outlet: { ...o, params },
      flowScale: mod.flowScale ?? 1,
      noClamp: !!mod.noClamp,
      orifice: mod.asOrifice || null,
    });
  }

  // Stream/open-orifice heads must solve as EPANET emitters: the demand loop oscillates
  // on their near-zero-pressure discharge.
  const isEmitterOutlet = (o) => o.subkind === "stream" || !!eff.get(o.id).orifice;
  const demandOutlets = outlets.filter((o) => !isEmitterOutlet(o));
  const emitterOutlets = outlets.filter(isEmitterOutlet);

  // Below its table's lowest point swap a demand outlet to an EPANET emitter: the demand
  // fixed point is singular as p -> 0. Laws agree at pMin so the handoff is continuous.
  const tableMin = new Map(demandOutlets.map((o) => [o.id, outletTableMin(eff.get(o.id).outlet, curves)]));

  const valveOpen = {};
  for (const n of flowNodes.values()) {
    if (n.role === "valve-auto") valveOpen[n.id] = fx.valveForcedOpen.has(n.id);
    if (n.role === "valve-manual") {
      valveOpen[n.id] =
        fx.valveForcedOpen.has(n.id) || (!!manualOpen[n.id] && !fx.valveDisabled.has(n.id));
    }
  }

  // Adaptive per-quantity damping: step halves on a sign flip, recovers while monotone,
  // else steep pressure->flow gain makes the iteration ring. maxStep feeds the dq
  // convergence test.
  const dampState = new Map();
  let maxStep = 0;
  const damp = (key, target) => {
    let s = dampState.get(key);
    if (!s) {
      s = { v: 0, a: ALPHA, d: 0 };
      dampState.set(key, s);
    }
    const delta = target - s.v;
    if (delta * s.d < 0) s.a = Math.max(s.a / 2, ALPHA_MIN);
    else if (delta * s.d > 0) s.a = Math.min(s.a * 1.2, ALPHA);
    s.d = delta;
    const step = s.a * delta;
    s.v += step;
    maxStep = Math.max(maxStep, Math.abs(step));
    return s.v;
  };
  let p_prev = {};
  const demands = new Map(outlets.map((o) => [o.id, 0]));
  const commandedNotOpening = {};

  let res = null;
  let topo = null;
  let reachable = null;
  let converged = false;
  let stable = 0;
  let iters = 0;
  let valvesFrozen = false;

  for (let iter = 1; iter <= MAX_ITERS; iter++) {
    iters = iter;
    reachable = computeReachable(model, pumpOn, valveOpen, fx.closedLinks);

    // Gate emitters to zero near/below zero pressure: an emitter at negative pressure
    // would suck water IN, where the real part draws air and stops.
    const gateOf = (flowId) =>
      Math.max(0, Math.min(1, (p_prev[epOf(flowId)] || 0) / EMITTER_GATE_BAR));

    const emitters = new Map();
    maxStep = 0;
    for (const o of demandOutlets) {
      const pAt = p_prev[epOf(o.id)] || 0;
      const e = eff.get(o.id);
      const tm = tableMin.get(o.id);
      let targetQ = 0;
      let targetC = 0;
      if (reachable.has(o.id) && !floStop[o.id]) {
        if (tm && pAt < tm.pMin_bar) {
          targetC = (gateOf(o.id) * e.flowScale * tm.qMin) / Math.sqrt(tm.pMin_bar * M_PER_BAR);
        } else {
          targetQ = e.flowScale * outletDemandAt(e.outlet, pAt, curves, { noClamp: e.noClamp });
        }
      }
      demands.set(o.id, damp(o.id, targetQ));
      const c = damp(`em:${o.id}`, targetC);
      if (c > 1e-9) emitters.set(o.id, c);
    }

    // Emit only while reachable: an emitter on a dead branch injects phantom flow.
    for (const o of emitterOutlets) {
      if (!reachable.has(o.id) || floStop[o.id]) continue;
      const e = eff.get(o.id);
      emitters.set(o.id, e.flowScale * streamEmitterCoeff(e.orifice || e.outlet.params));
    }
    for (const [nodeId, coeff] of fx.leaks) {
      const c = damp(`leak:${nodeId}`, reachable.has(nodeId) ? gateOf(nodeId) * coeff : 0);
      if (c > 1e-9 && reachable.has(nodeId)) emitters.set(nodeId, (emitters.get(nodeId) || 0) + c);
    }

    topo = buildTopology(model, {
      pumpOn,
      valveOpen,
      demands,
      emitters,
      throttle,
      closedLinks: fx.closedLinks,
      linkK: fx.linkK,
      pumpHeadScale: fx.pumpHeadScale,
      valveLossScale: fx.valveLossScale,
    });
    res = solveInp(hyd, toInp(topo), { nodeIds: topo.nodeIds, linkIds: topo.linkIds });

    let maxdp = 0;
    for (const n of flowNodes.values()) {
      if (n.role === "pipe" || n.role === "pump" || n.role.startsWith("valve")) continue;
      if (!reachable.has(n.id)) continue;
      const e = epOf(n.id);
      const now = res.pressureBar[e];
      if (Number.isFinite(now)) maxdp = Math.max(maxdp, Math.abs(now - (p_prev[e] || 0)));
    }

    // Freeze valve states in the final iterations: a flapping valve keeps the fixed
    // point from settling.
    if (iter > MAX_ITERS - VALVE_FREEZE_TAIL) {
      valvesFrozen = true;
    } else {
      for (const v of topo.valves) {
        if (!v.isAuto) continue;
        if (fx.valveForcedOpen.has(v.flowId)) {
          valveOpen[v.flowId] = true;
          commandedNotOpening[v.flowId] = false;
          continue;
        }
        const inletP = res.pressureBar[v.n1];
        const commanded =
          !!zoneEnergised[zoneOf(v.flowId)] ||
          !!bleedOpen[v.flowId] ||
          fx.bleedForcedOpen.has(v.flowId);
        if (fx.valveDisabled.has(v.flowId)) {
          valveOpen[v.flowId] = false;
          commandedNotOpening[v.flowId] = commanded;
          continue;
        }
        // A valve on a dead branch cannot lift; EPANET pressures there are untrustworthy.
        const wet = reachable.has(v.flowId);
        const screwShut = (throttle[v.flowId] ?? 1) <= THROTTLE_MIN;
        let open = false;
        if (commanded && wet && !screwShut && Number.isFinite(inletP)) {
          open = valveOpen[v.flowId] ? inletP >= VALVE_STAY_BAR : inletP >= liftBar;
        }
        valveOpen[v.flowId] = open;
        commandedNotOpening[v.flowId] = commanded && !open;
      }
    }

    p_prev = res.pressureBar;

    stable = maxdp < P_TOL_BAR && maxStep < Q_TOL_M3H ? stable + 1 : 0;
    if (stable >= STABLE_ITERS) {
      converged = true;
      break;
    }
  }

  for (const n of flowNodes.values()) {
    if (n.role === "valve-manual") {
      commandedNotOpening[n.id] = !!manualOpen[n.id] && !valveOpen[n.id];
    }
  }

  // EPANET reports a source reservoir's demand as negative; inflow is the negated sum.
  const totalInflow = topo.reservoirs.reduce((sum, r) => sum - res.demand[r.id], 0);
  const pumpFlow = topo.pumpLinkId ? res.flow[topo.pumpLinkId] : 0;
  // A leak sharing a head's junction reports through the head's own discharge.
  const dischargeIds = new Set(outlets.map((o) => o.id));
  const leakFlows = new Map();
  for (const [nodeId] of fx.leaks) {
    if (!reachable.has(nodeId)) continue;
    dischargeIds.add(nodeId);
    if (flowNodes.get(nodeId).role !== "outlet") {
      leakFlows.set(nodeId, res.demand[epOf(nodeId)] || 0);
    }
  }
  let outSum = 0;
  for (const id of dischargeIds) {
    if (reachable.has(id)) outSum += res.demand[epOf(id)] || 0;
  }
  for (const o of outlets) {
    demands.set(o.id, reachable.has(o.id) ? res.demand[epOf(o.id)] || 0 : 0);
  }

  return {
    pressureBar: res.pressureBar, // unmasked; mask unreachable nodes with `reachable`
    headM: res.headM,
    flow: res.flow,
    demands,
    leakFlows,
    valveOpen,
    commandedNotOpening,
    reachable,
    pumpFlow,
    outSum,
    massImbalance: Math.abs(totalInflow - outSum),
    converged,
    iters,
    valvesFrozen, // anti-flap freeze engaged; valve states are unreliable
    topo,
  };
}
