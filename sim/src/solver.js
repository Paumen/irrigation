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

// "Z1.valve" -> 1, used to look up that valve's zone in the electrical result.
const zoneOf = (flowId) => {
  const m = flowId.match(/^Z(\d+)\./);
  return m ? Number(m[1]) : null;
};

// Which flow nodes does water actually reach, given pump and valve states? BFS from
// the reservoir over the flow graph, refusing to cross a stopped pump, a shut valve,
// or a link sealed by a full clog.
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

// state = the mechanical / positional inputs:
//   { manualOpen:{<valve flowId>:bool}, bleedOpen:{<valve flowId>:bool},
//     floStop:{<rotor flowId>:bool}     — rotor flo-stop closed: head stays filled
//                                         (pressure displays) but discharges nothing,
//     throttle:{<valve flowId>:0..1}    — auto-valve flow-control screw opening,
//                                         1 = factory-open, <=THROTTLE_MIN = seated shut }
// elec  = ElecResult from solveElectrical: { pumpPowered, zoneEnergised:{1..4}, … }
//   (controller commands are routed through the wiring to produce this)
// faults = compiled FaultEffects (faults.js compileFaults); omitted = all healthy.
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

  // Fault mods rewrite an outlet's law once, up front: swapped nozzle/arc/bore rows,
  // lost regulator clamp, clog flow scaling, or "discharge as an open orifice"
  // (flush plug) which moves the outlet into the emitter set below.
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

  // Rotor/spray outlets obey table laws and are driven by the outer demand loop.
  // Stream nozzles (and faulted heads dumping through an open flush plug) are open
  // orifices: solved as EPANET emitters (q = C·√h) so EPANET resolves their
  // near-zero-pressure discharge directly, where the demand loop would oscillate.
  // Their emitter coefficient is constant; only reachability gates them.
  const isEmitterOutlet = (o) => o.subkind === "stream" || !!eff.get(o.id).orifice;
  const demandOutlets = outlets.filter((o) => !isEmitterOutlet(o));
  const emitterOutlets = outlets.filter(isEmitterOutlet);

  // Below its table's lowest point a demand outlet's law is exactly qMin*sqrt(p/pMin)
  // — an emitter law. A starved outlet (e.g. behind a nearly-sealed clog) is swapped
  // to an EPANET emitter in that regime: the demand fixed point is singular as p -> 0,
  // while EPANET solves the sqrt law directly. The two representations agree at pMin,
  // so the handoff is continuous.
  const tableMin = new Map(demandOutlets.map((o) => [o.id, outletTableMin(eff.get(o.id).outlet, curves)]));

  // valveOpen tracks the live open/closed state of every valve. Manual valves are
  // mechanical: open exactly when their handle is opened (unless a fault jams them).
  // Auto valves start closed and are actuated by pressure below; a fault can pin
  // either kind open (torn diaphragm) or shut (jammed pilot).
  const valveOpen = {};
  for (const n of flowNodes.values()) {
    if (n.role === "valve-auto") valveOpen[n.id] = fx.valveForcedOpen.has(n.id);
    if (n.role === "valve-manual") {
      valveOpen[n.id] =
        fx.valveForcedOpen.has(n.id) || (!!manualOpen[n.id] && !fx.valveDisabled.has(n.id));
    }
  }

  // Adaptive per-quantity damping for every value the outer loop feeds back into
  // EPANET (outlet demands AND fading emitter coefficients): a steep local
  // pressure->flow gain (a head behind a nearly-sealed clog, an emitter at the gate
  // boundary) makes the plain-ALPHA iteration ring, so each quantity's step is halved
  // whenever its update flips sign and recovers gently while it stays monotone.
  // maxStep accumulates the largest damped step of the iteration (the dq half of the
  // convergence test).
  const dampState = new Map(); // key -> { v, a, d }
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
    reachable = computeReachable(model, pumpOn, valveOpen, fx.closedLinks);

    // Starved/leak emitters fade out near zero pressure: an emitter held at negative
    // pressure would suck water IN, where the real part draws air and stops.
    const gateOf = (flowId) =>
      Math.max(0, Math.min(1, (p_prev[epOf(flowId)] || 0) / EMITTER_GATE_BAR));

    // pressure-driven, damped demands (rotor/spray table laws); starved outlets run
    // as damped emitters instead (see tableMin above)
    const emitters = new Map();
    maxStep = 0;
    for (const o of demandOutlets) {
      const pAt = p_prev[epOf(o.id)] || 0;
      const e = eff.get(o.id);
      const tm = tableMin.get(o.id);
      // a flo-stopped head stays on a filled branch (its pressure displays) but its
      // nozzle is mechanically shut: zero discharge regardless of pressure
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

    // orifice outlets and fault leaks: active emitter only while reachable (an
    // isolated emitter on a dead branch would inject phantom flow).
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
        // a stuck-open valve (torn diaphragm, vented chamber) ignores actuation
        if (fx.valveForcedOpen.has(v.flowId)) {
          valveOpen[v.flowId] = true;
          commandedNotOpening[v.flowId] = false;
          continue;
        }
        const inletP = res.pressureBar[v.n1];
        // energised through healthy wiring, or its bleed screw opened by hand
        // (or stuck open by a fault)
        const commanded =
          !!zoneEnergised[zoneOf(v.flowId)] ||
          !!bleedOpen[v.flowId] ||
          fx.bleedForcedOpen.has(v.flowId);
        // a jammed pilot (clogged solenoid path, seated flow control) can never lift
        if (fx.valveDisabled.has(v.flowId)) {
          valveOpen[v.flowId] = false;
          commandedNotOpening[v.flowId] = commanded;
          continue;
        }
        // a valve on a dead branch cannot lift no matter what EPANET reports there —
        // never trust pressures on disconnected nodes
        const wet = reachable.has(v.flowId);
        // a fully-seated flow-control screw pins the diaphragm down mechanically
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

  // a jammed manual valve (stripped handle) asked to open reports as commanded-but-
  // not-opening, same as an auto valve that cannot lift
  for (const n of flowNodes.values()) {
    if (n.role === "valve-manual") {
      commandedNotOpening[n.id] = !!manualOpen[n.id] && !valveOpen[n.id];
    }
  }

  // mass balance: total outflow == total reservoir inflow. EPANET reports a source
  // reservoir's demand as negative (water leaving it into the network), so the inflow
  // is the negated sum over reservoirs — robust to gravity-fed or multi-pump networks.
  const totalInflow = topo.reservoirs.reduce((sum, r) => sum - res.demand[r.id], 0);
  const pumpFlow = topo.pumpLinkId ? res.flow[topo.pumpLinkId] : 0;
  // Take every discharge point's flow from EPANET's node demand — uniform across
  // table-law demands and emitters (stream outlets, fault leaks), so all of it lands
  // in both the reported maps and the mass balance. A leak sharing a head's junction
  // is indistinguishable there and reports through the head's own discharge.
  const dischargeIds = new Set(outlets.map((o) => o.id));
  const leakFlows = new Map(); // leak node flow id -> q (m3/h), non-outlet nodes only
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
    pressureBar: res.pressureBar, // raw EPANET pressures (mask with `filled`)
    headM: res.headM,
    flow: res.flow,
    demands, // flow id -> q (m3/h)
    leakFlows, // fault-leak node flow id -> q (m3/h)
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
