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
  if (!circuit || typeof circuit !== "object" || !circuit.parts || !circuit.wires) {
    throw new Error("electrical: invalid or missing circuit structure (need parts + wires)");
  }
  const adj = new Map();
  const node = (p) => {
    if (!adj.has(p)) adj.set(p, new Set());
    return adj.get(p);
  };
  const edge = (a, b) => {
    // register both endpoints even when the edge is dropped, so a blocked/isolated
    // port still exists in the graph and reachable() can tell it apart from a typo
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
      node(id); // register even leaf ports so reachability endpoints exist
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

// Plain undirected BFS over the port graph. Every port referenced anywhere in the
// circuit is registered in the graph (even blocked/isolated ones), so an unknown
// endpoint here is a typo, not a fault state — fail loudly instead of returning false.
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

// Every port reachable from `from`, including itself.
function bfsFrom(adj, from) {
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const curr = queue.shift();
    for (const next of adj.get(curr)) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

// Shortest port path from -> to, or null. Used to attribute loop state to the
// individual wires/ports along it for display.
function findPath(adj, from, to) {
  if (!adj.has(from) || !adj.has(to)) return null;
  if (from === to) return [from];
  const parent = new Map([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const curr = queue.shift();
    for (const next of adj.get(curr)) {
      if (parent.has(next)) continue;
      parent.set(next, curr);
      if (next === to) {
        const path = [];
        for (let p = next; p != null; p = parent.get(p)) path.push(p);
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return null;
}

// port-pair -> wire name, both directions. Path edges with no entry here are
// intra-part links; their state shows on the endpoint ports instead.
function wireEdgeLabels(circuit) {
  const labels = new Map();
  for (const [name, w] of Object.entries(circuit.wires)) {
    labels.set(`${w.from}|${w.to}`, name);
    labels.set(`${w.to}|${w.from}`, name);
  }
  return labels;
}

// commands = { mv: bool, zones: {1:bool,2:bool,3:bool,4:bool} }
// blocked  = Set of open-circuit port ids and/or wire names (faults inject here).
//
// Besides the aggregate booleans, the result carries the three display states per
// wire and per port for the schematic (R12): `asked` (on a commanded path with faults
// disabled), `powered` (on a live path in the real, faulted solve), `broken` (the
// element is faulted itself, or it is the first dead gap on an asked-but-dead path).
export function solveElectrical(circuit, commands = {}, blocked = new Set()) {
  const mv = !!commands.mv;
  const zones = commands.zones || {};

  const g = buildContinuityGraph(circuit, { contactClosed: false, blocked });

  // Adapter primary loop (mains -> winding -> mains); its secondaries are coupled, so
  // the controller is powered only when that loop is closed AND the low-voltage supply
  // wires reach the controller.
  const primaryEnergised = reachable(g, "adapter_socket.l", "adapter_socket.n");
  const supply1 = primaryEnergised && reachable(g, "adapter.out_1", "controller.ac_1");
  const supply2 = primaryEnergised && reachable(g, "adapter.out_2", "controller.ac_2");
  const controllerPowered = supply1 && supply2;

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

  // ---- per-wire / per-port display states ----
  // "Asked" is judged on the fault-free graph: what the current commands would
  // energise if every wire and part were healthy.
  const healthy = buildContinuityGraph(circuit);
  const healthyClosed = buildContinuityGraph(circuit, { contactClosed: true });
  const hPrimary = reachable(healthy, "adapter_socket.l", "adapter_socket.n");
  const hController =
    hPrimary &&
    reachable(healthy, "adapter.out_1", "controller.ac_1") &&
    reachable(healthy, "adapter.out_2", "controller.ac_2");
  const hCoil = hController && mv && reachable(healthy, "controller.mv", "controller.c_2");
  const hPump = hCoil && reachable(healthyClosed, "grid_socket.l", "grid_socket.n");

  // One record per energisation loop. `eligible` gates the broken-gap search: when a
  // loop is dead only because its prerequisite is (controller unpowered, relay coil
  // open), the fault is displayed on the prerequisite loop, not on this one.
  const loops = [
    { from: "adapter_socket.l", to: "adapter_socket.n", asked: true,
      powered: primaryEnergised, real: g, healthy, eligible: true },
    { from: "adapter.out_1", to: "controller.ac_1", asked: hPrimary,
      powered: supply1, real: g, healthy, eligible: primaryEnergised },
    { from: "adapter.out_2", to: "controller.ac_2", asked: hPrimary,
      powered: supply2, real: g, healthy, eligible: primaryEnergised },
    { from: "controller.mv", to: "controller.c_2", asked: mv && hController,
      powered: relayCoil, real: g, healthy, eligible: controllerPowered },
    { from: "grid_socket.l", to: "grid_socket.n", asked: hPump,
      powered: pumpPowered, real: pumpGraph, healthy: healthyClosed, eligible: relayCoil },
  ];
  for (let n = 1; n <= 4; n++) {
    loops.push({
      from: `controller.zone_${n}`, to: "controller.c_2",
      asked: !!zones[n] && hController && reachable(healthy, `controller.zone_${n}`, "controller.c_2"),
      powered: zoneEnergised[n], real: g, healthy, eligible: controllerPowered,
    });
  }

  const labels = wireEdgeLabels(circuit);
  const wires = {};
  for (const name of Object.keys(circuit.wires)) {
    wires[name] = { asked: false, powered: false, broken: false };
  }
  const ports = {};
  for (const id of healthy.keys()) {
    ports[id] = { asked: false, powered: false, broken: false };
  }

  const mark = (path, key) => {
    for (const p of path) ports[p][key] = true;
    for (let i = 0; i + 1 < path.length; i++) {
      const w = labels.get(`${path[i]}|${path[i + 1]}`);
      if (w) wires[w][key] = true;
    }
  };

  for (const L of loops) {
    if (!L.asked) continue;
    const askedPath = findPath(L.healthy, L.from, L.to);
    if (!askedPath) continue;
    mark(askedPath, "asked");
    if (L.powered) {
      const livePath = findPath(L.real, L.from, L.to);
      if (livePath) mark(livePath, "powered");
    } else if (L.eligible) {
      // first asked-but-dead gap: walk the asked path until it leaves the region the
      // source can really reach; the element crossed there is shown as broken
      const live = bfsFrom(L.real, L.from);
      for (let i = 0; i + 1 < askedPath.length; i++) {
        if (live.has(askedPath[i]) && !live.has(askedPath[i + 1])) {
          const w = labels.get(`${askedPath[i]}|${askedPath[i + 1]}`);
          if (blocked.has(askedPath[i + 1])) ports[askedPath[i + 1]].broken = true;
          else if (w) wires[w].broken = true;
          else ports[askedPath[i + 1]].broken = true;
          break;
        }
      }
    }
  }

  // every faulted element displays broken, on a commanded path or not
  for (const b of blocked) {
    if (wires[b]) wires[b].broken = true;
    if (ports[b]) ports[b].broken = true;
  }

  return { primaryEnergised, controllerPowered, relayCoil, pumpPowered, zoneEnergised, wires, ports };
}
