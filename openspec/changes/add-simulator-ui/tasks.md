## 1. Diagram (M5)

- [ ] 1.1 `geometry.js` — hand-authored coordinates for every flow node, circuit-part port pin, and wire route
- [ ] 1.2 Node completeness test — fail on any `system.yaml` element without a position (or any position without an element)
- [ ] 1.3 `scene.js` — model + geometry -> static paths/glyph descriptors, built once
- [ ] 1.4 `render.js` — data-join SVG update: flow stroke width, pressure colour, idle grey/dashed, `live` wiring trace, m³/h outlet labels

## 2. Controls + app (M6)

- [ ] 2.1 `controls.js` — the eight item-level controls + inspection side sheet, read against catalog context
- [ ] 2.2 Web Worker solve with main-thread fallback if CDN wasm cannot load in the worker
- [ ] 2.3 `app.js` — load -> model -> geometry -> controls glue with debounced re-solve
- [ ] 2.4 `index.html` — importmap (epanet-js, js-yaml), SVG container + side sheet, fetch `../system.yaml`
- [ ] 2.5 Non-convergence affordance — keep last good render + "won't settle" badge off the `converged` flag
- [ ] 2.6 `units.js` / `quasitime.js` — bar + m³/h formatting; settle-in animation between states

## 3. Ship

- [ ] 3.1 `.github/workflows/pages.yml` deploying the whole repo as the Pages artifact
- [ ] 3.2 `sim/README.md` — how to run/deploy + the one-time Pages source note
