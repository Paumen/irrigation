// Bootstrap glue: load the root YAMLs -> build the model -> EPANET + elkjs layout
// (once) -> solve and render one settled state. M6 adds the control panel and
// debounced re-solves on top of renderState(); until then the page shows a fixed
// representative state: pump commanded with zone 1 running.

import { loadInputs } from "./yaml-load.js";
import { buildModel } from "./model.js";
import { createHydraulics } from "./epanet-runner.js";
import { solveElectrical } from "./electrical.js";
import { solveSteady } from "./solver.js";
import { computeLayout } from "./layout.js";
import { buildScene } from "./scene.js";
import { createRenderer } from "./render.js";

const status = document.getElementById("status");
const say = (msg) => {
  status.textContent = msg;
};

let ctx = null; // { model, circuit, hyd, layout, renderer } once booted

// Solve commands+state through the electrical and hydraulic cores and paint the
// result. The single entry point M6's controls will call.
export function renderState(commands, state = { manualOpen: {} }, opts = {}) {
  if (!ctx) throw new Error("app: renderState called before the simulator finished booting");
  const { model, circuit, hyd, layout, renderer } = ctx;
  const elec = solveElectrical(circuit, commands, opts.blocked || new Set());
  const steady = solveSteady(model, state, elec, hyd);
  renderer.update(buildScene(model, layout, steady, elec, { lmin: !!opts.lmin }));
  return steady;
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

  say("solving…");
  const steady = renderState({ mv: true, zones: { 1: true } });
  say(
    `pump on + zone 1 — pump ${steady.pumpFlow.toFixed(2)} m³/h, ` +
      `${steady.iters} iterations, ${steady.converged ? "converged" : "NOT CONVERGED"} ` +
      `(epanet ${hyd.version})`,
  );
} catch (err) {
  // a blank page hides CDN/wasm failures; surface them where the user looks
  say(`failed to start: ${err.message}`);
  throw err;
}
