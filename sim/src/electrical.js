// Reachability never passes *through* a load (valve coil, pump motor, relay coil, controller
// transformer); wires, splices and sockets are pass-through conductors. A two-terminal device
// is energised iff the source reaches it via each terminal with the other blocked. The relay's
// 24V coil and 230V contact share one node: the contact conducts only once the coil loop closes.

import { typeOf } from "./model.js";

const LOAD_TYPES = new Set(["valve.auto", "pump.jet", "relay.pumpstart", "control.controller"]);
const isLoad = (id) => LOAD_TYPES.has(typeOf(id));
const isWire = (id) => typeOf(id).startsWith("wiring.");
const zoneOf = (id) => {
  const m = /^Z(\d+)_/.exec(id);
  return m ? Number(m[1]) : null;
};

// A bundle (`to:` keyed by port) splits into one node per child conductor — `pid/port` — so a
// single conductor is a distinct node, not the whole multi-core cable. Plain `to:` arrays keep
// the node as-is, and references carry their full `pid/port` id (no longer collapsed to the bundle).
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

function throughBoth(adj, source, device, [termA, termB], base) {
  const b1 = new Set(base);
  b1.add(termB);
  const b2 = new Set(base);
  b2.add(termA);
  return reachable(adj, source, device, b1) && reachable(adj, source, device, b2);
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

  // controllerGrid is resolved against the unfaulted graph: a fault cutting the feed must turn
  // the controller off, not erase the socket and crash discovery.
  const sockets = ids.filter((id) => typeOf(id) === "source.socket");
  const gridSockets = sockets.filter((s) => ![...(adj.get(s) || [])].some(isLoad));
  const controllerGrid = gridSockets.find((s) =>
    reachable(adj, s, controllerId, blockLoadsExcept(allLoads, new Set(), controllerId)),
  );
  const pumpGrid = gridSockets.find((s) => s !== controllerGrid);
  if (!controllerGrid) throw new Error("solveElectrical: no grid socket feeds the controller");
  if (!pumpGrid) throw new Error("solveElectrical: no grid socket feeds the pump relay");

  const pumpStart = !!(commands.mv ?? commands.pumpStart);
  const zoneCmd = commands.zones || {};
  const gridPlugged = commands.gridPower !== false;
  const adapterPlugged = commands.adapterPower !== false;

  const controllerPowered =
    adapterPlugged &&
    reachable(adj, controllerGrid, controllerId, blockLoadsExcept(allLoads, blocked, controllerId));

  const relayCoilTerms = [...(adj.get(relayId) || [])].filter((n) => typeOf(n).startsWith("wiring.24v"));
  const relayCoil =
    controllerPowered &&
    pumpStart &&
    relayCoilTerms.length === 2 &&
    throughBoth(adj, controllerId, relayId, relayCoilTerms, blockLoadsExcept(allLoads, blocked, relayId));

  const pumpPowered =
    relayCoil &&
    gridPlugged &&
    reachable(adj, pumpGrid, pumpId, blockLoadsExcept(allLoads, blocked, relayId, pumpId));

  const zoneEnergised = {};
  for (const v of valves) {
    const z = zoneOf(v);
    if (z == null) continue;
    const terms = [...(adj.get(v) || [])];
    zoneEnergised[z] =
      controllerPowered &&
      !!zoneCmd[z] &&
      terms.length === 2 &&
      throughBoth(adj, controllerId, v, terms, blockLoadsExcept(allLoads, blocked, v));
  }

  // Per-socket mains presence, feeding the `live` primitive below. A grid socket is live iff its
  // wall plug is in; the pump's own socket sits downstream of the relay contact, so it is live iff
  // the pump is.
  const socketLive = {};
  for (const s of sockets) socketLive[s] = [...(adj.get(s) || [])].some(isLoad) ? pumpPowered : false;
  if (controllerGrid) socketLive[controllerGrid] = adapterPlugged;
  if (pumpGrid) socketLive[pumpGrid] = gridPlugged;

  // `live` — the single electrical state primitive: electricity reaches this node. A node is live
  // when it sits on an energised path (lit below) or is a live socket (mains present at the wall).
  const liveNodes = new Set();
  const light = (path) => {
    if (!path) return;
    for (const node of path) liveNodes.add(node);
  };
  if (controllerPowered) light(pathOf(adj, controllerGrid, controllerId, blockLoadsExcept(allLoads, blocked, controllerId)));
  if (relayCoil) {
    const base = blockLoadsExcept(allLoads, blocked, relayId);
    light(pathOf(adj, controllerId, relayId, new Set([...base, relayCoilTerms[1]])));
    light(pathOf(adj, controllerId, relayId, new Set([...base, relayCoilTerms[0]])));
  }
  if (pumpPowered) light(pathOf(adj, pumpGrid, pumpId, blockLoadsExcept(allLoads, blocked, relayId, pumpId)));
  for (const v of valves) {
    const z = zoneOf(v);
    if (!zoneEnergised[z]) continue;
    const terms = [...(adj.get(v) || [])];
    const base = blockLoadsExcept(allLoads, blocked, v);
    light(pathOf(adj, controllerId, v, new Set([...base, terms[1]])));
    light(pathOf(adj, controllerId, v, new Set([...base, terms[0]])));
  }

  for (const s of sockets) if (socketLive[s]) liveNodes.add(s);
  const live = {};
  for (const id of ids) live[id] = liveNodes.has(id);

  // One electrical primitive out: `live` per node. Consumers read a coil's liveness as
  // live[valveId], the pump's as live[pumpId], the controller's as live[controllerId].
  return { live };
}
