// Fixed, hand-drawn layout of the control circuit, top-to-bottom by causality: the
// controller on top (fed by its 24 VAC adapter), zone outputs dropping through field
// splices to the solenoid row with the shared common chained beneath, MV + C falling
// straight into the relay's coil terminals, and the actuated mains row (grid socket
// -> relay -> pump) along the bottom.
//
// The circuit is small and static, so an auto-layouter only ever produced a
// topologically-correct but physically meaningless arrangement; these coordinates ARE
// the display. The TOPOLOGY still comes from graph.yaml: every wire must have a route
// here and every route endpoint must sit on an anchor of that wire's own ports —
// validated loudly below, so editing graph.yaml without updating this table fails the
// harness instead of drawing a stale diagram.

// What each conductor IS (drawn as its own color, like the reference legend); the
// live state (powered / off / asked / broken) is layered on top by render.js.
export function wireClass(name, wire) {
  if (name.includes("live")) return "live";
  if (name.includes("neutral")) return "neutral";
  if (name.includes("earth")) return "earth";
  if (wire?.voltage === "high") return "live";
  return "lv"; // 24 VAC control wiring
}

// --- geometry tables (band-local coordinates; origin shifts below the hydraulics) ---
//
// Top-to-bottom causality: the CONTROLLER sits on top, commanding everything below.
// Its terminals follow the real device (see
// .claude/skills/irrigation/media/controller-product-rainmachine-similar.jpg and
// controller-instruction-wiring-diagram-12zone.png): one bottom strip — the 24 VAC
// block, then MV + its common, then 1 2 3 4 + their common. The zone wires drop
// through field splices to the solenoid row, the shared common chains along a bus
// under it, and MV + C drop as two dead-straight verticals into the relay's coil
// terminals; the mains row (grid socket -> relay -> pump) is the actuated bottom.

// bottom-strip terminal x positions (24 VAC block | 1 2 3 4 C | MV C — the relay
// pair on the rightmost slots, directly above the relay)
const STRIP = { ac_1: 380, ac_2: 420, z1: 470, z2: 550, z3: 630, z4: 710, c_2: 760, mv: 800, c_1: 840 };
const STRIP_Y = 250; // controller bottom edge
// each solenoid directly under its zone terminal: straight drops, no fan
const VALVE_X = { 1: STRIP.z1, 2: STRIP.z2, 3: STRIP.z3, 4: STRIP.z4 };
const VALVE_TOP = 330;
const SIG_SPLICE_Y = 300;
const COM_BUS_Y = 415;
const MAINS_Y = 520; // grid socket / relay / pump row
const RELAY_COIL = { coil_in: STRIP.mv, coil_com: STRIP.c_1 }; // aligned under MV and C

// Boxes with their terminal anchors. side: which edge the dot sits on (label goes
// just inside). Anchor key defaults to the port id; parts with one terminal serving
// two wires on opposite edges (the relay's N and PE) declare @W/@E variants.
const PARTS = {
  controller: {
    x: 350, y: 60, w: 540, h: 190, label: "Controller",
    anchors: [
      { port: "controller.ac_1", side: "S", x: STRIP.ac_1, label: "AC1" },
      { port: "controller.ac_2", side: "S", x: STRIP.ac_2, label: "AC2" },
      { port: "controller.zone_1", side: "S", x: STRIP.z1, label: "1" },
      { port: "controller.zone_2", side: "S", x: STRIP.z2, label: "2" },
      { port: "controller.zone_3", side: "S", x: STRIP.z3, label: "3" },
      { port: "controller.zone_4", side: "S", x: STRIP.z4, label: "4" },
      { port: "controller.c_2", side: "S", x: STRIP.c_2, label: "C" },
      { port: "controller.mv", side: "S", x: STRIP.mv, label: "MV" },
      { port: "controller.c_1", side: "S", x: STRIP.c_1, label: "C" },
    ],
  },
  adapter_socket: {
    x: 40, y: 300, w: 140, h: 120, label: "Adapter socket",
    anchors: [
      { port: "adapter_socket.l", side: "E", y: 345, label: "L" },
      { port: "adapter_socket.n", side: "E", y: 380, label: "N" },
    ],
  },
  adapter: {
    // sits low-left; its outputs climb into the strip's AC terminals from below
    x: 210, y: 300, w: 130, h: 120, label: "24 VAC adapter",
    anchors: [
      { port: "adapter.ac_l", side: "W", y: 345, label: "L" },
      { port: "adapter.ac_n", side: "W", y: 380, label: "N" },
      { port: "adapter.out_1", side: "E", y: 335, label: "1" },
      { port: "adapter.out_2", side: "E", y: 385, label: "2" },
    ],
  },
  grid_socket: {
    x: 430, y: MAINS_Y, w: 170, h: 160, label: "Grid socket",
    anchors: [
      { port: "grid_socket.l", side: "E", y: MAINS_Y + 70, label: "L" },
      { port: "grid_socket.n", side: "E", y: MAINS_Y + 110, label: "N" },
      { port: "grid_socket.pe", side: "E", y: MAINS_Y + 150, label: "PE" },
    ],
  },
  relay: {
    // on the right, coil terminals on the top edge; MV + C step over to them
    // underneath the solenoid row
    x: 720, y: MAINS_Y, w: 200, h: 185, label: "Relay", labelDy: 62,
    anchors: [
      { port: "relay.coil_in", side: "N", x: RELAY_COIL.coil_in, label: "coil" },
      { port: "relay.coil_com", side: "N", x: RELAY_COIL.coil_com, label: "com" },
      { port: "relay.line_in", side: "W", y: MAINS_Y + 70, label: "line in" },
      { port: "relay.neutral", key: "relay.neutral@W", side: "W", y: MAINS_Y + 110, label: "N" },
      { port: "relay.earth", key: "relay.earth@W", side: "W", y: MAINS_Y + 150, label: "PE" },
      { port: "relay.load_out", side: "E", y: MAINS_Y + 70, label: "load out" },
      { port: "relay.neutral", key: "relay.neutral@E", side: "E", y: MAINS_Y + 110, label: "N" },
      { port: "relay.earth", key: "relay.earth@E", side: "E", y: MAINS_Y + 150, label: "PE" },
    ],
  },
  pump: {
    x: 980, y: MAINS_Y, w: 170, h: 160, label: "Pump",
    anchors: [
      { port: "pump.l", side: "W", y: MAINS_Y + 70, label: "L" },
      { port: "pump.n", side: "W", y: MAINS_Y + 110, label: "N" },
      { port: "pump.pe", side: "W", y: MAINS_Y + 150, label: "PE" },
    ],
  },
};
// the four solenoids, one small box per zone in a row below the controller strip
for (let n = 1; n <= 4; n++) {
  PARTS[`Z${n}.valve`] = {
    x: VALVE_X[n] - 35, y: VALVE_TOP, w: 70, h: 46, label: `Z${n}`,
    anchors: [
      { port: `Z${n}.valve.coil`, key: `Z${n}.valve.coil@N`, side: "N", x: VALVE_X[n] },
      { port: `Z${n}.valve.coil`, key: `Z${n}.valve.coil@S`, side: "S", x: VALVE_X[n] },
    ],
  };
}

// Field splices: bare dots sitting on the wire run (the wire nuts in the valve box).
// sig_N sits on the zone drop above its solenoid; com_N sits on the common bus
// running under the solenoid row.
const SPLICES = {};
for (let n = 1; n <= 4; n++) {
  SPLICES[`splice.sig_${n}`] = { x: VALVE_X[n], y: SIG_SPLICE_Y };
  SPLICES[`splice.com_${n}`] = { x: VALVE_X[n], y: COM_BUS_Y };
}

// Route per wire: optional intermediate via points (segments must stay orthogonal)
// and, where a port has several anchors, which anchor each end attaches to.
const ROUTES = {
  grid_live: {},
  grid_neutral: { to: "relay.neutral@W" },
  grid_earth: { to: "relay.earth@W" },
  pump_live: {},
  pump_neutral: { from: "relay.neutral@E" },
  pump_earth: { from: "relay.earth@E" },
  adapter_socket_live: {},
  adapter_socket_neutral: {},
  // nested L-shapes up into the strip: the inner wire turns at the shallower row
  adapter_supply_1: { vias: [[STRIP.ac_1, 335]] },
  adapter_supply_2: { vias: [[STRIP.ac_2, 385]] },
  // MV and its common drop dead straight into the relay coil terminals aligned
  // directly beneath them — the 10 m house->shed cable
  signal_relay: {},
  relay_return: {},
  signal_1: {},
  signal_2: {},
  signal_3: {},
  signal_4: {},
  common_lead_1: { from: "Z1.valve.coil@S" },
  common_lead_2: { from: "Z2.valve.coil@S" },
  common_lead_3: { from: "Z3.valve.coil@S" },
  common_lead_4: { from: "Z4.valve.coil@S" },
  common_chain_12: {},
  common_chain_23: {},
  common_chain_34: {},
  common_return: { vias: [[770, COM_BUS_Y], [770, 265], [STRIP.c_2, 265]] },
};
// solenoid leads (splice.sig_N -> coil): intra-part `to:` continuity in the model,
// drawn as the short drop from the splice into the solenoid
const LEAD_ROUTES = {
  "lead:splice.sig_1": { to: "Z1.valve.coil@N" },
  "lead:splice.sig_2": { to: "Z2.valve.coil@N" },
  "lead:splice.sig_3": { to: "Z3.valve.coil@N" },
  "lead:splice.sig_4": { to: "Z4.valve.coil@N" },
};

// The tables above keep the reference drawing's own coordinates; the whole diagram is
// scaled down uniformly here so it doesn't dominate the page next to the hydraulic
// schematic. Label padding and dot radii are applied AFTER scaling (in render.js and
// labelSpec), so text stays readable at any scale.
const SCALE = 0.7;
const s = (v) => v * SCALE;
for (const part of Object.values(PARTS)) {
  part.x = s(part.x); part.y = s(part.y); part.w = s(part.w); part.h = s(part.h);
  for (const a of part.anchors) {
    if (a.x !== undefined) a.x = s(a.x);
    if (a.y !== undefined) a.y = s(a.y);
  }
}
for (const p of Object.values(SPLICES)) {
  p.x = s(p.x);
  p.y = s(p.y);
}
for (const r of [...Object.values(ROUTES), ...Object.values(LEAD_ROUTES)]) {
  if (r.vias) r.vias = r.vias.map(([x, y]) => [s(x), s(y)]);
}

export const CIRCUIT_W = s(1180);
export const CIRCUIT_H = s(730);

// --- assembly + validation ---

function anchorPoint(part, a) {
  if (a.side === "W") return { x: part.x, y: a.y };
  if (a.side === "E") return { x: part.x + part.w, y: a.y };
  if (a.side === "N") return { x: a.x, y: part.y };
  return { x: a.x, y: part.y + part.h }; // S
}

function labelSpec(part, a, p) {
  if (!a.label) return null;
  if (a.side === "W") return { x: p.x + 8, y: p.y + 3.5, anchor: "start", text: a.label };
  if (a.side === "E") return { x: p.x - 8, y: p.y + 3.5, anchor: "end", text: a.label };
  if (a.side === "N") return { x: p.x, y: p.y + 16, anchor: "middle", text: a.label };
  return { x: p.x, y: p.y - 8, anchor: "middle", text: a.label }; // S
}

function orthogonal(points) {
  for (let i = 0; i + 1 < points.length; i++) {
    if (points[i].x !== points[i + 1].x && points[i].y !== points[i + 1].y) return false;
  }
  return true;
}

// -> the `circuit` half of the Layout (see layout.js): { parts, splices, wires,
//    leads, anchorDots, anchorLabels } — the shape scene.js/render.js consume.
export function computeCircuitLayout(circuit, offsetY) {
  // anchors by key (and by port, to resolve route defaults / catch ambiguity)
  const anchors = new Map(); // key -> {x, y, port}
  const byPort = new Map(); // port id -> [keys]
  const parts = new Map();
  const anchorDots = []; // open terminal circles on the boxes
  const anchorLabels = [];
  for (const [partId, part] of Object.entries(PARTS)) {
    parts.set(partId, { x: part.x, y: part.y + offsetY, w: part.w, h: part.h, label: part.label, labelDy: part.labelDy });
    for (const a of part.anchors) {
      const key = a.key || a.port;
      const p = anchorPoint(part, a);
      anchors.set(key, { x: p.x, y: p.y + offsetY, port: a.port });
      if (!byPort.has(a.port)) byPort.set(a.port, []);
      byPort.get(a.port).push(key);
      anchorDots.push({ x: p.x, y: p.y + offsetY });
      const l = labelSpec(part, a, p);
      if (l) anchorLabels.push({ ...l, y: l.y + offsetY });
    }
  }
  const splices = new Map();
  for (const [portId, p] of Object.entries(SPLICES)) {
    splices.set(portId, { x: p.x, y: p.y + offsetY });
    anchors.set(portId, { x: p.x, y: p.y + offsetY, port: portId });
    byPort.set(portId, [portId]);
  }

  const resolve = (portId, override, wireName) => {
    if (override) {
      const a = anchors.get(override);
      if (!a) throw new Error(`circuit-layout: ${wireName}: unknown anchor "${override}"`);
      if (a.port !== portId) {
        throw new Error(`circuit-layout: ${wireName}: anchor "${override}" is not on port "${portId}"`);
      }
      return a;
    }
    const keys = byPort.get(portId);
    if (!keys) throw new Error(`circuit-layout: ${wireName}: no anchor for port "${portId}"`);
    if (keys.length > 1) {
      throw new Error(`circuit-layout: ${wireName}: port "${portId}" has ${keys.length} anchors, route must pick one`);
    }
    return anchors.get(keys[0]);
  };

  const route = (name, fromPort, toPort, spec) => {
    const a = resolve(fromPort, spec.from, name);
    const b = resolve(toPort, spec.to, name);
    const vias = (spec.vias || []).map(([x, y]) => ({ x, y: y + offsetY }));
    const points = [{ x: a.x, y: a.y }, ...vias, { x: b.x, y: b.y }];
    if (!orthogonal(points)) throw new Error(`circuit-layout: ${name}: route is not orthogonal`);
    return points;
  };

  // every graph.yaml wire must be drawn, and nothing stale may linger in the table
  const wireNames = Object.keys(circuit.wires);
  for (const name of wireNames) {
    if (!ROUTES[name]) throw new Error(`circuit-layout: wire "${name}" has no route`);
  }
  for (const name of Object.keys(ROUTES)) {
    if (!circuit.wires[name]) throw new Error(`circuit-layout: route "${name}" matches no wire in graph.yaml`);
  }
  const wires = new Map();
  for (const [name, w] of Object.entries(circuit.wires)) {
    wires.set(name, { points: route(name, w.from, w.to, ROUTES[name]), cls: wireClass(name, w) });
  }

  // leads: every cross-part `to:` reference of a splice port (cf. layout.js)
  const leads = new Map();
  for (const [subName, sub] of Object.entries(circuit.parts.splice || {})) {
    for (const t of sub?.to || []) {
      if (!t.includes(".")) continue;
      const from = `splice.${subName}`;
      const key = `lead:${from}`;
      const spec = LEAD_ROUTES[key];
      if (!spec) throw new Error(`circuit-layout: lead "${key}" has no route`);
      leads.set(key, { points: route(key, from, t, spec), cls: "lv", from, to: t });
    }
  }
  for (const key of Object.keys(LEAD_ROUTES)) {
    if (!leads.has(key)) throw new Error(`circuit-layout: lead route "${key}" matches no splice to: reference`);
  }

  return { parts, splices, wires, leads, anchorDots, anchorLabels };
}
