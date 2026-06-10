// Solved results + layout -> a Scene of renderable primitives with every visual
// attribute computed (stroke widths, colors, dash, label text, wire states). Pure and
// DOM-free so the Node harness can assert on it; render.js applies a Scene to SVG.
//
// Visual encodings (spec R11-R14):
//   - stroke width  ∝ |flow| through the element
//   - stroke color  ∝ pressure, blue (0 bar) -> green -> red (P_COLOR_MAX_BAR)
//   - unfilled (dead-branch) and idle elements grey/dashed, pressures shown as "—"
//     (never display EPANET pressure on a disconnected node)
//   - every outlet labeled with its discharge, in m3/h or L/min
//   - wires/ports colored by the electrical display state: broken > powered > asked > off

import {
  P_COLOR_MAX_BAR,
  Q_STROKE_MAX_M3H,
  STROKE_MIN_PX,
  STROKE_MAX_PX,
  DEAD_COLOR,
  EQUIP_ON_STROKE,
  EQUIP_ON_FILL,
  EQUIP_CMD_STROKE,
  EQUIP_CMD_FILL,
} from "./config.js";
import { fmtFlow, fmtPressure } from "./units.js";

const epOf = (id) => id.replace(/\./g, "_");

// Pressure -> hue ramp: 220° (blue) at 0 bar through green to 0° (red) at the scale
// top. The system's working band (1.7-3.8 bar at the nozzles) lands in the
// cyan->green->yellow middle, where adjacent pressures are easiest to tell apart.
export function pressureColor(p_bar) {
  const t = Math.min(1, Math.max(0, p_bar / P_COLOR_MAX_BAR));
  const hue = 220 * (1 - t);
  return `hsl(${hue.toFixed(0)}, 80%, 45%)`;
}

export function strokeWidth(q_m3h) {
  const t = Math.min(1, Math.abs(q_m3h) / Q_STROKE_MAX_M3H);
  return STROKE_MIN_PX + (STROKE_MAX_PX - STROKE_MIN_PX) * t;
}

// Display pressure of one flow node, or null when it has none (equipment glyphs and
// synthetic points are not EPANET nodes).
function nodePressure(id, model, steady) {
  const n = model.flowNodes.get(id);
  if (!n) return null;
  if (n.role === "pump" || n.role.startsWith("valve") || n.role === "pipe") return null;
  const p = steady.pressureBar[epOf(id)];
  return Number.isFinite(p) ? p : null;
}

function wireState(s) {
  if (!s) return "off";
  if (s.broken) return "broken";
  if (s.powered) return "powered";
  if (s.asked) return "asked";
  return "off";
}

// Scene = {
//   pipes:   [{key, points, width, color, dashed, dead}]
//   nodes:   [{key, x, y, w, h, glyph, zone, dead, state, color, title}]
//   labels:  [{key, x, y, text, dead}]              // outlet discharge labels
//   wires:   [{key, points, cls, state}]            // cls: live|neutral|earth|lv
//   leads:   [{key, points, cls, state}]            // solenoid leads (splice -> coil)
//   splices: [{key, x, y, state}]                   // field-splice dots on the wire
// }
// Circuit boxes, terminal dots and labels are static chrome drawn by render.js
// straight from the layout; only wires, leads and splices carry live state.
export function buildScene(model, layout, steady, elec, { lmin = false } = {}) {
  // wetIds are real flow ids (pipes carry their own id; node->node edges carry both
  // endpoints, so the half-edge downstream of a closed valve renders dead)
  const dead = (ids) => !ids.every((id) => steady.reachable.has(id));

  const pipes = [];
  for (const [key, e] of layout.flow.edges) {
    const isDead = dead(e.wetIds);
    const q = isDead ? 0 : steady.flow[e.epLinkId] ?? 0;
    // color by the mean pressure at the edge's real (EPANET-node) endpoints
    const ps = [e.u, e.v].map((id) => nodePressure(id, model, steady)).filter((p) => p !== null);
    const pAvg = ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : 0;
    pipes.push({
      key,
      points: e.points,
      width: isDead ? STROKE_MIN_PX : strokeWidth(q),
      color: isDead ? DEAD_COLOR : pressureColor(pAvg),
      dashed: isDead,
      dead: isDead,
    });
  }

  const nodes = [];
  const labels = [];
  for (const [id, n] of layout.flow.nodes) {
    if (n.glyph === "point") continue;
    const fn = model.flowNodes.get(id);
    const isDead = !steady.reachable.has(id);
    let state = "";
    if (fn.role === "pump") state = elec.pumpPowered ? "on" : "off";
    else if (fn.role.startsWith("valve")) {
      if (steady.valveOpen[id]) state = "open";
      else if (steady.commandedNotOpening[id]) state = "commanded";
      else state = "closed";
    }
    const p = nodePressure(id, model, steady);
    const pText = isDead || p === null ? "—" : fmtPressure(p);
    // Equipment glyphs (pump/valves) have no node pressure, so they encode state
    // instead: green = running/open, amber = commanded-but-not-opening, white/grey =
    // off/closed. fill is always set for them so a state change can revert it.
    let color = isDead || p === null ? DEAD_COLOR : pressureColor(p);
    let fill; // undefined -> the glyph keeps its static fill (heads, well, joints)
    if (fn.role === "pump" || fn.role.startsWith("valve")) {
      if (state === "on" || state === "open") {
        color = EQUIP_ON_STROKE;
        fill = EQUIP_ON_FILL;
      } else if (state === "commanded") {
        color = EQUIP_CMD_STROKE;
        fill = EQUIP_CMD_FILL;
      } else {
        color = DEAD_COLOR;
        fill = "#fff";
      }
    }
    nodes.push({
      key: id,
      x: n.x,
      y: n.y,
      w: n.w,
      h: n.h,
      glyph: n.glyph,
      zone: n.zone,
      dead: isDead,
      state,
      color,
      fill,
      title: `${id} (${fn.kind})${state ? ` ${state}` : ""} — ${pText}`,
    });
    if (fn.role === "outlet") {
      labels.push({
        key: id,
        x: n.x + n.w / 2,
        y: n.y + n.h + 12,
        text: isDead ? "—" : fmtFlow(steady.demands.get(id) || 0, lmin),
        dead: isDead,
      });
    }
  }

  const wires = [];
  for (const [name, w] of layout.circuit.wires) {
    wires.push({ key: name, points: w.points, cls: w.cls, state: wireState(elec.wires[name]) });
  }

  // a lead is intra-part continuity in the model, so it has no wire state of its
  // own — combine its two endpoint ports (live only when current crosses both)
  const leads = [];
  for (const [key, l] of layout.circuit.leads) {
    const a = elec.ports[l.from] || {};
    const b = elec.ports[l.to] || {};
    const state = a.broken || b.broken ? "broken"
      : a.powered && b.powered ? "powered"
      : a.asked && b.asked ? "asked"
      : "off";
    leads.push({ key, points: l.points, cls: l.cls, state });
  }

  const splices = [];
  for (const [portId, p] of layout.circuit.splices) {
    splices.push({ key: portId, x: p.x, y: p.y, state: wireState(elec.ports[portId]) });
  }

  return { pipes, nodes, labels, wires, leads, splices };
}
