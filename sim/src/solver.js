// The outer fixed-point demand loop — the core mechanism. EPANET allows only one
// global emitter exponent, but each outlet obeys its own pressure->flow law, so
// instead each iteration sets every reachable outlet as a fixed EPANET demand computed
// from its catalog law at the previous iteration's pressure, re-solves, damps toward
// the new demands, and repeats to convergence. Auto-valves are actuated each iteration
// from the inlet pressure (M2: open iff commanded AND inlet >= min operating pressure,
// with hysteresis). Closed valves / a stopped pump become closed links, so dead
// branches stay numerically stable; their demands are zeroed via a reachability sweep.

import {
  ALPHA,
  P_TOL_BAR,
  Q_TOL_M3H,
  MAX_ITERS,
  STABLE_ITERS,
  VALVE_OPEN_BAR,
  VALVE_STAY_BAR,
} from "./config.js";
import { buildTopology } from "./network.js";
import { toInp } from "./inp.js";
import { solveInp } from "./epanet-runner.js";
import { outletDemandAt } from "./outlets.js";

const epOf = (id) => id.replace(/\./g, "_");

// Which flow nodes does water actually reach, given pump and valve states? BFS from
// the reservoir over the flow graph, refusing to cross a stopped pump or a shut valve.
export function computeReachable(model, pumpOn, valveOpen) {
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
    for (const c of node.to) {
      if (!reachable.has(c)) {
        reachable.add(c);
        queue.push(c);
      }
    }
  }
  return reachable;
}

// state = { pumpOn, valveCommanded:{<valve flowId>:bool}, manualOpen:{<valve flowId>:bool} }
export function solveSteady(model, state, hyd) {
  const { flowNodes, curves } = model;
  const pumpOn = !!state.pumpOn;
  const valveCommanded = state.valveCommanded || {};
  const manualOpen = state.manualOpen || {};

  const outlets = [...flowNodes.values()].filter((n) => n.role === "outlet");

  // valveOpen tracks the live open/closed state of every valve. Manual valves are
  // mechanical: open exactly when their handle is opened. Auto valves start closed and
  // are actuated by pressure below.
  const valveOpen = {};
  for (const n of flowNodes.values()) {
    if (n.role === "valve-auto") valveOpen[n.id] = false;
    if (n.role === "valve-manual") valveOpen[n.id] = !!manualOpen[n.id];
  }

  const q_prev = new Map(outlets.map((o) => [o.id, 0]));
  let p_prev = {}; // epanet id -> bar (default 0)
  const demands = new Map(outlets.map((o) => [o.id, 0]));
  const commandedNotOpening = {};

  let res = null;
  let topo = null;
  let reachable = null;
  let converged = false;
  let stable = 0;
  let iters = 0;

  for (let iter = 1; iter <= MAX_ITERS; iter++) {
    iters = iter;
    reachable = computeReachable(model, pumpOn, valveOpen);

    // pressure-driven, damped demands
    let maxdq = 0;
    for (const o of outlets) {
      const pAt = p_prev[epOf(o.id)] || 0;
      const target = reachable.has(o.id) ? outletDemandAt(o, pAt, curves) : 0;
      const prev = q_prev.get(o.id);
      const damped = prev + ALPHA * (target - prev);
      demands.set(o.id, damped);
      maxdq = Math.max(maxdq, Math.abs(damped - prev));
    }

    topo = buildTopology(model, { pumpOn, valveOpen, demands });
    res = solveInp(hyd, toInp(topo), { nodeIds: topo.nodeIds, linkIds: topo.linkIds });

    // pressure convergence over reachable real nodes
    let maxdp = 0;
    for (const n of flowNodes.values()) {
      if (n.role === "pipe" || n.role === "pump" || n.role.startsWith("valve")) continue;
      if (!reachable.has(n.id)) continue;
      const e = epOf(n.id);
      const now = res.pressureBar[e];
      if (Number.isFinite(now)) maxdp = Math.max(maxdp, Math.abs(now - (p_prev[e] || 0)));
    }

    // actuate auto-valves for the next iteration from this solve's inlet pressures
    for (const v of topo.valves) {
      if (!v.isAuto) continue;
      const inletP = res.pressureBar[v.n1];
      const commanded = !!valveCommanded[v.flowId];
      let open = false;
      if (commanded && Number.isFinite(inletP)) {
        open = valveOpen[v.flowId] ? inletP >= VALVE_STAY_BAR : inletP >= VALVE_OPEN_BAR;
      }
      valveOpen[v.flowId] = open;
      commandedNotOpening[v.flowId] = commanded && !open;
    }

    p_prev = res.pressureBar;
    for (const o of outlets) q_prev.set(o.id, demands.get(o.id));

    stable = maxdp < P_TOL_BAR && maxdq < Q_TOL_M3H ? stable + 1 : 0;
    if (stable >= STABLE_ITERS) {
      converged = true;
      break;
    }
  }

  // mass balance: total outflow == pump supply
  const pumpFlow = topo.pumpLinkId ? res.flow[topo.pumpLinkId] : 0;
  let outSum = 0;
  for (const o of outlets) if (reachable.has(o.id)) outSum += demands.get(o.id);

  return {
    pressureBar: res.pressureBar, // raw EPANET pressures (mask with `filled`)
    headM: res.headM,
    flow: res.flow,
    demands, // flow id -> q (m3/h)
    valveOpen,
    commandedNotOpening,
    reachable, // Set of filled flow ids
    pumpFlow,
    outSum,
    massImbalance: Math.abs(pumpFlow - outSum),
    converged,
    iters,
    topo,
  };
}
