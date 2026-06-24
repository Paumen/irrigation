// App stub — glue (U6/U7 single view, U20 live update).
//
// Real M6 is: load system.yaml -> model -> hydraulics -> geometry -> controls,
// then a debounced electrical -> compileFaults -> solveSteady -> renderScene on any
// change. This stub stands the loop up with no model and no solve: it mounts the static
// scene, renders the baseline (everything "—"), and wires the controls' onChange to a
// re-render, so the pipeline shape is visible end-to-end before the pieces land.

import { buildScene } from "./scene.js";
import { mountScene, renderScene } from "./render.js";
import { mountControls } from "./controls.js";

const svg = document.getElementById("scene");
const sheet = document.getElementById("sheet");

const scene = buildScene(/* model */ null, /* geometry */ null);
mountScene(svg, scene);

// No solver yet: the baseline result is "nothing solved", which converges trivially.
let result = { converged: true };
renderScene(svg, scene, result);

// U20/U16: a control change re-renders. Stub re-renders the same baseline (no solve).
mountControls(sheet, () => renderScene(svg, scene, result));
