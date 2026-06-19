# CLAUDE.md

## Project

Two unrelated things for one homeowner's irrigation/rotor system:

1. **Diagnostic toolkit** — one Claude skill backed by MCP tools, covering:
   - **Troubleshooting** — a scoring engine walks a Q&A loop, re-ranking the likeliest failure modes. Driven by `playbooks/troubleshoot.md` via the `diagnose_irrigation` MCP tool; pure engine in `tools/` (`engine.py`, `diagnose*.py`, `data.json`).
   - **Hydraulics & general help** — how-it-works / identify / upgrade / maintenance playbooks.
2. **Simulator** (`sim/`, in progress) — see below.

## Simulator (`sim/`)

A physics engine for the system's hydraulics **and** control wiring, in progress. The spec is split across `docs/sim_*.md`, each file owning **one** concern (no decision restated in two places):

- `sim_spec.md` — **requirements** (the "what": States / Logic / UI).
- `sim_state_model.md` — **authoritative engine model**: state primitives (`live`/`pressure`/`flow`), the control surface, the world-edge boundary states, readings, the local valve-actuation relation, and the fault model (`dead` / `clog`·`leak` / `stuck`). Other docs reference it, never restate it.
- `sim_ui.md` — **UX/visual spec**: look, diagram, interaction (defers control/status vocabulary to `sim_state_model.md`).
- `sim_build_plan.md` — **the plan**: milestones, file layout, build order, status, verification. Owns the milestone numbering.
- `docs/mockups/` — **UI interpretation partials** (not the app). Named `<requirement(s)>-<what-it-is>` (e.g. `U6-diagram`), each tied to the `sim_ui.md` requirement(s) it checks. SVG sources live in `docs/mockups/svg/`, rendered PNGs at the `docs/mockups/` root. Three sheets (`U6-diagram`, `U18-panel-overlay`, `U12-U16-legend`) come from `gen.py`; the rest are hand-authored. `svg2png.py` (`pip install cairosvg`) renders every `svg/*.svg` to a same-named PNG — keep PNGs in sync via `python3 gen.py && python3 svg2png.py`. See `docs/mockups/README.md`.
  - **Mockups: show the PNG and await feedback before anything else.** When making or changing a mockup, the first step is to render it and send the PNG to the user, then *stop and wait for their reaction*. Do not commit, push, open a PR, or build further variants until they've responded — a mockup is meant to be cheap to redirect, so feedback gates every later step.

- **Input** is the root `system.yaml` — single source of truth (the former `graph.yaml` + `catalog.yaml` + `context.yaml`, merged; no copies).
- **No fault layer.** `faults.js` and its effect seams have been removed; `solveSteady` models the healthy system only. Re-introducing faults (the deferred M8 milestone) means re-adding the solver/network hooks from scratch.
- **Verify: `cd sim && npm install && npm test`** (full harness; `npm run smoke` is the M0 EPANET spike). Pipeline: `buildModel` → `solveElectrical` → `solveSteady(model, controls, elec, hyd)`.

## Session setup

`.claude/hooks/session-start.sh` (via `.claude/settings.json`) runs at session start: `pip install -r requirements.txt` (MCP SDK, pyyaml). Synchronous, so the session is ready on open.

## Gotchas

- Bash cwd persists across calls, so a `cd` silently changes cwd for every later call — and file tools (`SendUserFile`) resolve relative paths against it. Use absolute paths, or avoid `cd` (e.g. `ls dir/` not `cd dir`).
- Always pass the `files` array on the **first** `SendUserFile` call; an empty call fails validation ("required parameter `files` is missing").
