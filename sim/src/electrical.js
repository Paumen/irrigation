// Continuity / energization solver over the control circuit (graph.yaml `circuit`).
//
// The circuit is a set of `parts`, each a bag of ports with intra-part `to:` links,
// joined by inter-part `wires`. `acts:` relations are *control* couplings (a coil
// closing a contact, a transformer winding driving its secondaries), NOT galvanic
// continuity, so they are never edges in the continuity graph.
//
// We build one undirected graph of ports and answer a handful of reachability
// questions to decide what is energised:
//   - the adapter primary loop powers the controller (its secondaries are coupled,
//     not wired, so they are gated by the primary being energised);
//   - the controller, when powered and commanding `mv`, energises the relay coil
//     loop, which closes the relay contact;
//   - mains then reaches the pump only through that closed contact and an intact motor;
//   - each zone energises only if commanded AND there is an unbroken loop from its
//     controller output, through its solenoid coil, and back along the SHARED common
//     return — so one break in the common can drop several zones at once.
//
// `acts` is deliberately ignored here (it drives the gating booleans above, which we
// compute explicitly); the relay contact and the transformer coupling are the only two
// non-galvanic couplings in this circuit and both are handled by name.

// Subpart keys that are metadata, not ports.
const META_KEYS = new Set(["model", "pump_lead_s", "coil_energized_closes"]);

// Controller `to:` links model its internal logic driving its outputs — an active
// device, not a passive conductor. Treat those outputs as driven sources instead of
// pass-through wires, otherwise reachability could hop zone->logic->mv and bypass a
// zone's own field coil. The common bus (c_1<->c_2) is passive and IS kept.
const CONTROLLER_ACTIVE = new Set(["ac_1", "ac_2", "logic"]);

// The relay contact is a normally-open switch: it only conducts when the coil loop is
// energised. Both its edges touch this port, so gating on the port id covers them.
const RELAY_CONTACT = "relay.contact";

function resolveTarget(part, target) {
  // Cross-part references are already fully qualified (e.g. "Z1.valve.coil"); bare
  // names are siblings within the same part.
  return target.includes(".") ? target : `${part}.${target}`;
}

// Build the undirected port graph. `blocked` is a Set of open-circuit points: port ids
// ("splice.com_4") and/or wire names ("common_return"). `contactClosed` enables the
// gated relay-contact edges.
export function buildContinuityGraph(circuit, { contactClosed = false, blocked = new Set() } = {}) {
  const adj = new Map();
  const node = (p) => {
    if (!adj.has(p)) adj.set(p, new Set());
    return adj.get(p);
  };
  const edge = (a, b) => {
    if (blocked.has(a) || blocked.has(b)) return;
    if (!contactClosed && (a === RELAY_CONTACT || b === RELAY_CONTACT)) return;
    node(a).add(b);
    node(b).add(a);
  };

  for (const [partName, part] of Object.entries(circuit.parts || {})) {
    for (const [subName, sub] of Object.entries(part)) {
      if (META_KEYS.has(subName)) continue;
      if (sub === null || typeof sub !== "object" || Array.isArray(sub)) continue;
      const id = `${partName}.${subName}`;
      node(id); // register even leaf ports so reachability endpoints exist
      if (partName === "controller" && CONTROLLER_ACTIVE.has(subName)) continue;
      for (const t of sub.to || []) edge(id, resolveTarget(partName, t));
    }
  }

  for (const [wireName, w] of Object.entries(circuit.wires || {})) {
    if (blocked.has(wireName)) continue;
    edge(w.from, w.to);
  }

  return adj;
}

// Plain undirected BFS over the port graph.
export function reachable(adj, from, to) {
  if (!adj.has(from) || !adj.has(to)) return false;
  if (from === to) return true;
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    for (const next of adj.get(queue.shift())) {
      if (next === to) return true;
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

// commands = { mv: bool, zones: {1:bool,2:bool,3:bool,4:bool} }
// blocked  = Set of open-circuit port ids and/or wire names (faults inject here).
export function solveElectrical(circuit, commands = {}, blocked = new Set()) {
  const mv = !!commands.mv;
  const zones = commands.zones || {};

  const g = buildContinuityGraph(circuit, { contactClosed: false, blocked });

  // Adapter primary loop (mains -> winding -> mains); its secondaries are coupled, so
  // the controller is powered only when that loop is closed AND the low-voltage supply
  // wires reach the controller.
  const primaryEnergised = reachable(g, "adapter_socket.l", "adapter_socket.n");
  const controllerPowered =
    primaryEnergised &&
    reachable(g, "adapter.out_1", "controller.ac_1") &&
    reachable(g, "adapter.out_2", "controller.ac_2");

  // Relay coil loop: controller mv out -> coil -> coil common -> controller return.
  const relayCoil =
    controllerPowered && mv && reachable(g, "controller.mv", "controller.c_2");

  // Pump: with the contact closed, mains must trace L -> contact -> pump motor ->
  // neutral. That route is the only galvanic path from grid L to grid N, so it
  // inherently requires both the closed contact and an intact motor.
  const pumpGraph = relayCoil
    ? buildContinuityGraph(circuit, { contactClosed: true, blocked })
    : g;
  const pumpPowered = relayCoil && reachable(pumpGraph, "grid_socket.l", "grid_socket.n");

  // Each zone: commanded AND an unbroken loop output -> own coil -> shared common
  // return. A break in the shared common return drops every zone whose return runs
  // through it; an isolated signal/lead break drops only that zone.
  const zoneEnergised = {};
  for (let n = 1; n <= 4; n++) {
    zoneEnergised[n] =
      controllerPowered &&
      !!zones[n] &&
      reachable(g, `controller.zone_${n}`, "controller.c_2");
  }

  return { primaryEnergised, controllerPowered, relayCoil, pumpPowered, zoneEnergised };
}
