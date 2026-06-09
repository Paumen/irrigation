// The outer fixed-point demand loop — the core mechanism. EPANET allows only one
// global emitter exponent, but each outlet obeys its own pressure->flow law, so
// instead each iteration sets every reachable outlet as a fixed EPANET demand computed
// from its catalog law at the previous iteration's pressure, re-solves, damps toward
// the new demands, and repeats to convergence. Auto-valves are actuated each iteration
// from the inlet pressure: open iff actuation-commanded AND inlet >= min operating
// pressure, with hysteresis. An auto-valve is actuation-commanded when its zone's
// solenoid is energised through healthy wiring (the M4 electrical solve) OR its bleed
// screw is opened manually. The pump runs iff its circuit is powered (also the
// electrical solve). Closed valves / a stopped pump become closed links, so dead
// branches stay numerically stable; their demands are zeroed via a reachability sweep.

import {
  ALPHA,
  P_TOL_BAR,
  Q_TOL_M3H,
  MAX_ITERS,
  STABLE_ITERS,
  VALVE_OPEN_BAR,
  VALVE_STAY_BAR,
  VALVE_FREEZE_TAIL,
} from "./config.js";
import { buildTopology } from "./network.js";
import { toInp } from "./inp.js";
import { solveInp } from "./epanet-runner.js";
import { outletDemandAt, streamEmitterCoeff } from "./outlets.js";

const epOf = (id) => id.replace(/\./g, "_");

// "Z1.valve" -> 1, used to look up that valve's zone in the electrical result.
const zoneOf = (flowId) => {
  const m = flowId.match(/^Z(\d+)\./);
  return m ? Number(m[1]) : null;
};

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

// state = { manualOpen:{<valve flowId>:bool}, bleedOpen:{<valve flowId>:bool} }  (the
//   mechanical / positional inputs)
// elec  = ElecResult from solveElectrical: { pumpPowered, zoneEnergised:{1..4}, … }
//   (controller commands are routed through the wiring to produce this)
export function solveSteady(model, state, elec, hyd) {
  if (!elec || typeof elec.pumpPowered !== "boolean" || !elec.zoneEnergised) {
    throw new Error("solver: missing or invalid electrical solve result (elec)");
  }
  const { flowNodes, curves } = model;
  const pumpOn = elec.pumpPowered;
  const zoneEnergised = elec.zoneEnergised;
  const manualOpen = state.manualOpen || {};
  const bleedOpen = state.bleedOpen || {};
  const liftBar = model.minOperatingBar ?? VALVE_OPEN_BAR;

  const outlets = [...flowNodes.values()].filter((n) => n.role === "outlet");
  // Rotor/spray outlets obey table laws and are driven by the outer demand loop.
  // Stream nozzles are open orifices: solved as EPANET emitters (q = C·√h) so EPANET
  // resolves their near-zero-pressure discharge directly, where the demand loop would
  // oscillate. Their emitter coefficient is constant; only reachability gates them.
  const demandOutlets = outlets.filter((o) => o.subkind !== "stream");
  const streamOutlets = outlets.filter((o) => o.subkind === "stream");

  // valveOpen tracks the live open/closed state of every valve. Manual valves are
  // mechanical: open exactly when their handle is opened. Auto valves start closed and
  // are actuated by pressure below.
  const valveOpen = {};
  for (const n of flowNodes.values()) {
    if (n.role === "valve-auto") valveOpen[n.id] = false;
    if (n.role === "valve-manual") valveOpen[n.id] = !!manualOpen[n.id];
  }

  const q_prev = new Map(demandOutlets.map((o) => [o.id, 0]));
  let p_prev = {}; // epanet id -> bar (default 0)
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
    reachable = computeReachable(model, pumpOn, valveOpen);

    // pressure-driven, damped demands (rotor/spray table laws)
    let maxdq = 0;
    for (const o of demandOutlets) {
      const pAt = p_prev[epOf(o.id)] || 0;
      const target = reachable.has(o.id) ? outletDemandAt(o, pAt, curves) : 0;
      const prev = q_prev.get(o.id);
      const damped = prev + ALPHA * (target - prev);
      demands.set(o.id, damped);
      maxdq = Math.max(maxdq, Math.abs(damped - prev));
    }

    // stream nozzles: active emitter only while reachable (an isolated emitter on a
    // dead branch would inject phantom flow), otherwise no discharge.
    const emitters = new Map();
    for (const o of streamOutlets) {
      if (reachable.has(o.id)) emitters.set(o.id, streamEmitterCoeff(o.params));
    }

    topo = buildTopology(model, { pumpOn, valveOpen, demands, emitters });
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

    // actuate auto-valves for the next iteration from this solve's inlet pressures;
    // in the final iterations the states are frozen so a flapping valve can't keep
    // the demand fixed point from settling
    if (iter > MAX_ITERS - VALVE_FREEZE_TAIL) {
      valvesFrozen = true;
    } else {
      for (const v of topo.valves) {
        if (!v.isAuto) continue;
        const inletP = res.pressureBar[v.n1];
        // energised through healthy wiring, or its bleed screw opened by hand
        const commanded = !!zoneEnergised[zoneOf(v.flowId)] || !!bleedOpen[v.flowId];
        // a valve on a dead branch cannot lift no matter what EPANET reports there —
        // never trust pressures on disconnected nodes
        const wet = reachable.has(v.flowId);
        let open = false;
        if (commanded && wet && Number.isFinite(inletP)) {
          open = valveOpen[v.flowId] ? inletP >= VALVE_STAY_BAR : inletP >= liftBar;
        }
        valveOpen[v.flowId] = open;
        commandedNotOpening[v.flowId] = commanded && !open;
      }
    }

    p_prev = res.pressureBar;
    for (const o of demandOutlets) q_prev.set(o.id, demands.get(o.id));

    stable = maxdp < P_TOL_BAR && maxdq < Q_TOL_M3H ? stable + 1 : 0;
    if (stable >= STABLE_ITERS) {
      converged = true;
      break;
    }
  }

  // mass balance: total outflow == total reservoir inflow. EPANET reports a source
  // reservoir's demand as negative (water leaving it into the network), so the inflow
  // is the negated sum over reservoirs — robust to gravity-fed or multi-pump networks.
  const totalInflow = topo.reservoirs.reduce((sum, r) => sum - res.demand[r.id], 0);
  const pumpFlow = topo.pumpLinkId ? res.flow[topo.pumpLinkId] : 0;
  // Take every outlet's discharge from EPANET's node demand — uniform across table-law
  // demands and emitter (stream) outlets, so emitter flow lands in both the reported
  // map and the mass balance.
  let outSum = 0;
  for (const o of outlets) {
    const q = reachable.has(o.id) ? res.demand[epOf(o.id)] || 0 : 0;
    demands.set(o.id, q);
    if (reachable.has(o.id)) outSum += q;
  }

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
    massImbalance: Math.abs(totalInflow - outSum),
    converged,
    iters,
    valvesFrozen, // true when the anti-flap freeze engaged; treat valve states with suspicion
    topo,
  };
}
