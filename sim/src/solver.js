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
import { epOf, isLinkNode, nodesByRole, nodeByRole } from "./model.js";

export function computeReachable(model, pumpOn, valveOpen, closedLinks = new Set()) {
  const { flowNodes } = model;
  const reachable = new Set();
  const linkPassable = (n) => {
    if (closedLinks.has(n.id)) return false;
    if (n.role === "pump") return pumpOn;
    if (n.role === "valve-auto" || n.role === "valve-manual") return !!valveOpen[n.id];
    return true;
  };
  const start = nodeByRole(model, "reservoir");
  if (!start) throw new Error("computeReachable: no reservoir node in the model");
  const queue = [start.id];
  reachable.add(start.id);
  while (queue.length) {
    const n = flowNodes.get(queue.shift());
    for (const cId of n.to) {
      if (reachable.has(cId)) continue;
      const c = flowNodes.get(cId);
      if (isLinkNode(c) && !linkPassable(c)) continue;
      reachable.add(cId);
      queue.push(cId);
    }
  }
  return reachable;
}

export function solveSteady(model, controls, elec, hyd, faults) {
  const fx = faults || emptyEffects();
  validateOutletOverrides(model, controls);
  const pumpId = nodeByRole(model, "pump")?.id;
  const pumpOn = !!(elec.live[pumpId] && !fx.pumpDisabled);
  const minLift = model.minOperatingBar ?? VALVE_OPEN_BAR;

  const handle = controls.handle || {};
  const bonnetBleed = controls.bonnetBleed || {};
  const throttle = controls.throttle || {};
  const headShutoff = controls.headShutoff || {};
  const solenoidBleed = controls.solenoidBleed || {};
  // Flo-Stop is rotor-only; headShutoff===false (closed) shuts the head's internal seat.
  const headShutoffEngaged = (o) => o.subkind === "rotor" && headShutoff[o.id] === false;

  const outlets = nodesByRole(model, "outlet");
  const autoValves = nodesByRole(model, "valve-auto");
  const manualValves = nodesByRole(model, "valve-manual");

  const commandedAuto = (v) =>
    !fx.valveDisabled.has(v.id) &&
    (elec.live[v.id] === true ||
      !!bonnetBleed[v.id] ||
      !!solenoidBleed[v.id] ||
      fx.bleedForcedOpen.has(v.id));

  // start commanded autos open so the first solve can establish inlet pressure
  const valveOpen = {};
  for (const v of autoValves) valveOpen[v.id] = fx.valveForcedOpen.has(v.id) || commandedAuto(v);
  for (const v of manualValves) {
    valveOpen[v.id] = fx.valveForcedOpen.has(v.id) || (!!handle[v.id] && !fx.valveDisabled.has(v.id));
  }

  const dmp = new Map();
  for (const o of outlets) dmp.set(o.id, { q: 0, sign: 0, alpha: ALPHA });

  let prevP = {}; // epId -> bar
  let valveInlet = {}; // flowId -> bar
  let valveOutlet = {}; // flowId -> bar
  const chamberBar = {}; // valveId -> bar
  let res = null;
  let topo = null;
  let stable = 0;
  let iters = 0;

  for (let it = 0; it < MAX_ITERS; it++) {
    iters = it + 1;
    const freeze = it >= MAX_ITERS - VALVE_FREEZE_TAIL;

    if (res && !freeze) {
      for (const v of autoValves) {
        if (fx.valveForcedOpen.has(v.id)) {
          valveOpen[v.id] = true;
          continue;
        }
        const inlet = valveInlet[v.id] ?? 0;
        const outlet = valveOutlet[v.id] ?? 0;
        const act = valveActuation({
          inletBar: inlet,
          outletBar: outlet,
          coilLive: elec.live[v.id] === true,
          solenoidBleed: !!solenoidBleed[v.id],
          bonnetBleed: !!bonnetBleed[v.id] || fx.bleedForcedOpen.has(v.id),
          throttle: throttle[v.id],
        });
        chamberBar[v.id] = act.chamberBar;
        const vented = act.vented;
        if (!vented) {
          valveOpen[v.id] = false;
        } else if (valveOpen[v.id]) {
          valveOpen[v.id] = inlet >= VALVE_STAY_BAR; // stay-open threshold (hysteresis vs lift)
        } else {
          valveOpen[v.id] = inlet >= minLift; // lift threshold (hysteresis vs stay)
        }
      }
    }

    const reachable = computeReachable(model, pumpOn, valveOpen, fx.closedLinks);
    const demands = new Map();
    const emitters = new Map();
    let maxStep = 0;
    for (const o of outlets) {
      const st = dmp.get(o.id);
      if (!reachable.has(o.id) || headShutoffEngaged(o)) {
        st.q = 0;
        st.sign = 0;
        st.alpha = ALPHA;
        continue;
      }
      const pPrev = res ? (prevP[epOf(o.id)] ?? 0) : 2.5; // bar
      const mod = fx.outletMods.get(o.id) || {};
      const cfg = effectiveOutletCfg(o, controls);
      const tableMin = outletTableMin(o, model.curves, cfg);
      // below the table's lowest point run as an emitter, not extrapolate the table toward 0 bar
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
        return finalize(model, controls, fx, pumpOn, valveOpen, chamberBar, reachable, res, topo, iters, true);
      }
    } else {
      stable = 0;
    }
  }

  const reachable = computeReachable(model, pumpOn, valveOpen, fx.closedLinks);
  return finalize(model, controls, fx, pumpOn, valveOpen, chamberBar, reachable, res, topo, iters, false);
}

function finalize(model, controls, fx, pumpOn, valveOpen, chamberBar, reachable, res, topo, iters, converged) {
  const outlets = nodesByRole(model, "outlet");
  const demands = new Map();
  const throws = new Map(); // outletId -> throw radius (m)
  const precip = new Map(); // outletId -> application rate (mm/hr)
  let outSum = 0;
  for (const o of outlets) {
    const ep = epOf(o.id);
    const q = reachable.has(o.id) ? res.demand[ep] || 0 : 0; // EPANET demand includes emitter outflow
    demands.set(o.id, q);
    outSum += q;
    if (reachable.has(o.id) && q > 0) {
      const cfg = effectiveOutletCfg(o, controls);
      const t = outletThrowAt(o, res.pressureBar[ep] ?? 0, model.curves, cfg);
      if (t != null) {
        throws.set(o.id, t);
        const pr = outletPrecipMmHr(q, cfg.arc, t);
        if (pr != null) precip.set(o.id, pr);
      }
    }
  }
  // Leaks aren't reported per-node, but their outflow still counts toward mass balance.
  for (const [nodeId] of fx.leaks) outSum += res.demand[epOf(nodeId)] || 0;
  const pumpFlow = topo.pumpLinkId ? Math.abs(res.flow[topo.pumpLinkId] || 0) : 0;
  const massImbalance = pumpOn ? Math.abs(pumpFlow - outSum) : outSum;

  return {
    pressureBar: res.pressureBar,
    headM: res.headM,
    flow: res.flow,
    demands,
    throws,
    precip,
    pumpOn,
    valveOpen,
    chamberBar,
    reachable,
    pumpFlow,
    outSum,
    massImbalance,
    converged,
    iters,
    topo,
  };
}
