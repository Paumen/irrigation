// EPANET emitters allow only one global exponent, but each outlet obeys its own catalog law,
// so each iteration sets every outlet as a fixed demand from its law at the previous pressure.
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
import {
  outletDemandAt,
  outletTableMin,
  outletThrowAt,
  outletPrecipMmHr,
  effectiveOutletCfg,
  validateOutletOverrides,
} from "./outlets.js";
import { emptyEffects } from "./faults.js";
import { valveActuation } from "./valve.js";

const epOf = (id) => id.replace(/\./g, "_");
const zoneOf = (id) => {
  const m = /^Z(\d+)_/.exec(id);
  return m ? Number(m[1]) : null;
};

export function computeReachable(model, pumpOn, valveOpen, closedLinks = new Set()) {
  const { flowNodes } = model;
  const reachable = new Set();
  const linkPassable = (n) => {
    if (closedLinks.has(n.id)) return false;
    if (n.role === "pump") return pumpOn;
    if (n.role === "valve-auto" || n.role === "valve-manual") return !!valveOpen[n.id];
    return true;
  };
  const start = [...flowNodes.values()].find((n) => n.role === "reservoir");
  if (!start) throw new Error("computeReachable: no reservoir node in the model");
  const queue = [start.id];
  reachable.add(start.id);
  while (queue.length) {
    const n = flowNodes.get(queue.shift());
    for (const cId of n.to) {
      if (reachable.has(cId)) continue;
      const c = flowNodes.get(cId);
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
  validateOutletOverrides(model, state); // fail-fast on illegal nozzle/arc controls
  const pumpOn = !!(elec.pumpPowered && !fx.pumpDisabled);
  const zoneEnergised = elec.zoneEnergised || {};
  const minLift = model.minOperatingBar ?? VALVE_OPEN_BAR;

  const manualOpen = state.manualOpen || {};
  const bleedOpen = state.bleedOpen || {};
  const throttle = state.throttle || {};
  const floStop = state.floStop || {};
  const solenoidBleed = state.solenoidBleed || {};
  // Flo-Stop is a rotor-only feature; engaged (handle closed) shuts the head's internal seat.
  const floStopEngaged = (o) => o.subkind === "rotor" && floStop[o.id] === false;

  const outlets = [...model.flowNodes.values()].filter((n) => n.role === "outlet");
  const autoValves = [...model.flowNodes.values()].filter((n) => n.role === "valve-auto");
  const manualValves = [...model.flowNodes.values()].filter((n) => n.role === "valve-manual");

  const commandedAuto = (v) =>
    !fx.valveDisabled.has(v.id) &&
    (zoneEnergised[zoneOf(v.id)] === true ||
      !!bleedOpen[v.id] ||
      !!solenoidBleed[v.id] ||
      fx.bleedForcedOpen.has(v.id));

  // start commanded autos open so the first solve can establish inlet pressure
  const valveOpen = {};
  for (const v of autoValves) valveOpen[v.id] = fx.valveForcedOpen.has(v.id) || commandedAuto(v);
  for (const v of manualValves) {
    valveOpen[v.id] = fx.valveForcedOpen.has(v.id) || (!!manualOpen[v.id] && !fx.valveDisabled.has(v.id));
  }

  const dmp = new Map();
  for (const o of outlets) dmp.set(o.id, { q: 0, sign: 0, alpha: ALPHA });

  let prevP = {}; // epId -> bar
  let valveInlet = {}; // flowId -> bar at the valve inlet node
  let valveOutlet = {}; // flowId -> bar at the valve outlet node
  const chamberBar = {}; // valveId -> bonnet-chamber pressure (bar), from the local actuation relation
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

    if (res && !freeze) {
      commandedNotOpening.clear();
      for (const v of autoValves) {
        if (fx.valveForcedOpen.has(v.id)) {
          valveOpen[v.id] = true;
          continue;
        }
        const inlet = valveInlet[v.id] ?? 0;
        const outlet = valveOutlet[v.id] ?? 0;
        const cmd = commandedAuto(v); // the intent: coil energised or bled, regardless of physics
        // Local actuation relation: chamber pressure from the valve's own inlet/outlet (not EPANET).
        const act = valveActuation({
          inletBar: inlet,
          outletBar: outlet,
          coilLive: zoneEnergised[zoneOf(v.id)] === true,
          solenoidBleed: !!solenoidBleed[v.id],
          bonnetBleed: !!bleedOpen[v.id] || fx.bleedForcedOpen.has(v.id),
          throttle: throttle[v.id],
        });
        chamberBar[v.id] = act.chamberBar;
        const vented = act.vented;
        if (!vented) {
          valveOpen[v.id] = false;
        } else if (valveOpen[v.id]) {
          valveOpen[v.id] = inlet >= VALVE_STAY_BAR; // hold open until nearly drained
        } else {
          valveOpen[v.id] = inlet >= minLift; // need min_operating_bar to lift (hysteresis)
        }
        // commanded (intent) but not open — whether from low inlet OR a fault that blocks venting
        if (cmd && !valveOpen[v.id]) commandedNotOpening.add(v.id);
      }
    }

    const reachable = computeReachable(model, pumpOn, valveOpen, fx.closedLinks);
    const demands = new Map();
    const emitters = new Map();
    let maxStep = 0;
    for (const o of outlets) {
      const st = dmp.get(o.id);
      if (!reachable.has(o.id) || floStopEngaged(o)) {
        // unreachable branch OR Flo-Stop engaged: no demand, no emitter — the head is shut
        st.q = 0;
        st.sign = 0;
        st.alpha = ALPHA;
        continue;
      }
      const pPrev = res ? (prevP[epOf(o.id)] ?? 0) : 2.5; // bar; cold-start guess
      const mod = fx.outletMods.get(o.id) || {};
      const cfg = effectiveOutletCfg(o, state);
      const tableMin = outletTableMin(o, model.curves, cfg);
      // below the table's lowest point run as an emitter rather than
      // extrapolating the table toward 0 bar
      if (pPrev < tableMin.pMin_bar) {
        const headMin = tableMin.pMin_bar * M_PER_BAR;
        let coeff = headMin > 0 ? tableMin.qMin / Math.sqrt(headMin) : 0;
        coeff *= mod.flowScale ?? 1;
        // gate to zero near/below zero pressure, else EPANET emitters suck water in
        if (pPrev <= EMITTER_GATE_BAR) coeff = 0;
        if (coeff > 1e-9) emitters.set(o.id, coeff);
        st.q = 0;
        st.sign = 0;
        continue;
      }
      let target = outletDemandAt(o, pPrev, model.curves, cfg) * (mod.flowScale ?? 1);
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
    for (const [nodeId, coeff] of fx.leaks) {
      if (reachable.has(nodeId) && coeff > 0) emitters.set(nodeId, (emitters.get(nodeId) || 0) + coeff);
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

    valveInlet = {};
    valveOutlet = {};
    for (const v of topo.valves) {
      valveInlet[v.flowId] = res.pressureBar[v.n1] ?? 0;
      valveOutlet[v.flowId] = res.pressureBar[v.n2] ?? 0;
    }

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
        return finalize(model, state, fx, pumpOn, valveOpen, chamberBar, reachable, res, topo, commandedNotOpening, iters, true, valvesFrozen);
      }
    } else {
      stable = 0;
    }
  }

  const reachable = computeReachable(model, pumpOn, valveOpen, fx.closedLinks);
  return finalize(model, state, fx, pumpOn, valveOpen, chamberBar, reachable, res, topo, commandedNotOpening, iters, false, valvesFrozen);
}

function finalize(model, state, fx, pumpOn, valveOpen, chamberBar, reachable, res, topo, commandedNotOpening, iters, converged, valvesFrozen) {
  const outlets = [...model.flowNodes.values()].filter((n) => n.role === "outlet");
  const demands = new Map();
  const throws = new Map(); // outletId -> throw radius (m) at its solved inlet pressure
  const precip = new Map(); // outletId -> single-head application rate (mm/hr)
  let outSum = 0;
  for (const o of outlets) {
    const ep = epOf(o.id);
    const q = reachable.has(o.id) ? res.demand[ep] || 0 : 0; // EPANET demand includes emitter outflow
    demands.set(o.id, q);
    outSum += q;
    if (reachable.has(o.id) && q > 0) {
      const cfg = effectiveOutletCfg(o, state);
      const t = outletThrowAt(o, res.pressureBar[ep] ?? 0, model.curves, cfg);
      if (t != null) {
        throws.set(o.id, t);
        const pr = outletPrecipMmHr(q, cfg.arc, t);
        if (pr != null) precip.set(o.id, pr);
      }
    }
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
    throws,
    precip,
    leakFlows,
    pumpOn,
    valveOpen,
    chamberBar,
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
