// Apply a Scene (scene.js) to SVG. Vanilla keyed data-join: each primitive key maps
// to one DOM element created on first sight with its geometry set ONCE; every update
// after that writes only the mutable visual attributes (stroke, width, dash, text).
// Geometry never moves — it comes from the one startup layout. The graph is static in
// M5, so there is no removal pass; primitives that appear later (M8 leak outlets)
// are simply created by the same join.

import { DEAD_COLOR } from "./config.js";

const SVG_NS = "http://www.w3.org/2000/svg";

// Conductor colors by FUNCTION (matching the owner's wiring diagram); the live state
// is layered on top: powered = full strength, off = faded, asked-but-dead = dashed,
// broken = red dashed.
export const CONDUCTOR_COLOR = {
  live: "#d6524b", // 230 V live
  neutral: "#4f86d4",
  earth: "#76a23c",
  lv: "#c08a2e", // 24 VAC control wiring
};

function conductorStyle(cls, state) {
  if (state === "broken") return { stroke: "#c62828", width: 2, dash: "4 3", opacity: 1 };
  const color = CONDUCTOR_COLOR[cls];
  // earth never carries loop current, so it has no meaningful off/powered state —
  // draw it solid (it IS connected) unless broken
  if (cls === "earth") return { stroke: color, width: 1.5, dash: "", opacity: 1 };
  if (state === "powered") return { stroke: color, width: 2.5, dash: "", opacity: 1 };
  if (state === "asked") return { stroke: color, width: 2, dash: "5 3", opacity: 1 };
  return { stroke: color, width: 1.5, dash: "", opacity: 0.35 }; // off
}

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

// Glyphs the user can click to open that equipment's control panel (controls.js
// panelFor). Joints/tees/caps stay inert — they have no controls and tiny targets.
const CLICKABLE_GLYPHS = new Set(["pump", "valve", "head", "nozzle"]);
const CLICKABLE_CIRCUIT_PART = (name) => name === "controller" || name === "pump" || /^Z\d+\.valve$/.test(name);

export function createRenderer(svgEl, layout, { onSelect } = {}) {
  svgEl.setAttribute("viewBox", `-10 -10 ${layout.width + 20} ${layout.height + 20}`);

  // selection: key -> highlightable elements (a hydraulic glyph and a circuit box can
  // share a key, e.g. "pump" / "Z1.valve" — both light up)
  const selectable = new Map();
  let selectedKey = null;
  const registerSelectable = (key, highlightEl, hitEl = highlightEl) => {
    if (!selectable.has(key)) selectable.set(key, []);
    selectable.get(key).push(highlightEl);
    hitEl.classList.add("hit");
    hitEl.addEventListener("click", () => onSelect?.(key));
  };

  // layer order: zone frames under pipes under glyphs under labels; circuit boxes
  // under wires so terminal dots and splices sit on top of the wire ends; leak and
  // fault markers on top of everything
  const layers = {};
  for (const name of ["zones", "pipes", "nodes", "labels", "parts", "wires", "leads", "terminals", "splices", "leaks", "faults"]) {
    layers[name] = el("g", { class: name });
    svgEl.appendChild(layers[name]);
  }

  // static chrome (state never changes any of it): zone frames + titles on the
  // hydraulic side; boxes, big part labels, terminal dots and terminal labels on
  // the circuit side
  for (const [zone, b] of layout.flow.zones) {
    layers.zones.appendChild(
      el("rect", { x: b.x, y: b.y, width: b.w, height: b.h, rx: 8, fill: "none", stroke: "#dadce0" }),
    );
    const t = el("text", { x: b.x + 8, y: b.y + 16, fill: "#5f6368", "font-size": "12" });
    t.textContent = zone;
    layers.zones.appendChild(t);
  }
  for (const [name, b] of layout.circuit.parts) {
    const box = el("rect", { x: b.x, y: b.y, width: b.w, height: b.h, rx: 10, fill: "#f7f4ea", stroke: "#ddd8c8" });
    layers.parts.appendChild(box);
    if (CLICKABLE_CIRCUIT_PART(name)) registerSelectable(name, box);
    // small boxes get the label near the top edge, above the first terminal row;
    // roomy ones (the controller) center it; labelDy overrides (e.g. the relay's
    // title clears its top-edge coil terminals)
    const t = el("text", {
      x: b.x + b.w / 2,
      y: b.y + (b.labelDy ?? (b.h >= 200 ? b.h / 2 + 4 : Math.min(b.h / 2 + 4, 24))),
      "text-anchor": "middle",
      fill: "#3c4043",
      "font-size": "12",
      "font-weight": "600",
    });
    t.textContent = b.label;
    layers.parts.appendChild(t);
  }
  for (const d of layout.circuit.anchorDots) {
    layers.terminals.appendChild(
      el("circle", { cx: d.x, cy: d.y, r: 3.5, fill: "#fff", stroke: "#9a958a" }),
    );
  }
  for (const l of layout.circuit.anchorLabels) {
    const t = el("text", { x: l.x, y: l.y, "text-anchor": l.anchor, fill: "#5f6368", "font-size": "10.5" });
    t.textContent = l.text;
    layers.terminals.appendChild(t);
  }

  const setSelected = (key) => {
    if (selectedKey) for (const e of selectable.get(selectedKey) || []) e.classList.remove("selected");
    selectedKey = selectable.has(key) ? key : null;
    if (selectedKey) for (const e of selectable.get(selectedKey)) e.classList.add("selected");
  };

  const els = new Map(); // kind -> Map<key, { node: element, title?: <title> }>

  // Keyed data-join. The graph itself is static, but M8 primitives (fault marks,
  // leaks) come and go between states, so entries absent from this scene are hidden
  // (never destroyed — a re-toggled fault reuses its element).
  const join = (prims, kind, create, update) => {
    if (!els.has(kind)) els.set(kind, new Map());
    const byKey = els.get(kind);
    const seen = new Set();
    for (const prim of prims) {
      let entry = byKey.get(prim.key);
      if (!entry) {
        entry = create(prim);
        byKey.set(prim.key, entry);
      }
      entry.node.removeAttribute("display");
      update(entry, prim);
      seen.add(prim.key);
    }
    for (const [key, entry] of byKey) {
      if (!seen.has(key)) entry.node.setAttribute("display", "none");
    }
  };

  return {
    setSelected,
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
          if (CLICKABLE_GLYPHS.has(n.glyph)) {
            // a transparent padded circle takes the clicks: the glyphs themselves are
            // thin shapes and far too small a touch target on a phone
            const hit = el("circle", {
              cx: n.x + n.w / 2,
              cy: n.y + n.h / 2,
              r: Math.max(n.w, n.h) / 2 + 9,
              fill: "transparent",
            });
            layers.nodes.appendChild(hit);
            registerSelectable(n.key, glyph, hit);
          }
          return { node: glyph, title };
        },
        ({ node, title }, n) => {
          node.setAttribute("stroke", n.color);
          node.setAttribute("stroke-width", n.state === "open" || n.state === "on" ? 3 : 1.5);
          node.setAttribute("stroke-dasharray", n.dead ? "3 2" : "");
          // scene provides a fill only for state-carrying equipment glyphs
          if (n.fill) node.setAttribute("fill", n.fill);
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

      const applyConductor = ({ node }, c) => {
        const s = conductorStyle(c.cls, c.state);
        node.setAttribute("stroke", s.stroke);
        node.setAttribute("stroke-width", s.width);
        node.setAttribute("stroke-dasharray", s.dash);
        node.setAttribute("stroke-opacity", s.opacity);
      };
      const conductorLine = (layer) => (c) => {
        const line = el("polyline", {
          points: pointsAttr(c.points),
          fill: "none",
          "stroke-linejoin": "round",
        });
        const title = el("title");
        title.textContent = c.key;
        line.appendChild(title);
        layer.appendChild(line);
        return { node: line };
      };
      join(scene.wires, "wire", conductorLine(layers.wires), applyConductor);
      join(scene.leads, "lead", conductorLine(layers.leads), applyConductor);

      join(
        scene.splices,
        "splice",
        (s) => {
          const dot = el("circle", { cx: s.x, cy: s.y, r: 4.5 });
          const title = el("title");
          title.textContent = `${s.key} (field splice)`;
          dot.appendChild(title);
          layers.splices.appendChild(dot);
          return { node: dot };
        },
        ({ node }, s) => {
          node.setAttribute("fill", s.state === "broken" ? "#c62828" : CONDUCTOR_COLOR.lv);
          node.setAttribute("fill-opacity", s.state === "off" ? 0.35 : 1);
        },
      );

      // M8: active leaks — a red drop with the escaping flow alongside
      join(
        scene.leaks || [],
        "leak",
        (l) => {
          const g = el("g");
          g.appendChild(el("circle", { cx: l.x, cy: l.y, r: 5, fill: "#c62828", "fill-opacity": 0.85 }));
          const t = el("text", {
            x: l.x + 8,
            y: l.y + 4,
            "font-size": "11",
            fill: "#c62828",
            "font-weight": "600",
          });
          g.appendChild(t);
          const title = el("title");
          title.textContent = `${l.key} leak`;
          g.appendChild(title);
          layers.leaks.appendChild(g);
          return { node: g, text: t };
        },
        ({ text }, l) => {
          text.textContent = `💧 ${l.text}`;
        },
      );

      // M8: every faulted hydraulic element wears an ✕
      join(
        scene.faultMarks || [],
        "fault",
        (f) => {
          const t = el("text", {
            x: f.x,
            y: f.y,
            "text-anchor": "middle",
            "font-size": "13",
            "font-weight": "700",
            fill: "#c62828",
          });
          t.textContent = "✕";
          const title = el("title");
          t.appendChild(title);
          layers.faults.appendChild(t);
          return { node: t, title };
        },
        ({ title }, f) => {
          title.textContent = f.title;
        },
      );
    },
  };
}
