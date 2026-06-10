// Bootstrap glue: load the root YAMLs -> build the model -> EPANET + elkjs layout
// (once) -> control panel -> solve and render, live. Any control or fault change
// re-solves after a short debounce (slider drags coalesce); the units toggle only
// repaints the cached result. The timeline footer (M7) steps/plays through captured
// command-states, each solved once and cached.

import { loadInputs } from "./yaml-load.js";
import { buildModel } from "./model.js";
import { createHydraulics } from "./epanet-runner.js";
import { solveElectrical } from "./electrical.js";
import { solveSteady } from "./solver.js";
import { compileFaults } from "./faults.js";
import { computeLayout } from "./layout.js";
import { buildScene } from "./scene.js";
import { createRenderer } from "./render.js";
import { buildControls } from "./controls.js";
import { snapshotUi, buildTimeline } from "./quasitime.js";
import { fmtFlow } from "./units.js";
import { DEBOUNCE_MS } from "./config.js";

const status = document.getElementById("status");
const say = (msg) => {
  status.textContent = msg;
};

let ctx = null; // { model, circuit, hyd, layout, renderer } once booted
let last = null; // { steady, elec, fx } of the most recent solve, repainted on units toggle

function repaint(lmin) {
  const { model, layout, renderer } = ctx;
  renderer.update(buildScene(model, layout, last.steady, last.elec, { lmin, faults: last.fx }));
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
  const leakTotal = [...steady.leakFlows.values()].reduce((a, b) => a + b, 0);
  if (leakTotal > 1e-6) parts.push(`💧 leaking ${fmtFlow(leakTotal, lmin)}`);
  const stuck = Object.entries(steady.commandedNotOpening)
    .filter(([, v]) => v)
    .map(([id]) => id);
  if (stuck.length) parts.push(`⚠ ${stuck.join(", ")} commanded but not opening`);
  return parts.join(" · ");
}

// Commands + state + faults through the fault compiler and both physics cores.
function solveAll(commands, state, faults, extraBlocked) {
  const { model, circuit, hyd } = ctx;
  const fx = compileFaults(model, faults || {});
  const blocked = extraBlocked ? new Set([...fx.elecBlocked, ...extraBlocked]) : fx.elecBlocked;
  const elec = solveElectrical(circuit, commands, blocked);
  const steady = solveSteady(model, state, elec, hyd, fx);
  return { steady, elec, fx };
}

// Solve and paint, synchronously. The controls go through requestRender (debounced);
// this stays exported as the programmatic/console entry point.
export function renderState(commands, state = { manualOpen: {} }, opts = {}) {
  if (!ctx) throw new Error("app: renderState called before the simulator finished booting");
  last = solveAll(commands, state, opts.faults, opts.blocked);
  repaint(!!opts.lmin);
  return last.steady;
}

let timeline = null; // assigned at boot; deactivated whenever a live control changes
let pending = 0;
function requestRender(ui, { unitsOnly = false } = {}) {
  if (unitsOnly) {
    if (last) {
      repaint(ui.lmin);
      say(statusText(last.steady, last.elec, ui.lmin));
    }
    return;
  }
  timeline?.deactivate(); // a touched control means the live state is showing again
  clearTimeout(pending);
  pending = setTimeout(() => {
    say("solving…");
    try {
      const steady = renderState(ui.commands, ui.state, { lmin: ui.lmin, faults: ui.faults });
      say(statusText(steady, last.elec, ui.lmin));
    } catch (err) {
      // an uncaught throw in the timer would leave the status stuck on "solving…"
      say(`solve failed: ${err.message}`);
      console.error(err);
    }
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
  let controls = null; // assigned synchronously below, before any click can land
  const svg = document.getElementById("schematic");
  const renderer = createRenderer(svg, layout, {
    onSelect: (id) => {
      if (!controls) throw new Error("app: glyph selected before controls initialised");
      controls.select(id);
      renderer.setSelected(id);
    },
  });
  ctx = { model, circuit: graph.circuit, hyd, layout, renderer };

  controls = buildControls(document.getElementById("sheet"), model, requestRender, {
    displayEl: document.getElementById("display-ctl"),
    onClose: () => renderer.setSelected(null),
  });
  const ui = controls.ui;
  const idleSnap = snapshotUi(ui); // shown for timeline positions before the first entry

  // M7: the quasi-time footer. Each entry is a settled state, solved once and cached;
  // scrubbing and playing just repaint cached results.
  const tlCache = new Map(); // snapshot -> { steady, elec, fx }
  timeline = buildTimeline(document.getElementById("timeline"), {
    capture: () => snapshotUi(ui),
    show: (snap, t, idx, n) => {
      const s = snap ?? idleSnap;
      try {
        if (!tlCache.has(s)) tlCache.set(s, solveAll(s.commands, s.state, s.faults));
        last = tlCache.get(s);
        repaint(ui.lmin);
        const which = idx < 0 ? "initial state" : `state ${idx + 1}/${n}`;
        say(`t = ${Math.round(t)} s (${which}) · ${statusText(last.steady, last.elec, ui.lmin)}`);
      } catch (err) {
        say(`solve failed: ${err.message}`);
        console.error(err);
      }
    },
    exit: () => requestRender(ui),
  });

  // clicking empty schematic (or pressing Escape) slides the sheet away
  svg.addEventListener("click", (e) => {
    if (!e.target.closest(".hit")) controls.close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") controls.close();
  });

  say("solving…");
  const steady = renderState(ui.commands, ui.state, { lmin: ui.lmin, faults: ui.faults });
  say(
    `${statusText(steady, last.elec, ui.lmin)} (epanet ${hyd.version}) — ` +
      "click a part in the diagram to control it",
  );
} catch (err) {
  // a blank page hides CDN/wasm failures; surface them where the user looks
  say(`failed to start: ${err.message}`);
  throw err;
}
