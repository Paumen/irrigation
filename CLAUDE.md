# CLAUDE.md

## Project

Three unrelated things for one homeowner's irrigation/rotor system:

1. **Diagnostic toolkit** — one Claude skill backed by MCP tools, covering:
   - **Troubleshooting** — a scoring engine walks a Q&A loop, re-ranking the likeliest failure modes. Driven by `playbooks/troubleshoot.md` via the `diagnose_irrigation` MCP tool; pure engine in `tools/` (`engine.py`, `diagnose*.py`, `data.json`).
   - **Hydraulics & general help** — how-it-works / identify / upgrade / maintenance playbooks.
2. **Simulator** (`sim/`, in progress) — see below.
3. Soil watering tool.

## Simulator (`sim/`)

A physics engine for the system's hydraulics **and** control wiring, in progress. The spec is split across `docs/sim_*.md`, each file owning **one** concern (no decision restated in two places):

- `sim_spec.md` — **requirements** (the "what": States / Logic / UI).
- `sim_state_model.md` — **authoritative engine model**: state primitives (`live`/`pressure`/`flow`), the control surface, the world-edge boundary states, readings, the local valve-actuation relation, and the fault model (`dead` / `clog`·`leak` / `stuck`). Other docs reference it, never restate it.
- `sim_ui.md` — **UX/visual spec**: look, diagram, interaction (defers control/status vocabulary to `sim_state_model.md`).
- `sim_build_plan.md` — **the plan**: milestones, file layout, build order, status, verification. Owns the milestone numbering.


- **Input** is the root `system.yaml` — single source of truth (the former `graph.yaml` + `catalog.yaml` + `context.yaml`, merged; no copies).
- **No fault layer.** `faults.js` and its effect seams have been removed; `solveSteady` models the healthy system only. Re-introducing faults (the deferred M8 milestone) means re-adding the solver/network hooks from scratch.
- **Verify: `cd sim && npm install && npm test`** (full harness; `npm run smoke` is the M0 EPANET spike). Pipeline: `buildModel` → `solveElectrical` → `solveSteady(model, controls, elec, hyd)`.

## Session setup

`.claude/hooks/session-start.sh` (via `.claude/settings.json`) runs at session start: `pip install -r requirements.txt` (MCP SDK, pyyaml). Synchronous, so the session is ready on open.

The environment setup script also installs the **GitHub CLI (`gh`)** and authenticates it via the `GH_TOKEN` env var (account `Paumen`). So `gh` is available in Bash and can read/operate on all of the user's repos within the token's grants — not just `paumen/irrigation`. Prefer `gh` for GitHub work outside this repo; the `mcp__github__*` tools are scoped to `paumen/irrigation`.

## Gotchas

- Bash cwd persists across calls, so a `cd` silently changes cwd for every later call — and file tools (`SendUserFile`) resolve relative paths against it. Use absolute paths, or avoid `cd` (e.g. `ls dir/` not `cd dir`).
- Always pass the `files` array on the **first** `SendUserFile` call; an empty call fails validation ("required parameter `files` is missing").
