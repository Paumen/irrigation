// Fixed, hand-drawn layout of the control circuit, mirroring the owner's wiring
// diagram: Grid socket -> Relay -> Pump mains row up top, the 24 VAC adapter feeding
// the controller below, zone outputs running right through field splices to the
// solenoids, and the shared common chained down a bus on the far right back to C2.
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

const ZONE_Y = { 1: 733, 2: 807, 3: 881, 4: 955 };

// Boxes with their terminal anchors. side: which edge the dot sits on (label goes
// just inside). Anchor key defaults to the port id; parts with one terminal serving
// two wires on opposite edges (the relay's N and PE) declare @W/@E variants.
const PARTS = {
  grid_socket: {
    x: 130, y: 70, w: 200, h: 190, label: "Grid socket",
    anchors: [
      { port: "grid_socket.l", side: "E", y: 145, label: "L" },
      { port: "grid_socket.n", side: "E", y: 190, label: "N" },
      { port: "grid_socket.pe", side: "E", y: 235, label: "PE" },
    ],
  },
  relay: {
    x: 430, y: 70, w: 230, h: 215, label: "Relay",
    anchors: [
      { port: "relay.line_in", side: "W", y: 145, label: "line in" },
      { port: "relay.neutral", key: "relay.neutral@W", side: "W", y: 190, label: "N" },
      { port: "relay.earth", key: "relay.earth@W", side: "W", y: 235, label: "PE" },
      { port: "relay.load_out", side: "E", y: 145, label: "load out" },
      { port: "relay.neutral", key: "relay.neutral@E", side: "E", y: 190, label: "N" },
      { port: "relay.earth", key: "relay.earth@E", side: "E", y: 235, label: "PE" },
      { port: "relay.coil_com", side: "S", x: 505, label: "com" },
      { port: "relay.coil_in", side: "S", x: 608, label: "coil in" },
    ],
  },
  pump: {
    x: 800, y: 70, w: 180, h: 190, label: "Pump",
    anchors: [
      { port: "pump.l", side: "W", y: 145, label: "L" },
      { port: "pump.n", side: "W", y: 190, label: "N" },
      { port: "pump.pe", side: "W", y: 235, label: "PE" },
    ],
  },
  adapter_socket: {
    x: 130, y: 430, w: 200, h: 145, label: "Adapter socket",
    anchors: [
      { port: "adapter_socket.l", side: "E", y: 485, label: "L" },
      { port: "adapter_socket.n", side: "E", y: 530, label: "N" },
    ],
  },
  adapter: {
    x: 420, y: 430, w: 200, h: 135, label: "24 VAC adapter",
    anchors: [
      { port: "adapter.ac_l", side: "W", y: 485, label: "L" },
      { port: "adapter.ac_n", side: "W", y: 530, label: "N" },
      { port: "adapter.out_1", side: "S", x: 475, label: "1" },
      { port: "adapter.out_2", side: "S", x: 550, label: "2" },
    ],
  },
  controller: {
    x: 400, y: 685, w: 300, h: 320, label: "Controller",
    anchors: [
      { port: "controller.ac_1", side: "N", x: 475, label: "AC1" },
      { port: "controller.ac_2", side: "N", x: 550, label: "AC2" },
      { port: "controller.zone_1", side: "E", y: ZONE_Y[1], label: "zone 1" },
      { port: "controller.zone_2", side: "E", y: ZONE_Y[2], label: "zone 2" },
      { port: "controller.zone_3", side: "E", y: ZONE_Y[3], label: "zone 3" },
      { port: "controller.zone_4", side: "E", y: ZONE_Y[4], label: "zone 4" },
      { port: "controller.mv", side: "S", x: 460, label: "MV" },
      { port: "controller.c_1", side: "S", x: 535, label: "C1" },
      { port: "controller.c_2", side: "S", x: 640, label: "C2" },
    ],
  },
};
// the four solenoids, one small box per zone
for (let n = 1; n <= 4; n++) {
  PARTS[`Z${n}.valve`] = {
    x: 845, y: ZONE_Y[n] - 23, w: 100, h: 46, label: `Z${n}`,
    anchors: [
      { port: `Z${n}.valve.coil`, key: `Z${n}.valve.coil@W`, side: "W", y: ZONE_Y[n] },
      { port: `Z${n}.valve.coil`, key: `Z${n}.valve.coil@E`, side: "E", y: ZONE_Y[n] },
    ],
  };
}

// Field splices: bare dots sitting on the wire run (the wire nuts in the valve box).
// sig_N sits on the zone run between controller and solenoid; com_N sits on the
// common bus at x=968.
const SPLICES = {};
for (let n = 1; n <= 4; n++) {
  SPLICES[`splice.sig_${n}`] = { x: 782, y: ZONE_Y[n] };
  SPLICES[`splice.com_${n}`] = { x: 968, y: ZONE_Y[n] };
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
  adapter_supply_1: {},
  adapter_supply_2: {},
  // MV and C1 loop around the left side of the page to the relay coil, like the
  // physical 10 m cable run from house to shed
  signal_relay: { vias: [[460, 1045], [122, 1045], [122, 330], [608, 330]] },
  relay_return: { vias: [[505, 350], [100, 350], [100, 1075], [535, 1075]] },
  signal_1: {},
  signal_2: {},
  signal_3: {},
  signal_4: {},
  common_lead_1: { from: "Z1.valve.coil@E" },
  common_lead_2: { from: "Z2.valve.coil@E" },
  common_lead_3: { from: "Z3.valve.coil@E" },
  common_lead_4: { from: "Z4.valve.coil@E" },
  common_chain_12: {},
  common_chain_23: {},
  common_chain_34: {},
  common_return: { vias: [[968, 1040], [640, 1040]] },
};
// solenoid leads (splice.sig_N -> coil): intra-part `to:` continuity in the model,
// drawn as the short run from the splice into the solenoid
const LEAD_ROUTES = {
  "lead:splice.sig_1": { to: "Z1.valve.coil@W" },
  "lead:splice.sig_2": { to: "Z2.valve.coil@W" },
  "lead:splice.sig_3": { to: "Z3.valve.coil@W" },
  "lead:splice.sig_4": { to: "Z4.valve.coil@W" },
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

export const CIRCUIT_W = s(1000);
export const CIRCUIT_H = s(1090);

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
    parts.set(partId, { x: part.x, y: part.y + offsetY, w: part.w, h: part.h, label: part.label });
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
