// Bootstrap glue: load the root YAMLs -> build the model -> EPANET + elkjs layout
// (once) -> control panel -> solve and render, live. Any control change re-solves
// after a short debounce (slider drags coalesce); the units toggle only repaints the
// cached result. M7 adds quasi-time, M8 fault injection.

import { loadInputs } from "./yaml-load.js";
import { buildModel } from "./model.js";
import { createHydraulics } from "./epanet-runner.js";
import { solveElectrical } from "./electrical.js";
import { solveSteady } from "./solver.js";
import { computeLayout } from "./layout.js";
import { buildScene } from "./scene.js";
import { createRenderer } from "./render.js";
import { buildControls } from "./controls.js";
import { fmtFlow } from "./units.js";
import { DEBOUNCE_MS } from "./config.js";

const status = document.getElementById("status");
const say = (msg) => {
  status.textContent = msg;
};

let ctx = null; // { model, circuit, hyd, layout, renderer } once booted
let last = null; // { steady, elec } of the most recent solve, repainted on units toggle

function repaint(lmin) {
  const { model, layout, renderer } = ctx;
  renderer.update(buildScene(model, layout, last.steady, last.elec, { lmin }));
}

// One-line summary of a solved state, including any valve asked for but not lifting.
function statusText(steady, elec, lmin) {
  if (!steady.converged) return `NOT CONVERGED after ${steady.iters} iterations`;
  const parts = [];
  if (!elec.pumpPowered && steady.outSum < 1e-9) {
    parts.push("idle — no flow");
  } else {
    parts.push(
      `pump ${fmtFlow(steady.pumpFlow, lmin)} → outlets ${fmtFlow(steady.outSum, lmin)} · ` +
        `${steady.iters} iterations`,
    );
  }
  const stuck = Object.entries(steady.commandedNotOpening)
    .filter(([, v]) => v)
    .map(([id]) => id);
  if (stuck.length) parts.push(`⚠ ${stuck.join(", ")} commanded but not opening`);
  return parts.join(" · ");
}

// Solve commands+state through the electrical and hydraulic cores and paint the
// result, synchronously. The controls go through requestRender (debounced); this
// stays exported as the programmatic/console entry point.
export function renderState(commands, state = { manualOpen: {} }, opts = {}) {
  if (!ctx) throw new Error("app: renderState called before the simulator finished booting");
  const { model, circuit, hyd } = ctx;
  const elec = solveElectrical(circuit, commands, opts.blocked || new Set());
  const steady = solveSteady(model, state, elec, hyd);
  last = { steady, elec };
  repaint(!!opts.lmin);
  return steady;
}

let pending = 0;
function requestRender(ui, { unitsOnly = false } = {}) {
  if (unitsOnly) {
    if (last) {
      repaint(ui.lmin);
      say(statusText(last.steady, last.elec, ui.lmin));
    }
    return;
  }
  clearTimeout(pending);
  pending = setTimeout(() => {
    say("solving…");
    const steady = renderState(ui.commands, ui.state, { lmin: ui.lmin });
    say(statusText(steady, last.elec, ui.lmin));
  }, DEBOUNCE_MS);
}

try {
  say("loading YAML inputs…");
  const { graph, catalog } = await loadInputs("..");
  const model = buildModel(graph, catalog);

  say("starting EPANET (wasm)…");
  const hyd = await createHydraulics();

  say("computing layout…");
  const layout = await computeLayout(model, graph.circuit);
  const renderer = createRenderer(document.getElementById("schematic"), layout);
  ctx = { model, circuit: graph.circuit, hyd, layout, renderer };

  const ui = buildControls(document.getElementById("controls"), model, requestRender);

  say("solving…");
  const steady = renderState(ui.commands, ui.state, { lmin: ui.lmin });
  say(`${statusText(steady, last.elec, ui.lmin)} (epanet ${hyd.version})`);
} catch (err) {
  // a blank page hides CDN/wasm failures; surface them where the user looks
  say(`failed to start: ${err.message}`);
  throw err;
}
