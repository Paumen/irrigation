// `acts:` relations are control couplings, NOT galvanic continuity — never add them as graph edges.

const META_KEYS = new Set(["model", "pump_lead_s", "coil_energized_closes"]);

// Excluding controller outputs stops reachability hopping zone->logic->mv and bypassing a zone's
// own coil. The common bus (c_1<->c_2) is passive and must stay reachable.
const CONTROLLER_ACTIVE = new Set(["ac_1", "ac_2", "logic"]);

const RELAY_CONTACT = "relay.contact";

function resolveTarget(part, target) {
  return target.includes(".") ? target : `${part}.${target}`;
}

export function buildContinuityGraph(circuit, { contactClosed = false, blocked = new Set() } = {}) {
  if (!circuit || typeof circuit !== "object" || !circuit.parts || !circuit.wires) {
    throw new Error("electrical: invalid or missing circuit structure (need parts + wires)");
  }
  const adj = new Map();
  const node = (p) => {
    if (!adj.has(p)) adj.set(p, new Set());
    return adj.get(p);
  };
  const edge = (a, b) => {
    // register both endpoints even when the edge is dropped, so a blocked port stays distinguishable from a typo
    node(a);
    node(b);
    if (blocked.has(a) || blocked.has(b)) return;
    if (!contactClosed && (a === RELAY_CONTACT || b === RELAY_CONTACT)) return;
    adj.get(a).add(b);
    adj.get(b).add(a);
  };

  for (const [partName, part] of Object.entries(circuit.parts)) {
    for (const [subName, sub] of Object.entries(part)) {
      if (META_KEYS.has(subName)) continue;
      if (sub === null || typeof sub !== "object" || Array.isArray(sub)) continue;
      const id = `${partName}.${subName}`;
      node(id);
      if (partName === "controller" && CONTROLLER_ACTIVE.has(subName)) continue;
      for (const t of sub.to || []) edge(id, resolveTarget(partName, t));
    }
  }

  for (const [wireName, w] of Object.entries(circuit.wires)) {
    if (blocked.has(wireName)) continue;
    edge(w.from, w.to);
  }

  return adj;
}

const edgeKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// edge -> wireName lookup; depends only on the static wiring, so cache per circuit.
const wireOfByCircuit = new WeakMap();
function wireOfCache(circuit) {
  let m = wireOfByCircuit.get(circuit);
  if (!m) {
    m = new Map();
    for (const [wireName, w] of Object.entries(circuit.wires)) {
      m.set(edgeKey(w.from, w.to), wireName);
    }
    wireOfByCircuit.set(circuit, m);
  }
  return m;
}

// Wires carrying current = wires on at least one simple path between a closed loop's
// terminals. Reachability is not enough: a dead-end stub off the loop is at potential
// but carries nothing. DFS path enumeration is fine at this graph's size.
function wiresOnPaths(adj, wireOf, from, to, out) {
  const visited = new Set([from]);
  const path = [];
  const dfs = (curr) => {
    if (curr === to) {
      for (const e of path) {
        const w = wireOf.get(e);
        if (w) out.add(w);
      }
      return;
    }
    for (const next of adj.get(curr) || []) {
      if (visited.has(next)) continue;
      visited.add(next);
      path.push(edgeKey(curr, next));
      dfs(next);
      path.pop();
      visited.delete(next);
    }
  };
  dfs(from);
}

// Every referenced port is registered (even blocked ones), so an unknown endpoint is a typo,
// not a fault state — throw instead of returning false.
export function reachable(adj, from, to) {
  if (!adj.has(from)) throw new Error(`electrical: unknown port "${from}" in continuity graph`);
  if (!adj.has(to)) throw new Error(`electrical: unknown port "${to}" in continuity graph`);
  if (from === to) return true;
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const curr = queue.shift();
    for (const next of adj.get(curr)) {
      if (next === to) return true;
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

export function solveElectrical(circuit, commands = {}, blocked = new Set()) {
  const mv = !!commands.mv;
  const zones = commands.zones || {};

  // Unplugged supplies are commands (UI plug toggles), not faults: block the live pin.
  const eff = new Set(blocked);
  if (commands.gridPower === false) eff.add("grid_socket.l");
  if (commands.adapterPower === false) eff.add("adapter_socket.l");

  const g = buildContinuityGraph(circuit, { contactClosed: false, blocked: eff });

  // Secondaries are coupled, not wired: controller is powered only when the primary loop is
  // closed AND the low-voltage wires reach it.
  const primaryEnergised = reachable(g, "adapter_socket.l", "adapter_socket.n");
  const supply1 = primaryEnergised && reachable(g, "adapter.out_1", "controller.ac_1");
  const supply2 = primaryEnergised && reachable(g, "adapter.out_2", "controller.ac_2");
  const controllerPowered = supply1 && supply2;

  const relayCoil =
    controllerPowered && mv && reachable(g, "controller.mv", "controller.c_2");

  // Grid L->N is the only galvanic pump path, so it needs both the closed contact and an intact motor.
  const pumpGraph = relayCoil
    ? buildContinuityGraph(circuit, { contactClosed: true, blocked: eff })
    : g;
  const pumpPowered = relayCoil && reachable(pumpGraph, "grid_socket.l", "grid_socket.n");

  // Zones share the common return: a break in it drops every zone routed through it, not just one.
  const zoneEnergised = {};
  for (let n = 1; n <= 4; n++) {
    zoneEnergised[n] =
      controllerPowered &&
      !!zones[n] &&
      reachable(g, `controller.zone_${n}`, "controller.c_2");
  }

  const wireOf = wireOfCache(circuit);
  const energisedWires = new Set();
  if (primaryEnergised) wiresOnPaths(g, wireOf, "adapter_socket.l", "adapter_socket.n", energisedWires);
  if (controllerPowered) {
    wiresOnPaths(g, wireOf, "adapter.out_1", "controller.ac_1", energisedWires);
    wiresOnPaths(g, wireOf, "adapter.out_2", "controller.ac_2", energisedWires);
  }
  if (relayCoil) wiresOnPaths(g, wireOf, "controller.mv", "controller.c_2", energisedWires);
  if (pumpPowered) wiresOnPaths(pumpGraph, wireOf, "grid_socket.l", "grid_socket.n", energisedWires);
  for (let n = 1; n <= 4; n++) {
    if (zoneEnergised[n]) wiresOnPaths(g, wireOf, `controller.zone_${n}`, "controller.c_2", energisedWires);
  }

  return { primaryEnergised, controllerPowered, relayCoil, pumpPowered, zoneEnergised, energisedWires };
}
