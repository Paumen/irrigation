# CLAUDE.md

## Project

Two unrelated things for one homeowner's irrigation/rotor system:

1. **Diagnostic toolkit** — one Claude skill backed by MCP tools, covering:
   - **Troubleshooting** — a scoring engine walks a Q&A loop, re-ranking the likeliest failure modes. Driven by `playbooks/troubleshoot.md` via the `diagnose_irrigation` MCP tool; pure engine in `tools/` (`engine.py`, `diagnose*.py`, `data.json`).
   - **Hydraulics & general help** — how-it-works / identify / upgrade / maintenance playbooks.
2. **Simulator** (`sim/`, in progress) — see below.

## Simulator (`sim/`)

A physics engine for the system's hydraulics **and** control wiring. Spec history in `docs/sim_*.md`.

- **Input** is the root `system.yaml` — single source of truth (the former `graph.yaml` + `catalog.yaml` + `context.yaml`, merged; no copies). Sections: graph (`category`/`items`/`water`/`electrical`, with per-component `fail:` lists), catalog (`pump.jet_curves`/`valve.auto_loss`/`head.rotor/nozzle`/`head.spray/nozzle`), and context (`cable_runs`/`control_paths`/`system_design_choices`).
- **Hydraulics = EPANET** (`epanet-js`, EPANET 2.2 wasm) wrapped by our own fixed-point demand loop in `solver.js`: pressure-driven outlets from the catalog laws, auto-valve lift/stay hysteresis driven by the real wiring solve (`electrical.js`), reachability-based dead-branch handling, mass balance. Starved table outlets fall back to EPANET emitters below their lowest catalog point; fed-back quantities use adaptive damping so extreme cases settle.
- **`faults.js` is an M9 stub** — `compileFaults` returns `emptyEffects()` (the no-fault baseline). Its channel shape (`closedLinks`/`linkK`/`leaks`/`valveLossScale`/`outletMods`/`elecBlocked`/…) is already what `solver.js`/`network.js`/`electrical.js` read; the planned engine will compile `system.yaml`'s ~400 `fail:` entries into those channels (see `docs/sim_*.md`).
- **Verify: `cd sim && npm install && npm test`** (full harness; `npm run smoke` is the M0 EPANET spike). Pipeline: `buildModel` → `solveElectrical` → `solveSteady(model, state, elec, hyd, compileFaults(model, faults))`.

## Session setup

`.claude/hooks/session-start.sh` (via `.claude/settings.json`) runs at session start: `pip install -r requirements.txt` (MCP SDK, pyyaml). Synchronous, so the session is ready on open.

## Gotchas

- Bash cwd persists across calls, so a `cd` silently changes cwd for every later call — and file tools (`SendUserFile`) resolve relative paths against it. Use absolute paths, or avoid `cd` (e.g. `ls dir/` not `cd dir`).
- Always pass the `files` array on the **first** `SendUserFile` call; an empty call fails validation ("required parameter `files` is missing").
