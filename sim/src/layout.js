// elkjs auto-layout: static graph structure -> node/part coordinates, computed ONCE
// at startup and reused for every frame (positions never move; render.js only updates
// visual attributes).
//
// Two independent ELK graphs:
//   - the hydraulic flow graph, layered left-to-right, with each irrigation zone
//     (`Zn.` id prefix) clustered in its own compound node;
//   - the control circuit, laid out in a reserved band BELOW the hydraulics.
//
// The flow graph mixes node-like vertices with link-like ones (see network.js). The
// schematic draws a different split than EPANET does: hoses and swing joints become
// ELK *edges* (the polylines whose stroke encodes flow), while pump and valves —
// EPANET links — are drawn as *nodes*, because they carry displayable state
// (on/off, open/closed/commanded-not-opening). Where two pipes touch directly
// (Z4.hose4 -> Z4.swing2) an invisible 1x1 "point" node keeps them separate edges,
// mirroring getSyntheticJunction in network.js.
//
// Each edge records the EPANET link id whose solved flow it displays, reusing the
// exact naming of network.js: a hose/swing edge reads its own link (`Z1_hose1`), a
// node->node edge reads the synthetic connector (`CONN_manifold__Z1_joint1`), and an
// edge touching a pump/valve glyph reads that equipment's link (`Z1_valve`, `pump`).

// The deep specifier resolves both in Node (deps in node_modules; elkjs has no
// `exports` field, so deep imports are legal) and in the browser (mapped in the
// importmap). elk.bundled.js is the self-contained main-thread build — no worker,
// which a one-shot ~100-node layout does not warrant.
import ELK from "elkjs/lib/elk.bundled.js";
import { CIRCUIT_BAND_GAP } from "./config.js";

const epOf = (id) => id.replace(/\./g, "_");
const zoneOf = (id) => {
  const m = id.match(/^(Z\d+)\./);
  return m ? m[1] : null;
};

// Drawn size per glyph; scene.js also uses these to anchor labels.
export const GLYPH = {
  well: { w: 44, h: 44 },
  pump: { w: 40, h: 40 },
  manifold: { w: 16, h: 56 },
  joint: { w: 10, h: 10 },
  tee: { w: 12, h: 12 },
  valve: { w: 30, h: 30 },
  head: { w: 26, h: 26 },
  nozzle: { w: 26, h: 26 },
  cap: { w: 14, h: 14 },
  point: { w: 1, h: 1 }, // invisible pipe-pipe junction
};

export function glyphOf(node) {
  if (node.role === "reservoir") return "well";
  if (node.role === "pump") return "pump";
  if (node.role === "valve-auto" || node.role === "valve-manual") return "valve";
  if (node.role === "cap") return "cap";
  if (node.role === "outlet") return node.subkind === "stream" ? "nozzle" : "head";
  if (node.kind === "manifold") return "manifold";
  if (node.kind === "tee") return "tee";
  return "joint";
}

// Manual nudges for awkward anchors, applied after ELK: flow id -> {dx, dy}. The node
// moves and the touching endpoint of each incident edge moves with it. Empty so far.
export const overrides = {};

const PIPE_SUBKINDS = new Set(["hose", "swing"]);
const isDrawn = (n) => !PIPE_SUBKINDS.has(n.subkind);
const EQUIPMENT_LINK_ROLES = new Set(["pump", "valve-auto", "valve-manual"]);

// --- hydraulic graph -> ELK ---

function buildFlowElkGraph(model) {
  const { flowNodes } = model;

  const parentOf = new Map();
  for (const n of flowNodes.values()) {
    for (const t of n.to) parentOf.set(t, n.id);
  }

  // drawn nodes + invisible points between directly-adjacent pipes
  const nodes = new Map(); // id -> {glyph, zone}
  for (const n of flowNodes.values()) {
    if (isDrawn(n)) nodes.set(n.id, { glyph: glyphOf(n), zone: zoneOf(n.id) });
  }
  const pointBetween = (upPipeId, downPipeId) => {
    const id = `pt:${upPipeId}__${downPipeId}`;
    if (!nodes.has(id)) nodes.set(id, { glyph: "point", zone: zoneOf(upPipeId) });
    return id;
  };

  // Resolve the drawn anchor on either side of a pipe (cf. resolveEndpoint in
  // network.js, with "drawn" in place of "EPANET node").
  const anchor = (neighborId, pipe, isUpstream) => {
    const neighbor = flowNodes.get(neighborId);
    if (isDrawn(neighbor)) return neighborId;
    return isUpstream ? pointBetween(neighborId, pipe.id) : pointBetween(pipe.id, neighborId);
  };

  // edges: one per hose/swing, plus one per drawn->drawn adjacency
  const edges = []; // {key, u, v, epLinkId, wetIds}
  for (const n of flowNodes.values()) {
    if (PIPE_SUBKINDS.has(n.subkind)) {
      const u = anchor(parentOf.get(n.id), n, true);
      const v = anchor(n.to[0], n, false);
      // a pipe is filled iff reachable; BFS crosses pipes freely, so one id suffices
      edges.push({ key: n.id, u, v, epLinkId: epOf(n.id), wetIds: [n.id] });
      continue;
    }
    for (const childId of n.to) {
      const child = flowNodes.get(childId);
      if (!isDrawn(child)) continue; // the pipe's own edge covers this adjacency
      // drawn -> drawn: an equipment glyph reads its own EPANET link; a plain
      // node -> node adjacency reads the synthetic connector pipe
      let epLinkId;
      if (EQUIPMENT_LINK_ROLES.has(n.role)) epLinkId = epOf(n.id);
      else if (EQUIPMENT_LINK_ROLES.has(child.role)) epLinkId = epOf(childId);
      else epLinkId = `CONN_${epOf(n.id)}__${epOf(childId)}`;
      // both sides must be filled (a closed valve is itself reachable from upstream,
      // but its downstream joint is not — that half-edge renders dead)
      edges.push({ key: `${n.id}->${childId}`, u: n.id, v: childId, epLinkId, wetIds: [n.id, childId] });
    }
  }

  // assemble the ELK hierarchy: zone compounds + root
  const elkNode = (id) => {
    const g = GLYPH[nodes.get(id).glyph];
    return { id, width: g.w, height: g.h };
  };
  const zoneIds = [...new Set([...nodes.entries()].map(([, m]) => m.zone).filter(Boolean))].sort();
  const zoneChildren = new Map(zoneIds.map((z) => [z, []]));
  const rootChildren = [];
  for (const [id, meta] of nodes) {
    (meta.zone ? zoneChildren.get(meta.zone) : rootChildren).push(elkNode(id));
  }

  const zoneEdges = new Map(zoneIds.map((z) => [z, []]));
  const rootEdges = [];
  for (const e of edges) {
    const elkEdge = { id: e.key, sources: [e.u], targets: [e.v] };
    const zu = nodes.get(e.u).zone;
    const zv = nodes.get(e.v).zone;
    // ELK wants each edge in the lowest common ancestor of its endpoints
    (zu && zu === zv ? zoneEdges.get(zu) : rootEdges).push(elkEdge);
  }

  const graph = {
    id: "flow",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.layered.spacing.nodeNodeBetweenLayers": "40",
      "elk.spacing.nodeNode": "24",
    },
    children: [
      ...rootChildren,
      ...zoneIds.map((z) => ({
        id: z,
        layoutOptions: { "elk.padding": "[top=24,left=18,bottom=18,right=18]" },
        children: zoneChildren.get(z),
        edges: zoneEdges.get(z),
      })),
    ],
    edges: rootEdges,
  };
  return { graph, nodes, edges };
}

// --- circuit graph -> ELK ---

// Parts drawn as per-port "lugs" instead of one box: the splice "part" is a bundle of
// independent wire nuts in the valve box, not one enclosure. Pure display decision —
// the electrical model (graph.yaml circuit + electrical.js) is untouched.
const EXPLODED_PARTS = new Set(["splice"]);

// "grid_socket.l" belongs to part "grid_socket"; "Z1.valve.coil" to the synthetic
// coil box "Z1.valve" (the solenoid's electrical face — wires target hydraulic-part
// ports that have no entry in circuit.parts).
function partOf(portId, circuit) {
  const dot = portId.lastIndexOf(".");
  // a wire endpoint is always "<part>.<port>"; anything else is malformed graph.yaml
  if (dot < 0) throw new Error(`layout: wire endpoint "${portId}" has no part prefix`);
  const root = portId.slice(0, portId.indexOf("."));
  return circuit.parts[root] ? root : portId.slice(0, dot);
}

function buildCircuitElkGraph(circuit) {
  // Display-only "lead" pairs for an exploded port's cross-part `to:` references
  // (splice.sig_N -> ZN.valve.coil): physical solenoid leads that are intra-part
  // continuity in the model and would otherwise render as nothing. Sibling `to:`
  // references (the com chain) are skipped — the common_chain_* wires already draw
  // them. Collected before the port registration below so both endpoints get laid
  // out even when no wire references them (a dangling endpoint would crash ELK).
  const leadPairs = [];
  for (const partId of EXPLODED_PARTS) {
    const part = circuit.parts[partId];
    if (!part) throw new Error(`layout: exploded part "${partId}" missing from circuit.parts`);
    for (const [subName, sub] of Object.entries(part)) {
      for (const t of sub?.to || []) {
        if (t.includes(".")) leadPairs.push([`${partId}.${subName}`, t]);
      }
    }
  }

  // only ports referenced by wires or leads get drawn (and laid out)
  const portsByPart = new Map(); // partId -> Set of port ids
  const endpointPairs = [...Object.values(circuit.wires).map((w) => [w.from, w.to]), ...leadPairs];
  for (const pair of endpointPairs) {
    for (const portId of pair) {
      const part = partOf(portId, circuit);
      if (!portsByPart.has(part)) portsByPart.set(part, new Set());
      portsByPart.get(part).add(portId);
    }
  }
  // every declared part appears even if nothing wires into it
  for (const partId of Object.keys(circuit.parts)) {
    if (!portsByPart.has(partId)) portsByPart.set(partId, new Set());
  }

  const children = [];
  const lugIds = new Set();
  for (const [partId, ports] of portsByPart) {
    if (EXPLODED_PARTS.has(partId)) {
      // One small lug node per port, node id = port id. Each lug carries one explicit
      // ELK port (suffixed #lug) and every edge references ports only: elkjs 0.11.1
      // crashes ('Cannot read properties of null') on this graph when edges attach to
      // the lug NODES directly — do not 'simplify' the #lug ports away.
      for (const portId of ports) {
        lugIds.add(portId);
        children.push({
          id: portId,
          width: 52,
          height: 14,
          ports: [{ id: `${portId}#lug`, width: 5, height: 5 }],
        });
      }
    } else {
      children.push({
        id: `part:${partId}`,
        width: Math.max(64, partId.length * 8 + 20, ports.size * 18 + 12),
        height: 34,
        ports: [...ports].map((p) => ({ id: p, width: 5, height: 5 })),
      });
    }
  }
  const ref = (portId) => (lugIds.has(portId) ? `${portId}#lug` : portId);

  const edges = Object.entries(circuit.wires).map(([name, w]) => ({
    id: name,
    sources: [ref(w.from)],
    targets: [ref(w.to)],
  }));
  for (const [from, to] of leadPairs) {
    edges.push({ id: `lead:${from}`, sources: [ref(from)], targets: [ref(to)] });
  }

  const graph = {
    id: "circuit",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.spacing.nodeNodeBetweenLayers": "50",
      "elk.spacing.nodeNode": "28",
      "elk.spacing.edgeNode": "12",
    },
    children,
    edges,
  };
  return { graph };
}

// --- shared helpers ---

function sectionPoints(edge, containerOffsets) {
  const off = containerOffsets.get(edge.container) || { x: 0, y: 0 };
  const pts = [];
  for (const s of edge.sections || []) {
    pts.push(s.startPoint, ...(s.bendPoints || []), s.endPoint);
  }
  return pts.map((p) => ({ x: p.x + off.x, y: p.y + off.y }));
}

// --- public API ---

// Layout = {
//   width, height,                                            // whole canvas
//   flow: { nodes:    Map<id, {x,y,w,h,glyph,zone}>,          // absolute top-left
//           edges:    Map<key, {points, epLinkId, wetIds, u, v}>,
//           zones:    Map<"Z1".., {x,y,w,h}> },
//   circuit: { parts: Map<partId, {x,y,w,h}>,                 // enclosure boxes
//              lugs:  Map<portId, {x,y,w,h}>,                 // exploded splice points
//              ports: Map<portId, {x,y}>,                     // port centers (box parts)
//              wires: Map<wireName, {points}>,
//              leads: Map<"lead:<port>", {points, from, to}> },
// }
export async function computeLayout(model, circuit) {
  const elk = new ELK();
  const flowBuild = buildFlowElkGraph(model);
  const circuitBuild = buildCircuitElkGraph(circuit);
  const [flowOut, circuitOut] = await Promise.all([
    elk.layout(flowBuild.graph),
    elk.layout(circuitBuild.graph),
  ]);

  // flatten the flow hierarchy: container-relative -> absolute coordinates
  const flowNodes = new Map();
  const zones = new Map();
  const containerOffsets = new Map([["flow", { x: 0, y: 0 }]]);
  for (const child of flowOut.children) {
    if (child.children) {
      zones.set(child.id, { x: child.x, y: child.y, w: child.width, h: child.height });
      containerOffsets.set(child.id, { x: child.x, y: child.y });
      for (const sub of child.children) {
        flowNodes.set(sub.id, {
          x: child.x + sub.x,
          y: child.y + sub.y,
          w: sub.width,
          h: sub.height,
          ...flowBuild.nodes.get(sub.id),
        });
      }
    } else {
      flowNodes.set(child.id, {
        x: child.x,
        y: child.y,
        w: child.width,
        h: child.height,
        ...flowBuild.nodes.get(child.id),
      });
    }
  }

  const flowEdges = new Map();
  const allElkEdges = [...flowOut.edges, ...flowOut.children.flatMap((c) => c.edges || [])];
  const elkEdgeById = new Map(allElkEdges.map((e) => [e.id, e]));
  for (const e of flowBuild.edges) {
    const routed = elkEdgeById.get(e.key);
    flowEdges.set(e.key, {
      points: sectionPoints(routed, containerOffsets),
      epLinkId: e.epLinkId,
      wetIds: e.wetIds,
      u: e.u,
      v: e.v,
    });
  }

  // manual nudges: move the node and drag the touching edge endpoints along
  for (const [id, o] of Object.entries(overrides)) {
    const n = flowNodes.get(id);
    if (!n) continue;
    n.x += o.dx || 0;
    n.y += o.dy || 0;
    for (const e of flowEdges.values()) {
      if (e.u === id && e.points.length) {
        e.points[0] = { x: e.points[0].x + (o.dx || 0), y: e.points[0].y + (o.dy || 0) };
      }
      if (e.v === id && e.points.length) {
        const last = e.points.length - 1;
        e.points[last] = { x: e.points[last].x + (o.dx || 0), y: e.points[last].y + (o.dy || 0) };
      }
    }
  }

  // circuit band sits below the hydraulics
  const bandY = flowOut.height + CIRCUIT_BAND_GAP;
  const parts = new Map();
  const lugs = new Map(); // exploded per-port nodes (the splice wire nuts)
  const ports = new Map();
  for (const child of circuitOut.children) {
    if (child.id.startsWith("part:")) {
      const partId = child.id.slice("part:".length);
      parts.set(partId, { x: child.x, y: child.y + bandY, w: child.width, h: child.height });
      for (const p of child.ports || []) {
        ports.set(p.id, {
          x: child.x + p.x + p.width / 2,
          y: child.y + p.y + p.height / 2 + bandY,
        });
      }
    } else {
      lugs.set(child.id, { x: child.x, y: child.y + bandY, w: child.width, h: child.height });
    }
  }
  const bandOffsets = new Map([["circuit", { x: 0, y: bandY }]]);
  const wires = new Map();
  const leads = new Map();
  const unref = (id) => id.replace(/#lug$/, ""); // back to the elec.ports key
  for (const e of circuitOut.edges) {
    if (e.id.startsWith("lead:")) {
      leads.set(e.id, {
        points: sectionPoints(e, bandOffsets),
        from: unref(e.sources[0]),
        to: unref(e.targets[0]),
      });
    } else {
      wires.set(e.id, { points: sectionPoints(e, bandOffsets) });
    }
  }

  return {
    width: Math.max(flowOut.width, circuitOut.width),
    height: bandY + circuitOut.height,
    flow: { nodes: flowNodes, edges: flowEdges, zones },
    circuit: { parts, lugs, ports, wires, leads },
  };
}
