# CLAUDE.md

## Project

Two things for one homeowner's irrigation/rotor system:

1. An agent-facing **diagnostic toolkit** — one **Claude skill backed by MCP tools**, covering two capabilities:
   - **Troubleshooting** — a scoring engine walks a question-and-answer loop and continually re-ranks the most likely root failure modes. Driven by the `playbooks/troubleshoot.md` playbook via the `diagnose_irrigation` MCP tool. Pure scoring engine lives in `tools/` (`engine.py`, `diagnose*.py`, `data.json`).
   - **Hydraulics & general assistance** — how-it-works / identify / upgrade / maintenance playbooks.
2. A **simulator** under `sim/` (in progress) — see below. Unrelated to the `tools/` diagnostic engine.

## Simulator (`sim/`)

A physics engine for the system's hydraulics **and** control wiring. Spec history: `docs/Sim_spec.md`, `docs/sim_implementation_plan.md`, `docs/sim_build_plan.md`.

- **Inputs** are the root `system.yaml` (the former `graph.yaml` + `catalog.yaml` + `context.yaml`, merged into one document — single source of truth, no copies). Its sections: the **graph** keys `category`/`items`/`water`/`electrical` (hydraulic `flow` network + electrical `circuit` + component `kinds`/`fail:` lists), the **catalog** keys `pump.jet_curves`/`valve.auto_loss`/`head.rotor/nozzle`/`head.spray/nozzle` (pump curve, valve-loss, nozzle tables), and the **context** keys (`equipment`, `cable_runs`, `control_paths`, `system_design_choices`, labels).
- **Hydraulics = EPANET** via `epanet-js` (EPANET 2.2 wasm), wrapped by our own outer fixed-point demand loop (`solver.js`): pressure-driven outlets from the catalog laws, auto-valve actuation with lift/stay hysteresis through the real wiring solve (`electrical.js`), reachability-based dead-branch handling, mass balance. `faults.js` compiles any combination of system.yaml's ~400 `fail:` entries into solver/network mutations (clog severities → restricted/sealed links, valve-seat clogs scale the valve's loss curve since EPANET ignores GPV minor losses, leak emitters at the nearest junction, weak/dead pump, stuck-open/disabled valves, outlet-law rewrites, electrical cuts). Starved table outlets hand off to EPANET emitters below their lowest catalog point and every fed-back quantity uses adaptive damping (step halves on sign flips), so extreme severities settle.
- **Verify with `cd sim && npm install && npm test`** (the full harness; `npm run smoke` is the M0 EPANET spike). Entry points: `buildModel` → `solveElectrical` → `solveSteady(model, state, elec, hyd, compileFaults(model, faults))`.

## Session setup

`.claude/hooks/session-start.sh` (registered via `.claude/settings.json`) runs at the start of every Claude Code on the web session: `pip install -r requirements.txt` for the MCP SDK and `pyyaml`. Synchronous so the session is ready when it opens.

## Gotchas

- Bash working directory persists between calls, so a `cd` (e.g. `cd .claude/skills/irrigation/media`) silently changes cwd for every later tool call. File tools like `SendUserFile` resolve relative paths against that cwd, so relative paths break after a `cd`. Use absolute paths for file tools, or avoid `cd` (`ls .claude/skills/irrigation/media` instead).
- When sharing images/files, always pass the `files` array on the **first** `SendUserFile` call — never emit a bare invocation with no arguments. An empty call fails validation with "required parameter `files` is missing" and just adds noise before the retry.
