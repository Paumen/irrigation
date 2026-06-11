// `acts:` relations are control couplings, NOT galvanic continuity — never add them as graph edges.

// Excluding controller outputs stops reachability hopping zone->logic->mv and bypassing a zone's
// own coil. The common bus (c_1<->c_2) is passive and must stay reachable.
const CONTROLLER_ACTIVE = new Set(["ac_1", "ac_2", "logic"]);

const RELAY_CONTACT = "relay.contact";

// Bare sibling names resolve within the component; dotted ids are already absolute.
const resolveInternal = (component, target) =>
  target.includes(".") ? target : `${component}.${target}`;

// The circuit is a flat node map (id -> {kind, to, ...}). Components whose kind carries
// `parts` (sockets, adapter, controller, relay) expand into `<id>.<sub>` ports with the
// kind's internal `to:` edges; kindless conductors (wire, splice) stay single nodes. The
// pump's winding (l->motor->n) lives on the flow side, so it is pulled in for any flow
// port the circuit references.
export function buildContinuityGraph(model, { contactClosed = false, blocked = new Set() } = {}) {
  const circuit = model.circuit;
  const kinds = model.kinds;
  if (!circuit || typeof circuit !== "object") {
    throw new Error("electrical: invalid or missing circuit structure");
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

  // flow ports referenced by the circuit -> { flowId: Set(sub) }, for winding pull-in below
  const flowRefs = new Map();
  const noteTarget = (target) => {
    const dot = target.indexOf(".");
    if (dot < 0) return;
    const comp = target.slice(0, dot);
    if (!model.flowNodes.has(comp)) return;
    if (!flowRefs.has(comp)) flowRefs.set(comp, new Set());
    flowRefs.get(comp).add(target.slice(dot + 1));
  };
  const ext = (target) => {
    noteTarget(target);
    return target;
  };

  for (const [id, def] of Object.entries(circuit)) {
    if (!def || typeof def !== "object") continue;
    const parts = kinds[def.kind]?.parts;
    if (parts) {
      for (const [sub, sdef] of Object.entries(parts)) {
        const portId = `${id}.${sub}`;
        node(portId);
        if (def.kind === "controller" && CONTROLLER_ACTIVE.has(sub)) continue;
        if (sdef && typeof sdef === "object") {
          for (const t of sdef.to || []) edge(portId, resolveInternal(id, t));
        }
      }
      // external edges come from the node's {subPort: target} map
      for (const [sub, target] of Object.entries(def.to || {})) {
        edge(`${id}.${sub}`, ext(target));
      }
    } else {
      // single-node conductor (wire, splice): `to` is a plain list
      node(id);
      for (const t of def.to || []) edge(id, ext(t));
    }
  }

  // Pull each referenced flow component's electrical winding into the graph by following
  // `to:` (never `acts:`) from the referenced ports. Hydraulic ports stay disconnected
  // because they are unreachable from the wired-in pins.
  for (const [flowId, subs] of flowRefs) {
    const fparts = kinds[model.flowNodes.get(flowId).kind]?.parts || {};
    const queue = [...subs];
    const seen = new Set(subs);
    while (queue.length) {
      const sub = queue.shift();
      const sdef = fparts[sub];
      if (!sdef || typeof sdef !== "object") continue;
      for (const t of sdef.to || []) {
        edge(`${flowId}.${sub}`, resolveInternal(flowId, t));
        if (!t.includes(".") && !seen.has(t)) {
          seen.add(t);
          queue.push(t);
        }
      }
    }
  }

  return adj;
}

// Wires carrying current = wires on at least one simple path between a closed loop's
// terminals. Reachability is not enough: a dead-end stub off the loop is at potential
// but carries nothing. DFS path enumeration is fine at this graph's size.
function wiresOnPaths(adj, wireNodes, from, to, out) {
  const path = new Set([from]);
  const dfs = (curr) => {
    if (curr === to) {
      for (const n of path) if (wireNodes.has(n)) out.add(n);
      return;
    }
    for (const next of adj.get(curr) || []) {
      if (path.has(next)) continue;
      path.add(next);
      dfs(next);
      path.delete(next);
    }
  };
  dfs(from);
}

function wireNodeSet(circuit) {
  const s = new Set();
  for (const [id, def] of Object.entries(circuit)) {
    if (def && def.kind === "wire") s.add(id);
  }
  return s;
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

export function solveElectrical(model, commands = {}, blocked = new Set()) {
  const mv = !!commands.mv;
  const zones = commands.zones || {};

  // Unplugged supplies are commands (UI plug toggles), not faults: block the live pin.
  const eff = new Set(blocked);
  if (commands.gridPower === false) eff.add("grid_socket.l");
  if (commands.adapterPower === false) eff.add("adapter_socket.l");

  const g = buildContinuityGraph(model, { contactClosed: false, blocked: eff });

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
    ? buildContinuityGraph(model, { contactClosed: true, blocked: eff })
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

  const wireNodes = wireNodeSet(model.circuit);
  const energisedWires = new Set();
  if (primaryEnergised) wiresOnPaths(g, wireNodes, "adapter_socket.l", "adapter_socket.n", energisedWires);
  if (controllerPowered) {
    wiresOnPaths(g, wireNodes, "adapter.out_1", "controller.ac_1", energisedWires);
    wiresOnPaths(g, wireNodes, "adapter.out_2", "controller.ac_2", energisedWires);
  }
  if (relayCoil) wiresOnPaths(g, wireNodes, "controller.mv", "controller.c_2", energisedWires);
  if (pumpPowered) wiresOnPaths(pumpGraph, wireNodes, "grid_socket.l", "grid_socket.n", energisedWires);
  for (let n = 1; n <= 4; n++) {
    if (zoneEnergised[n]) wiresOnPaths(g, wireNodes, `controller.zone_${n}`, "controller.c_2", energisedWires);
  }

  return { primaryEnergised, controllerPowered, relayCoil, pumpPowered, zoneEnergised, energisedWires };
}
