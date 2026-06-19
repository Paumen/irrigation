// Scene stub (U6/U7) — the static scene graph the canvas draws once.
//
// Real M5 turns `model` + hand-authored `geometry` into pipe/wire paths and glyph
// descriptors. This stub returns the no-op baseline (the UI analog of faults.js's
// emptyEffects): a flat list of placeholder items so the canvas, status slots (U9)
// and side sheet are visible end-to-end before geometry exists.

// Item `type` decides which reading drives its status slot — see render.js / U9.
const PLACEHOLDER_ITEMS = [
  { id: "source.well", type: "source", x: 40, y: 440 },
  { id: "pump.jet", type: "pump", x: 120, y: 440 },
  { id: "manifold", type: "joint", x: 200, y: 440 },
  { id: "Z2_valve.auto", type: "valve", x: 200, y: 320 },
  { id: "Z2_head.rotor", type: "head", x: 280, y: 320 },
  { id: "O1_control.controller", type: "electrical", x: 160, y: 40 },
];

export function buildScene(_model, _geometry) {
  return { items: PLACEHOLDER_ITEMS };
}
