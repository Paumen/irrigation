// Render stub (U20) — the data-join that updates the scene from a solved result.
//
// This is the UI analog of faults.js's emptyEffects: it consumes a SteadyResult-shaped
// object and draws the *no-fault baseline* — positions and a neutral status slot per item.
// The visual encodings (flow width/colour U12, pressure saturation U13, coverage U14,
// precip U15, live styling U16) layer on top later; the stub deliberately omits them.

const SVG = "http://www.w3.org/2000/svg";

// U9: each item type maps to the one reading that drives its status slot.
const READING_BY_TYPE = {
  valve: "open",
  head: "watering", // watering / starved
  pump: "primed",
  source: "pressurised",
  pipe: "pressurised",
  joint: "pressurised",
  chamber: "pressurised",
  electrical: "live",
};

const el = (name, attrs) => {
  const node = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

// Draw the static scene once. Positions never move after this (sim_build_plan.md).
export function mountScene(svg, scene) {
  svg.replaceChildren();
  for (const item of scene.items) {
    const g = el("g", { "data-id": item.id, transform: `translate(${item.x},${item.y})` });
    g.append(el("circle", { r: 6, fill: "#ccc", stroke: "#666" })); // neutral baseline glyph
    const label = el("text", { x: 10, y: 4, "font-size": 9, fill: "#333" });
    label.textContent = item.id;
    const slot = el("text", { x: 10, y: 15, "font-size": 8, fill: "#999", "data-slot": "" });
    slot.textContent = `${READING_BY_TYPE[item.type] ?? "?"}: —`;
    g.append(label, slot);
    svg.append(g);
  }
}

// U20: re-render from a solved result. Stub shows the status-slot contract only;
// with no result it stays baseline "—". U21: surface non-convergence plainly.
export function renderScene(svg, scene, result) {
  const badge = document.getElementById("badge");
  if (badge) {
    if (result && result.converged === false) badge.setAttribute("data-show", "");
    else badge.removeAttribute("data-show");
  }

  for (const item of scene.items) {
    const g = svg.querySelector(`[data-id="${CSS.escape(item.id)}"]`);
    const slot = g?.querySelector("[data-slot]");
    if (!slot) continue;
    const reading = READING_BY_TYPE[item.type] ?? "?";
    // Real readings come from readings.js over the solve; the stub has nothing solved yet.
    slot.textContent = `${reading}: —`;
  }
}
