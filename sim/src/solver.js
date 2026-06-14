// Outer fixed-point loop around EPANET. EPANET emitters allow only one global exponent, but
// each outlet obeys its own catalog law, so each iteration sets every pressure-dependent
// outlet as a fixed EPANET demand computed from its law at the previous pressure, re-solves,
// damps, and repeats to convergence. The same loop actuates the auto valves (energised /
// bleed-open AND inlet >= min_operating_bar, with lift/stay hysteresis) and zeroes dead
// branches via reachability so the disconnected parts never carry false pressure.

import {
  ALPHA,
  ALPHA_MIN,
  EMITTER_GATE_BAR,
  P_TOL_BAR,
  Q_TOL_M3H,
  MAX_ITERS,
  STABLE_ITERS,
  VALVE_OPEN_BAR,
  VALVE_STAY_BAR,
  VALVE_FREEZE_TAIL,
  M_PER_BAR,
} from "./config.js";
import { buildTopology } from "./network.js";
import { toInp } from "./inp.js";
import { solveInp } from "./epanet-runner.js";
import { outletDemandAt, outletTableMin, streamEmitterCoeff } from "./outlets.js";
import { emptyEffects } from "./faults.js";

const epOf = (id) => id.replace(/\./g, "_");
const zoneOf = (id) => {
  const m = /^Z(\d+)_/.exec(id);
  return m ? Number(m[1]) : null;
};

// BFS from the reservoir through open links; nodes not reached are dead (zero demand, no
// trustworthy pressure). A link is impassable when it is a closed pump/valve or a sealed clog.
export function computeReachable(model, pumpOn, valveOpen, closedLinks = new Set()) {
  const { flowNodes } = model;
  const reachable = new Set();
  const linkPassable = (n) => {
    if (closedLinks.has(n.id)) return false;
    if (n.role === "pump") return pumpOn;
    if (n.role === "valve-auto" || n.role === "valve-manual") return !!valveOpen[n.id];
    return true; // pipes
  };
  const start = [...flowNodes.values()].find((n) => n.role === "reservoir");
  if (!start) return reachable;
  const queue = [start.id];
  reachable.add(start.id);
  while (queue.length) {
    const n = flowNodes.get(queue.shift());
    for (const cId of n.to) {
      if (reachable.has(cId)) continue;
      const c = flowNodes.get(cId);
      // a closed link stops water here: neither the link node nor its subtree fills
      if (LINKish(c) && !linkPassable(c)) continue;
      reachable.add(cId);
      queue.push(cId);
    }
  }
  return reachable;
}

const LINKish = (n) =>
  n.role === "pipe" || n.role === "pump" || n.role === "valve-auto" || n.role === "valve-manual";

export function solveSteady(model, state, elec, hyd, faults) {
  const fx = faults || emptyEffects();
  const pumpOn = !!(elec.pumpPowered && !fx.pumpDisabled);
  const zoneEnergised = elec.zoneEnergised || {};
  const minLift = model.minOperatingBar ?? VALVE_OPEN_BAR;

  const manualOpen = state.manualOpen || {};
  const bleedOpen = state.bleedOpen || {};
  const throttle = state.throttle || {};

  const outlets = [...model.flowNodes.values()].filter((n) => n.role === "outlet");
  const autoValves = [...model.flowNodes.values()].filter((n) => n.role === "valve-auto");
  const manualValves = [...model.flowNodes.values()].filter((n) => n.role === "valve-manual");

  // valve command (independent of inlet pressure): energised through good wiring, or bled open.
  const commandedAuto = (v) =>
    !fx.valveDisabled.has(v.id) &&
    (zoneEnergised[zoneOf(v.id)] === true || !!bleedOpen[v.id] || fx.bleedForcedOpen.has(v.id));

  // persistent valve open state (hysteresis); start commanded autos optimistically open so the
  // first solve can establish inlet pressure, then hold/close on the real pressure.
  const valveOpen = {};
  for (const v of autoValves) valveOpen[v.id] = fx.valveForcedOpen.has(v.id) || commandedAuto(v);
  for (const v of manualValves) {
    valveOpen[v.id] = fx.valveForcedOpen.has(v.id) || (!!manualOpen[v.id] && !fx.valveDisabled.has(v.id));
  }

  // per-outlet damping state
  const dmp = new Map();
  for (const o of outlets) dmp.set(o.id, { q: 0, sign: 0, alpha: ALPHA });

  let prevP = {}; // epId -> bar, previous iteration
  let valveInlet = {}; // flowId -> bar at the valve inlet node, previous iteration
  let res = null;
  let topo = null;
  let stable = 0;
  let iters = 0;
  let valvesFrozen = false;
  const commandedNotOpening = new Set();

  for (let it = 0; it < MAX_ITERS; it++) {
    iters = it + 1;
    const freeze = it >= MAX_ITERS - VALVE_FREEZE_TAIL;
    if (freeze) valvesFrozen = true;

    // --- 1. actuate valves from the previous inlet pressures (skip on the cold start) ---
    if (res && !freeze) {
      commandedNotOpening.clear();
      for (const v of autoValves) {
        if (fx.valveForcedOpen.has(v.id)) {
          valveOpen[v.id] = true;
          continue;
        }
        const cmd = commandedAuto(v);
        const inlet = valveInlet[v.id] ?? 0;
        if (!cmd) {
          valveOpen[v.id] = false;
        } else if (valveOpen[v.id]) {
          valveOpen[v.id] = inlet >= VALVE_STAY_BAR; // hold open until nearly drained
        } else {
          valveOpen[v.id] = inlet >= minLift; // need min_operating_bar to lift
        }
        if (cmd && !valveOpen[v.id]) commandedNotOpening.add(v.id);
      }
    }

    // --- 2. reachability + outlet demands/emitters from the previous pressures ---
    const reachable = computeReachable(model, pumpOn, valveOpen, fx.closedLinks);
    const demands = new Map();
    const emitters = new Map();
    let maxStep = 0;
    for (const o of outlets) {
      const st = dmp.get(o.id);
      if (!reachable.has(o.id)) {
        st.q = 0;
        st.sign = 0;
        st.alpha = ALPHA;
        continue;
      }
      const pPrev = res ? (prevP[epOf(o.id)] ?? 0) : 2.5; // bar; cold-start guess
      const mod = fx.outletMods.get(o.id) || {};
      const tableMin = outletTableMin(o, model.curves);
      // Below the table's lowest point (or always, for the stream orifice) run as an emitter
      // that fades to zero with pressure rather than extrapolating the table toward 0 bar.
      if (tableMin == null || pPrev < tableMin.pMin_bar) {
        let coeff;
        if (tableMin == null) {
          coeff = streamEmitterCoeff(o.params); // stream orifice: q = C*sqrt(head_m)
        } else {
          const headMin = tableMin.pMin_bar * M_PER_BAR;
          coeff = headMin > 0 ? tableMin.qMin / Math.sqrt(headMin) : 0;
        }
        coeff *= mod.flowScale ?? 1;
        // gate to zero near/below zero pressure (EPANET emitters would otherwise suck water in)
        if (pPrev <= EMITTER_GATE_BAR) coeff = 0;
        if (coeff > 1e-9) emitters.set(o.id, coeff);
        st.q = 0;
        st.sign = 0;
        continue;
      }
      // demand law with per-outlet adaptive damping
      let target = outletDemandAt(o, pPrev, model.curves) * (mod.flowScale ?? 1);
      if (mod.zeroFlow) target = 0;
      const delta = target - st.q;
      const sign = Math.sign(delta);
      if (st.sign !== 0 && sign !== 0 && sign !== st.sign) st.alpha = Math.max(st.alpha / 2, ALPHA_MIN);
      st.sign = sign;
      const qNew = st.q + st.alpha * delta;
      maxStep = Math.max(maxStep, Math.abs(qNew - st.q));
      st.q = qNew;
      demands.set(o.id, Math.max(qNew, 0));
    }
    // leak emitters (none this milestone, but honour the channel)
    for (const [nodeId, coeff] of fx.leaks) {
      if (reachable.has(nodeId) && coeff > 0) emitters.set(nodeId, (emitters.get(nodeId) || 0) + coeff);
    }

    // --- 3. build INP, solve, read back ---
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

    // record valve inlet pressures for the next actuation pass
    valveInlet = {};
    for (const v of topo.valves) valveInlet[v.flowId] = res.pressureBar[v.n1] ?? 0;

    // --- 4. convergence: pressures + demand steps stable for STABLE_ITERS ---
    let maxdp = 0;
    for (const o of outlets) {
      const ep = epOf(o.id);
      if (!reachable.has(o.id)) continue;
      const p = res.pressureBar[ep];
      if (Number.isFinite(p) && Number.isFinite(prevP[ep])) maxdp = Math.max(maxdp, Math.abs(p - prevP[ep]));
    }
    prevP = { ...res.pressureBar };
    if (res && maxdp < P_TOL_BAR && maxStep < Q_TOL_M3H) {
      if (++stable >= STABLE_ITERS) {
        // one more recompute already reflected; converged
        return finalize(model, state, fx, pumpOn, valveOpen, reachable, res, topo, commandedNotOpening, iters, true, valvesFrozen);
      }
    } else {
      stable = 0;
    }
  }

  const reachable = computeReachable(model, pumpOn, valveOpen, fx.closedLinks);
  return finalize(model, state, fx, pumpOn, valveOpen, reachable, res, topo, commandedNotOpening, iters, false, valvesFrozen);
}

function finalize(model, state, fx, pumpOn, valveOpen, reachable, res, topo, commandedNotOpening, iters, converged, valvesFrozen) {
  const outlets = [...model.flowNodes.values()].filter((n) => n.role === "outlet");
  const demands = new Map();
  let outSum = 0;
  for (const o of outlets) {
    const ep = epOf(o.id);
    const q = reachable.has(o.id) ? res.demand[ep] || 0 : 0; // EPANET demand includes emitter outflow
    demands.set(o.id, q);
    outSum += q;
  }
  const leakFlows = new Map();
  for (const [nodeId] of fx.leaks) {
    const ep = epOf(nodeId);
    const q = res.demand[ep] || 0;
    leakFlows.set(nodeId, q);
    outSum += q;
  }
  const pumpFlow = topo.pumpLinkId ? Math.abs(res.flow[topo.pumpLinkId] || 0) : 0;
  const massImbalance = pumpOn ? Math.abs(pumpFlow - outSum) : outSum;

  return {
    pressureBar: res.pressureBar,
    headM: res.headM,
    flow: res.flow,
    demands,
    leakFlows,
    valveOpen,
    commandedNotOpening,
    reachable,
    pumpFlow,
    outSum,
    massImbalance,
    converged,
    iters,
    valvesFrozen,
    topo,
  };
}
