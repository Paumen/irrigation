// Reachability never passes through a load; wires, splices and sockets are pass-through. A
// two-terminal device is energised iff the source reaches it via each terminal with the other
// blocked. The relay's 24V coil and 230V contact share one node: the contact conducts only once
// the coil loop closes.

import { typeOf } from "./model.js";

const LOAD_TYPES = new Set(["valve.auto", "pump.jet", "relay.pumpstart", "control.controller"]);
const isLoad = (id) => LOAD_TYPES.has(typeOf(id));
const isWire = (id) => typeOf(id).startsWith("wiring.");

// A `to:` keyed by port splits into one node per conductor (`pid/port`); plain `to:` arrays keep
// the node as `pid`. References carry their full `pid/port` id.
function buildAdj(electrical) {
  const adj = new Map();
  const ensure = (id) => {
    if (!adj.has(id)) adj.set(id, new Set());
    return adj.get(id);
  };
  const add = (a, b) => {
    ensure(a).add(b);
    ensure(b).add(a);
  };
  for (const [pid, def] of Object.entries(electrical)) {
    const to = def?.to;
    if (to && !Array.isArray(to) && typeof to === "object") {
      for (const [port, refs] of Object.entries(to)) {
        const src = `${pid}/${port}`;
        ensure(src);
        for (const r of Array.isArray(refs) ? refs : [refs]) add(src, String(r));
      }
    } else {
      ensure(pid);
      for (const r of Array.isArray(to) ? to : []) add(pid, String(r));
    }
  }
  return adj;
}

// Start node is always traversable even if blocked; a blocked target is unreachable.
function bfs(adj, from, blocked) {
  const prev = new Map([[from, null]]);
  const q = [from];
  while (q.length) {
    const n = q.shift();
    for (const m of adj.get(n) || []) {
      if (prev.has(m) || blocked.has(m)) continue;
      prev.set(m, n);
      q.push(m);
    }
  }
  return prev;
}

function pathOf(adj, from, to, blocked) {
  if (blocked.has(to)) return null;
  const prev = bfs(adj, from, blocked);
  if (!prev.has(to)) return null;
  const path = [];
  for (let c = to; c != null; c = prev.get(c)) path.push(c);
  return path;
}

const reachable = (adj, from, to, blocked) => pathOf(adj, from, to, blocked) != null;

function blockLoadsExcept(allLoads, base, ...allow) {
  const s = new Set(base);
  for (const id of allLoads) if (!allow.includes(id)) s.add(id);
  return s;
}

// A two-terminal coil energises when a hot source reaches one terminal and the shared return
// reaches the other, closing the loop through the device — either polarity.
function loopClosed(adj, hot, ret, device, [a, b], base) {
  const hotViaA = reachable(adj, hot, device, new Set([...base, b]));
  const retViaB = reachable(adj, ret, device, new Set([...base, a]));
  if (hotViaA && retViaB) return true;
  const hotViaB = reachable(adj, hot, device, new Set([...base, a]));
  const retViaA = reachable(adj, ret, device, new Set([...base, b]));
  return hotViaB && retViaA;
}

export function solveElectrical(model, commands = {}, blocked = new Set()) {
  const electrical = model.electrical || {};
  const adj = buildAdj(electrical);
  const ids = [...adj.keys()];

  const findType = (t) => ids.find((id) => typeOf(id) === t);
  const controllerId = findType("control.controller");
  const relayId = findType("relay.pumpstart");
  const pumpId = findType("pump.jet");
  if (!controllerId) throw new Error("solveElectrical: missing control.controller");
  if (!relayId) throw new Error("solveElectrical: missing relay.pumpstart");
  if (!pumpId) throw new Error("solveElectrical: missing pump.jet");

  const allLoads = new Set(ids.filter(isLoad));
  const valves = ids.filter((id) => typeOf(id) === "valve.auto");

  // Controller output ports are real nodes (`<controller>/<port>`): `common` is the shared 24V
  // return, the rest are the switchable output terminals the controller energises.
  const portNodes = ids.filter((id) => id.startsWith(`${controllerId}/`));
  const commonNode = portNodes.find((id) => id.endsWith("/common"));
  const outPorts = portNodes.filter((id) => id !== commonNode);
  if (!commonNode) throw new Error("solveElectrical: controller has no /common return port");

  // Resolve controllerGrid against the unfaulted graph: a fault cutting the feed must turn the
  // controller off, not erase the socket and crash discovery.
  const sockets = ids.filter((id) => typeOf(id) === "source.socket");
  const gridSockets = sockets.filter((s) => ![...(adj.get(s) || [])].some(isLoad));
  const controllerGrid = gridSockets.find((s) =>
    reachable(adj, s, controllerId, blockLoadsExcept(allLoads, new Set(), controllerId)),
  );
  const pumpGrid = gridSockets.find((s) => s !== controllerGrid);
  if (!controllerGrid) throw new Error("solveElectrical: no grid socket feeds the controller");
  if (!pumpGrid) throw new Error("solveElectrical: no grid socket feeds the pump relay");

  const controllerPowered =
    reachable(adj, controllerGrid, controllerId, blockLoadsExcept(allLoads, blocked, controllerId));

  // The control surface: which controller output ports are energised. The wiring — not the
  // controller — decides whether a port trips the pump relay or lifts a zone valve.
  const energised = (commands.energize || []).filter((p) => outPorts.includes(p));

  // The energised port (if any) whose loop closes through `device` against the shared return.
  const portClosing = (device, terms, base) => {
    if (!controllerPowered || terms.length !== 2) return null;
    return energised.find((p) => loopClosed(adj, p, commonNode, device, terms, base)) || null;
  };

  const relayCoilTerms = [...(adj.get(relayId) || [])].filter((n) => typeOf(n).startsWith("wiring.24v"));
  const relayPort = portClosing(relayId, relayCoilTerms, blockLoadsExcept(allLoads, blocked, relayId));
  const relayCoil = relayPort != null;

  const pumpPowered =
    relayCoil &&
    reachable(adj, pumpGrid, pumpId, blockLoadsExcept(allLoads, blocked, relayId, pumpId));

  const valvePort = {};
  for (const v of valves) {
    valvePort[v] = portClosing(v, [...(adj.get(v) || [])], blockLoadsExcept(allLoads, blocked, v));
  }

  // A grid socket carries mains, live in the healthy baseline (mains-loss is a fault, not a
  // control); the pump's socket sits downstream of the relay contact, so it is live iff the pump is.
  const socketLive = {};
  for (const s of sockets) socketLive[s] = [...(adj.get(s) || [])].some(isLoad) ? pumpPowered : false;
  if (controllerGrid) socketLive[controllerGrid] = true;
  if (pumpGrid) socketLive[pumpGrid] = true;

  const liveNodes = new Set();
  const light = (path) => {
    if (!path) return;
    for (const node of path) liveNodes.add(node);
  };
  // Light a closed coil loop: both legs, from the energised port and from the shared return (the
  // dead polarity's pathOf finds no path and is a no-op).
  const lightLoop = (hot, device, [a, b], base) => {
    light(pathOf(adj, hot, device, new Set([...base, b])));
    light(pathOf(adj, hot, device, new Set([...base, a])));
    light(pathOf(adj, commonNode, device, new Set([...base, b])));
    light(pathOf(adj, commonNode, device, new Set([...base, a])));
  };

  if (controllerPowered) {
    light(pathOf(adj, controllerGrid, controllerId, blockLoadsExcept(allLoads, blocked, controllerId)));
  }
  if (relayCoil) lightLoop(relayPort, relayId, relayCoilTerms, blockLoadsExcept(allLoads, blocked, relayId));
  if (pumpPowered) light(pathOf(adj, pumpGrid, pumpId, blockLoadsExcept(allLoads, blocked, relayId, pumpId)));
  for (const v of valves) {
    if (valvePort[v]) lightLoop(valvePort[v], v, [...(adj.get(v) || [])], blockLoadsExcept(allLoads, blocked, v));
  }

  for (const s of sockets) if (socketLive[s]) liveNodes.add(s);
  const live = {};
  for (const id of ids) live[id] = liveNodes.has(id);

  return { live };
}
