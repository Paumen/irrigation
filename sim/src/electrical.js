// Continuity over system.yaml's `electrical` section. Nodes are component ports, addressed
// `<instanceId>/<portPath>` (e.g. H1_control.controller/port_1, Z2_valve.auto/solenoid/coil).
// Each wiring/relay/transformer/motor/solenoid contributes hardcoded internal continuity;
// the `to:` relations are the connections between components. `condition:`/`drive:` couplings
// in the YAML are control couplings, never galvanic — they are not edges here.

import { typeOf } from "./model.js";

// Internal galvanic continuity per component type, as relative port-path pairs.
// `wire`: the edge is a cable conductor (counts toward energised-wire reporting).
// `contact`: the edge only conducts when the relay contact is closed.
function internalEdges(type) {
  switch (type) {
    case "wiring.230v":
      return [
        { a: "line/inlet", b: "line/outlet", wire: true },
        { a: "neutral/inlet", b: "neutral/outlet", wire: true },
        { a: "earth/inlet", b: "earth/outlet", wire: true },
      ];
    case "wiring.24v":
      return [{ a: "inlet", b: "outlet", wire: true }];
    case "wiring.splice":
      return [
        { a: "inlet", b: "outlet_1", wire: true },
        { a: "inlet", b: "outlet_2", wire: true },
      ];
    case "transform.plug":
      // primary winding only; the 24 V secondary is coupled (condition:), not galvanic.
      return [{ a: "line", b: "winding" }, { a: "winding", b: "neutral" }];
    case "relay.pumpstart":
      return [
        { a: "coil_in", b: "coil" },
        { a: "coil", b: "coil_common" },
        { a: "line", b: "contact", contact: true },
        { a: "contact", b: "load_outlet", contact: true },
      ];
    case "valve.auto":
      return [
        { a: "solenoid/24v_1", b: "solenoid/coil" },
        { a: "solenoid/coil", b: "solenoid/24v_2" },
      ];
    case "pump.jet":
      return [{ a: "motor/line", b: "motor/winding" }, { a: "motor/winding", b: "motor/neutral" }];
    default:
      return []; // source.socket, control.controller: isolated pins
  }
}

// A bare node reference (no port) means that component's inlet (the 2-port wiring / splice
// feeds enter through `inlet`).
const resolveRef = (ref) => (ref.includes("/") ? ref : `${ref}/inlet`);

const downstreamRefs = (to) => {
  if (Array.isArray(to)) return to.slice();
  if (to && typeof to === "object") return Object.values(to).flatMap((v) => (Array.isArray(v) ? v : [v]));
  return [];
};

function buildContinuityGraph(model, { contactClosed = false, blocked = new Set() } = {}) {
  const electrical = model.electrical;
  const adj = new Map();
  const wireOf = new Map(); // edgeKey -> wiring instance id (energised-wire reporting)
  const node = (p) => {
    if (!adj.has(p)) adj.set(p, new Set());
    return adj.get(p);
  };
  const nodeOf = (e) => e.split("/")[0];
  // a blocked id severs a port (exact), every sub-port beneath it, or the whole instance.
  const isBlocked = (e) => {
    for (const b of blocked) if (e === b || e.startsWith(`${b}/`) || nodeOf(e) === b) return true;
    return false;
  };
  const edge = (a, b, { contact = false, wire = null } = {}) => {
    node(a);
    node(b);
    if (contact && !contactClosed) return;
    if (isBlocked(a) || isBlocked(b)) return;
    adj.get(a).add(b);
    adj.get(b).add(a);
    if (wire) wireOf.set(edgeKey(a, b), wire);
  };

  for (const [nid, def] of Object.entries(electrical)) {
    const type = typeOf(nid);
    for (const e of internalEdges(type)) {
      edge(`${nid}/${e.a}`, `${nid}/${e.b}`, { contact: e.contact, wire: e.wire ? nid : null });
    }
    const to = def && def.to;
    if (Array.isArray(to)) {
      for (const t of to) edge(`${nid}/outlet`, resolveRef(t));
    } else if (to && typeof to === "object") {
      for (const [port, targets] of Object.entries(to)) {
        for (const t of Array.isArray(targets) ? targets : [targets]) edge(`${nid}/${port}`, resolveRef(t));
      }
    }
  }

  // The pump motor is reached from the circuit but lives in the water graph (W1_pump.jet),
  // so it is not an `electrical` key — inject its winding continuity here.
  for (const n of model.flowNodes.values()) {
    if (n.role === "pump") for (const e of internalEdges("pump.jet")) edge(`${n.id}/${e.a}`, `${n.id}/${e.b}`);
  }

  return { adj, wireOf };
}

const edgeKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// Wires carrying current = wires on at least one simple path between a closed loop's
// terminals (reachability alone would also light dead-end stubs at potential).
function wiresOnPaths(adj, wireOf, from, to, out) {
  if (!adj.has(from) || !adj.has(to)) return;
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

// Every referenced port is registered (even blocked ones), so an unknown endpoint is a typo.
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

// Locate the fixed install's terminals from the graph (not hardcoded prefixes):
//   - controller / transformer by type
//   - controller grid = the mains socket with no earth pin (class-II transformer supply)
//   - pump grid = the other mains socket whose live feeds a 230 V cable (toward the relay)
//   - zones = controller `port_*` outputs that trace forward to an auto valve
function terminalsOf(electrical) {
  const ids = Object.keys(electrical);
  const byType = (t) => ids.filter((id) => typeOf(id) === t);
  const controllerId = byType("control.controller")[0];
  const transformId = byType("transform.plug")[0];
  const sockets = byType("source.socket");
  const ctrlGrid = sockets.find((s) => !("earth" in (electrical[s].to || {})));
  const pumpGrid = sockets.find(
    (s) => s !== ctrlGrid && typeOf((downstreamRefs(electrical[s].to?.line)[0] || "").split("/")[0]) === "wiring.230v",
  );

  const traceToValve = (startRef) => {
    let cur = (startRef || "").split("/")[0];
    const seen = new Set();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      if (typeOf(cur) === "valve.auto") return cur;
      cur = (downstreamRefs(electrical[cur]?.to)[0] || "").split("/")[0];
    }
    return null;
  };
  const zones = [];
  for (const [port, targets] of Object.entries(electrical[controllerId].to || {})) {
    if (!/^port_/.test(port)) continue;
    const valve = traceToValve(downstreamRefs(targets)[0]);
    if (valve) zones.push({ z: Number(valve.match(/^Z(\d+)_/)[1]), port, valve });
  }
  return { controllerId, transformId, ctrlGrid, pumpGrid, zones };
}

export function solveElectrical(model, commands = {}, blocked = new Set()) {
  const { controllerId, transformId, ctrlGrid, pumpGrid, zones } = terminalsOf(model.electrical);
  const pumpStart = !!(commands.mv ?? commands.pumpStart);
  const zoneCmd = commands.zones || {};

  // Unplugged supplies are commands (UI plug toggles), not faults: block the live pin.
  const eff = new Set(blocked);
  if (commands.gridPower === false) eff.add(`${pumpGrid}/line`);
  if (commands.adapterPower === false) eff.add(`${ctrlGrid}/line`);

  const { adj, wireOf } = buildContinuityGraph(model, { contactClosed: false, blocked: eff });

  const ac = (p) => `${controllerId}/${p}`;
  // Secondaries are coupled, not wired: controller is powered only when the primary loop is
  // closed AND the low-voltage secondaries reach both ac inputs.
  const primaryEnergised = reachable(adj, `${ctrlGrid}/line`, `${ctrlGrid}/neutral`);
  const supply1 = primaryEnergised && reachable(adj, `${transformId}/outlet_1`, ac("ac_line_1"));
  const supply2 = primaryEnergised && reachable(adj, `${transformId}/outlet_2`, ac("ac_line_2"));
  const controllerPowered = supply1 && supply2;

  const relayCoil = controllerPowered && pumpStart && reachable(adj, ac("port_1"), ac("common_1"));

  // Mains L->N is the only galvanic pump path: needs the closed contact and an intact motor.
  const pumpBuild = relayCoil ? buildContinuityGraph(model, { contactClosed: true, blocked: eff }) : { adj, wireOf };
  const pumpPowered = relayCoil && reachable(pumpBuild.adj, `${pumpGrid}/line`, `${pumpGrid}/neutral`);

  // Zones share the V1 common-return chain: a break in it drops every zone routed through it.
  const zoneEnergised = {};
  for (const { z, port } of zones) {
    zoneEnergised[z] = controllerPowered && !!zoneCmd[z] && reachable(adj, ac(port), ac("common_2"));
  }

  const energisedWires = new Set();
  if (primaryEnergised) wiresOnPaths(adj, wireOf, `${ctrlGrid}/line`, `${ctrlGrid}/neutral`, energisedWires);
  if (controllerPowered) {
    wiresOnPaths(adj, wireOf, `${transformId}/outlet_1`, ac("ac_line_1"), energisedWires);
    wiresOnPaths(adj, wireOf, `${transformId}/outlet_2`, ac("ac_line_2"), energisedWires);
  }
  if (relayCoil) wiresOnPaths(adj, wireOf, ac("port_1"), ac("common_1"), energisedWires);
  if (pumpPowered) {
    wiresOnPaths(pumpBuild.adj, pumpBuild.wireOf, `${pumpGrid}/line`, `${pumpGrid}/neutral`, energisedWires);
  }
  for (const { z, port } of zones) {
    if (zoneEnergised[z]) wiresOnPaths(adj, wireOf, ac(port), ac("common_2"), energisedWires);
  }

  return { primaryEnergised, controllerPowered, relayCoil, pumpPowered, zoneEnergised, energisedWires };
}
