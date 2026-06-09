// Apply a Scene (scene.js) to SVG. Vanilla keyed data-join: each primitive key maps
// to one DOM element created on first sight with its geometry set ONCE; every update
// after that writes only the mutable visual attributes (stroke, width, dash, text).
// Geometry never moves — it comes from the one startup layout. The graph is static in
// M5, so there is no removal pass; primitives that appear later (M8 leak outlets)
// are simply created by the same join.

import { DEAD_COLOR } from "./config.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const WIRE_STYLE = {
  powered: { stroke: "#2e7d32", width: 2.5, dash: "" },
  asked: { stroke: "#f9a825", width: 1.5, dash: "" },
  broken: { stroke: "#c62828", width: 1.5, dash: "4 3" },
  off: { stroke: "#b0bec5", width: 1, dash: "" },
};

function el(name, attrs = {}) {
  const e = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

const pointsAttr = (points) => points.map((p) => `${p.x},${p.y}`).join(" ");

// One glyph element per drawn node. Geometry is fixed; only stroke/fill change.
function createGlyph(n) {
  const cx = n.x + n.w / 2;
  const cy = n.y + n.h / 2;
  switch (n.glyph) {
    case "well":
      return el("rect", { x: n.x, y: n.y, width: n.w, height: n.h, rx: 6, fill: "#e3f2fd" });
    case "pump":
      return el("circle", { cx, cy, r: n.w / 2, fill: "#fff" });
    case "valve": {
      // bowtie: two triangles meeting at the center
      const d = `M ${n.x} ${n.y} L ${cx} ${cy} L ${n.x} ${n.y + n.h} Z M ${n.x + n.w} ${n.y} L ${cx} ${cy} L ${n.x + n.w} ${n.y + n.h} Z`;
      return el("path", { d, fill: "#fff" });
    }
    case "head":
      return el("circle", { cx, cy, r: n.w / 2, fill: "#fff" });
    case "nozzle": {
      const d = `M ${cx} ${n.y} L ${n.x + n.w} ${n.y + n.h} L ${n.x} ${n.y + n.h} Z`;
      return el("path", { d, fill: "#fff" });
    }
    case "manifold":
      return el("rect", { x: n.x, y: n.y, width: n.w, height: n.h, rx: 3, fill: "#fff" });
    case "cap":
      return el("rect", { x: n.x, y: n.y, width: n.w, height: n.h, fill: "#fff" });
    default: // joint / tee
      return el("circle", { cx, cy, r: Math.max(3, n.w / 2), fill: "#fff" });
  }
}

export function createRenderer(svgEl, layout) {
  svgEl.setAttribute("viewBox", `-10 -10 ${layout.width + 20} ${layout.height + 20}`);

  // layer order: zone frames under pipes under glyphs under labels
  const layers = {};
  for (const name of ["zones", "pipes", "nodes", "labels", "wires", "leads", "parts", "lugs", "ports"]) {
    layers[name] = el("g", { class: name });
    svgEl.appendChild(layers[name]);
  }

  // static chrome: zone frames + titles, circuit location frames, part boxes
  // (state never changes any of them)
  const frame = (label, b) => {
    layers.zones.appendChild(
      el("rect", { x: b.x, y: b.y, width: b.w, height: b.h, rx: 8, fill: "none", stroke: "#dadce0" }),
    );
    const t = el("text", { x: b.x + 8, y: b.y + 16, fill: "#5f6368", "font-size": "12" });
    t.textContent = label;
    layers.zones.appendChild(t);
  };
  for (const [zone, b] of layout.flow.zones) frame(zone, b);
  for (const [location, b] of layout.circuit.groups) frame(location, b);
  for (const [partId, b] of layout.circuit.parts) {
    layers.parts.appendChild(
      el("rect", { x: b.x, y: b.y, width: b.w, height: b.h, rx: 4, fill: "#f8f9fa", stroke: "#80868b" }),
    );
    const t = el("text", {
      x: b.x + b.w / 2,
      y: b.y + b.h / 2 + 4,
      "text-anchor": "middle",
      fill: "#3c4043",
      "font-size": "11",
    });
    t.textContent = partId;
    layers.parts.appendChild(t);
  }

  const els = new Map(); // "<kind>:<key>" -> { node: element, title?: <title> }

  const join = (prims, kind, create, update) => {
    for (const prim of prims) {
      const k = `${kind}:${prim.key}`;
      let entry = els.get(k);
      if (!entry) {
        entry = create(prim);
        els.set(k, entry);
      }
      update(entry, prim);
    }
  };

  return {
    update(scene) {
      join(
        scene.pipes,
        "pipe",
        (p) => {
          const line = el("polyline", {
            points: pointsAttr(p.points),
            fill: "none",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
          });
          layers.pipes.appendChild(line);
          return { node: line };
        },
        ({ node }, p) => {
          node.setAttribute("stroke", p.color);
          node.setAttribute("stroke-width", p.width);
          node.setAttribute("stroke-dasharray", p.dashed ? "6 4" : "");
        },
      );

      join(
        scene.nodes,
        "node",
        (n) => {
          const glyph = createGlyph(n);
          const title = el("title");
          glyph.appendChild(title);
          layers.nodes.appendChild(glyph);
          return { node: glyph, title };
        },
        ({ node, title }, n) => {
          node.setAttribute("stroke", n.color);
          node.setAttribute("stroke-width", n.state === "open" || n.state === "on" ? 3 : 1.5);
          node.setAttribute("stroke-dasharray", n.dead ? "3 2" : "");
          // a commanded-but-not-opening valve flags amber: asked for, not delivering
          if (n.state === "commanded") node.setAttribute("stroke", "#f9a825");
          title.textContent = n.title;
        },
      );

      join(
        scene.labels,
        "label",
        (l) => {
          const t = el("text", { x: l.x, y: l.y, "text-anchor": "middle", "font-size": "11" });
          layers.labels.appendChild(t);
          return { node: t };
        },
        ({ node }, l) => {
          node.textContent = l.text;
          node.setAttribute("fill", l.dead ? DEAD_COLOR : "#202124");
        },
      );

      join(
        scene.wires,
        "wire",
        (w) => {
          const line = el("polyline", { points: pointsAttr(w.points), fill: "none" });
          layers.wires.appendChild(line);
          return { node: line };
        },
        ({ node }, w) => {
          const s = WIRE_STYLE[w.state];
          node.setAttribute("stroke", s.stroke);
          node.setAttribute("stroke-width", s.width);
          node.setAttribute("stroke-dasharray", s.dash);
        },
      );

      join(
        scene.leads,
        "lead",
        (l) => {
          const line = el("polyline", { points: pointsAttr(l.points), fill: "none" });
          layers.leads.appendChild(line);
          return { node: line };
        },
        ({ node }, l) => {
          const s = WIRE_STYLE[l.state];
          node.setAttribute("stroke", s.stroke);
          node.setAttribute("stroke-width", s.width);
          node.setAttribute("stroke-dasharray", s.dash);
        },
      );

      join(
        scene.lugs,
        "lug",
        (l) => {
          const dot = el("circle", { cx: l.x + 5, cy: l.y + l.h / 2, r: 4, stroke: "#80868b" });
          const label = el("text", {
            x: l.x + 12,
            y: l.y + l.h / 2 + 3.5,
            "font-size": "9",
            fill: "#5f6368",
          });
          label.textContent = l.label;
          layers.lugs.appendChild(dot);
          layers.lugs.appendChild(label);
          return { node: dot };
        },
        ({ node }, l) => {
          node.setAttribute("fill", WIRE_STYLE[l.state].stroke);
        },
      );

      join(
        scene.ports,
        "port",
        (p) => {
          const dot = el("circle", { cx: p.x, cy: p.y, r: 3 });
          layers.ports.appendChild(dot);
          return { node: dot };
        },
        ({ node }, p) => {
          node.setAttribute("fill", WIRE_STYLE[p.state].stroke);
        },
      );
    },
  };
}
