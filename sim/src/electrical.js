// Control-wiring continuity solver. Builds an undirected graph of ports from the electrical
// topology (inter-part `to:` edges) plus the intra-part conductor edges each kind implies
// (wire inlet<->outlet, relay coil + switched contact, transformer primary, solenoid coil,
// motor winding, splice fan-out). A device is energised when a closed current path exists:
//   - controller powered      : grid reaches its line AND neutral (transformer primary)
//   - pump powered             : relay coil energised closes the contact, and mains L returns
//                                to N through the closed contact + an intact motor winding
//   - zone N energised         : controller commands it AND a loop runs port -> signal ->
//                                splice -> solenoid coil -> shared common return -> common_2
// `acts:` relations are control, not continuity, and are not modelled here.

import { typeOf } from "./model.js";

const partOf = (node) => node.split("/")[0];
const zoneOf = (id) => {
  const m = /^Z(\d+)_/.exec(id);
  return m ? Number(m[1]) : null;
};

// intra-part conductor edges, by component kind
function intraEdges(partId) {
  const kind = typeOf(partId);
  const e = [];
  const add = (a, b) => e.push([`${partId}/${a}`, `${partId}/${b}`]);
  if (kind === "wiring.230v") for (const c of ["line", "neutral", "earth"]) add(`${c}/inlet`, `${c}/outlet`);
  else if (kind === "wiring.24v")
    for (const c of ["common", "signal_1", "signal_2", "signal_3", "signal_4"]) add(`${c}/inlet`, `${c}/outlet`);
  else if (kind === "wiring.splice") {
    // a bare reference to the splice is its inlet; it fans out to both outlets
    e.push([partId, `${partId}/outlet_1`]);
    e.push([partId, `${partId}/outlet_2`]);
  } else if (kind === "relay.pumpstart") {
    add("coil_in", "coil_common"); // coil loop (always present)
    // the switched line->load_outlet contact is added only in the contact-closed graph
  } else if (kind === "pump.jet") add("motor/line", "motor/neutral"); // winding
  else if (kind === "valve.auto") add("solenoid/24v_1", "solenoid/24v_2"); // coil
  else if (kind === "control.controller") add("line", "neutral"); // transformer primary
  return e;
}

function buildGraph(electrical, contactClosed) {
  const adj = new Map();
  const addEdge = (a, b) => {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b);
    adj.get(b).add(a);
  };

  const parts = new Set(Object.keys(electrical));
  // inter-part edges, collecting every referenced part along the way
  for (const [pid, def] of Object.entries(electrical)) {
    parts.add(pid);
    const to = def.to;
    const edgesFrom = (src, tgts) => {
      for (const t of Array.isArray(tgts) ? tgts : [tgts]) {
        addEdge(src, t);
        parts.add(partOf(t));
      }
    };
    if (Array.isArray(to)) edgesFrom(pid, to);
    else if (to && typeof to === "object") for (const [port, tgts] of Object.entries(to)) edgesFrom(`${pid}/${port}`, tgts);
  }
  // intra-part edges for every part that appears anywhere in the graph
  for (const pid of parts) {
    for (const [a, b] of intraEdges(pid)) addEdge(a, b);
    if (contactClosed && typeOf(pid) === "relay.pumpstart") addEdge(`${pid}/line`, `${pid}/load_outlet`);
  }
  return adj;
}

const isBlocked = (node, blocked) => blocked.has(node) || blocked.has(partOf(node));

// shortest path (for lighting the wires actually carrying current); null if unreachable
function pathOf(adj, from, to, blocked) {
  if (isBlocked(from, blocked) || isBlocked(to, blocked) || !adj.has(from)) return null;
  const prev = new Map([[from, null]]);
  const q = [from];
  while (q.length) {
    const n = q.shift();
    if (n === to) {
      const path = [];
      for (let c = n; c != null; c = prev.get(c)) path.push(c);
      return path;
    }
    for (const m of adj.get(n) || []) {
      if (prev.has(m) || isBlocked(m, blocked)) continue;
      prev.set(m, n);
      q.push(m);
    }
  }
  return null;
}

export function reachable(adj, from, to, blocked = new Set()) {
  return pathOf(adj, from, to, blocked) != null;
}

// controller port feeding each auto-valve zone, traced through the home-run signal cores
function zonePorts(electrical, controllerId) {
  const ctrlTo = electrical[controllerId]?.to || {};
  const homeRun = Object.keys(electrical).find((id) => typeOf(id) === "wiring.24v" && id.startsWith("P"));
  const p1To = (homeRun && electrical[homeRun]?.to) || {};
  const map = {};
  for (const [port, tgts] of Object.entries(ctrlTo)) {
    const sig = /\/(signal_\d+)\//.exec(String(tgts[0] || ""))?.[1];
    if (!sig) continue;
    const downstream = p1To[`${sig}/outlet`]?.[0];
    const z = downstream && zoneOf(partOf(downstream));
    if (z) map[z] = `${controllerId}/${port}`;
  }
  return map;
}

export function solveElectrical(model, commands = {}, blocked = new Set()) {
  const electrical = model.electrical;
  const ids = Object.keys(electrical);
  const controllerId = ids.find((id) => id.endsWith("control.controller"));
  const ctrlSocket = ids.find((id) => id.startsWith("H") && id.endsWith("source.socket"));
  const pumpSocket = ids.find((id) => id.startsWith("S") && id.endsWith("source.socket"));

  const pumpStart = !!(commands.mv ?? commands.pumpStart);
  const zoneCmd = commands.zones || {};

  // plug toggles are commands (not faults): unplugging blocks the live line pin
  const eff = new Set(blocked);
  if (commands.gridPower === false && pumpSocket) eff.add(`${pumpSocket}/line`);
  if (commands.adapterPower === false && ctrlSocket) eff.add(`${ctrlSocket}/line`);

  const adjOpen = buildGraph(electrical, false);
  const adjClosed = buildGraph(electrical, true);

  const controllerPowered =
    !!controllerId &&
    !!ctrlSocket &&
    reachable(adjOpen, `${ctrlSocket}/line`, `${controllerId}/line`, eff) &&
    reachable(adjOpen, `${ctrlSocket}/neutral`, `${controllerId}/neutral`, eff);

  const primaryEnergised = controllerPowered;

  // relay coil loop: controller port_1 -> coil -> common_1
  const relayCoil =
    controllerPowered && pumpStart && reachable(adjOpen, `${controllerId}/port_1`, `${controllerId}/common_1`, eff);

  // pump: with the contact closed, mains L must return to N through the motor winding
  const pumpPowered =
    relayCoil && !!pumpSocket && reachable(adjClosed, `${pumpSocket}/line`, `${pumpSocket}/neutral`, eff);

  const zp = zonePorts(electrical, controllerId);
  const zoneEnergised = {};
  for (const [z, port] of Object.entries(zp)) {
    zoneEnergised[z] =
      controllerPowered && !!zoneCmd[z] && reachable(adjOpen, port, `${controllerId}/common_2`, eff);
  }

  // light the wires on each live path
  const energisedWires = new Set();
  const lightPath = (adj, from, to) => {
    const path = pathOf(adj, from, to, eff);
    if (!path) return;
    for (const node of path) {
      const p = partOf(node);
      if (typeOf(p).startsWith("wiring.")) energisedWires.add(p);
    }
  };
  if (controllerPowered) {
    lightPath(adjOpen, `${ctrlSocket}/line`, `${controllerId}/line`);
    lightPath(adjOpen, `${ctrlSocket}/neutral`, `${controllerId}/neutral`);
  }
  if (relayCoil) lightPath(adjOpen, `${controllerId}/port_1`, `${controllerId}/common_1`);
  if (pumpPowered) lightPath(adjClosed, `${pumpSocket}/line`, `${pumpSocket}/neutral`);
  for (const [z, port] of Object.entries(zp)) {
    if (zoneEnergised[z]) lightPath(adjOpen, port, `${controllerId}/common_2`);
  }

  return { primaryEnergised, controllerPowered, relayCoil, pumpPowered, zoneEnergised, energisedWires };
}
