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

  const g = buildContinuityGraph(circuit, { contactClosed: false, blocked });

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
    ? buildContinuityGraph(circuit, { contactClosed: true, blocked })
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

  return { primaryEnergised, controllerPowered, relayCoil, pumpPowered, zoneEnergised };
}
