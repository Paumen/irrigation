# CLAUDE.md

## Project

Two things for one homeowner's irrigation/rotor system:

1. An agent-facing **diagnostic toolkit** — one **Claude skill backed by MCP tools**, covering two capabilities:
   - **Troubleshooting** — a scoring engine walks a question-and-answer loop and continually re-ranks the most likely root failure modes. Driven by the `playbooks/troubleshoot.md` playbook via the `diagnose_irrigation` MCP tool. Pure scoring engine lives in `tools/` (`engine.py`, `diagnose*.py`, `data.json`).
   - **Hydraulics & general assistance** — how-it-works / identify / upgrade / maintenance playbooks.
2. A browser-based **simulator** under `sim/` (in progress) — see below. Unrelated to the `tools/` diagnostic engine.

## Simulator (`sim/`)

A static, browser-based simulator of the system's hydraulics **and** control wiring (spec: `docs/Sim_spec.md`; how-to-build: `docs/sim_implementation_plan.md`; full design + milestones M0–M8: `docs/sim_build_plan.md`).

- **Inputs** are the three root YAMLs: `graph.yaml` (hydraulic `flow` network + electrical `circuit` + component `kinds`/`fail:` lists), `catalog.yaml` (pump curve, valve-loss, nozzle tables), `context.yaml` (labels). Single source of truth — the sim fetches these, no copies.
- **Hydraulics = EPANET** via `epanet-js` (EPANET 2.2 wasm), wrapped by our own outer fixed-point demand loop. Browser loads deps (epanet-js, js-yaml, elkjs) from **CDN** via importmap; deployment target is **GitHub Pages** (whole-repo artifact; needs repo Settings → Pages → Source: GitHub Actions enabled once).
- The physics core is plain ES modules importable headless by **Node**, so it's testable without a browser. `sim/package.json` + `node_modules` (git-ignored) exist only for that harness — not a browser build step.
- **Status: M0–M6 done** (headless hydraulic + electrical core + schematic + live control panel, verified by `cd sim && npm install && npm test`; `npm run smoke` is the M0 EPANET spike). The schematic layer is split: `layout.js` (elkjs for the hydraulics, once at startup) + `circuit-layout.js` (fixed hand-drawn wiring diagram, validated against graph.yaml) + `scene.js` (pure visual-attribute computation, harness-gated) feed `render.js` (thin SVG data-join). `controls.js` (M6) is split the same way — `controlSpec()`/`initialUiState()` pure + harness-gated, the DOM half browser-only — and drives debounced re-solves through `app.js`; the units toggle only repaints the cached result. Rotor flo-stops (`state.floStop`) and valve flow-control screws (`state.throttle`; per-valve GPV loss curve scaled 1/t², seated screw holds the valve shut) live in the solver/network core. Browser check: `python3 -m http.server` from repo root, open `/sim/`. M7+ (quasi-time, faults) not yet built.

## Session setup

`.claude/hooks/session-start.sh` (registered via `.claude/settings.json`) runs at the start of every Claude Code on the web session: `pip install -r requirements.txt` for the MCP SDK and `pyyaml`. Synchronous so the session is ready when it opens.

## Gotchas

- Bash working directory persists between calls, so a `cd` (e.g. `cd .claude/skills/irrigation/media`) silently changes cwd for every later tool call. File tools like `SendUserFile` resolve relative paths against that cwd, so relative paths break after a `cd`. Use absolute paths for file tools, or avoid `cd` (`ls .claude/skills/irrigation/media` instead).
- When sharing images/files, always pass the `files` array on the **first** `SendUserFile` call — never emit a bare invocation with no arguments. An empty call fails validation with "required parameter `files` is missing" and just adds noise before the retry.
