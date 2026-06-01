# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

An agent-facing diagnostic toolkit for one homeowner's irrigation/rotor system. One **Claude skill backed by MCP tools** (there is no web app), covering two capabilities:

- **Troubleshooting** — a scoring engine walks a question-and-answer loop and continually re-ranks the most likely root causes. Driven by the `playbooks/troubleshoot.md` playbook via the `diagnose_irrigation` MCP tool.
- **Hydraulics & general assistance** — a full hydraulic solve plus how-it-works / identify / capacity / upgrade / maintenance playbooks. Driven by the `irrigation_hydraulics` MCP tool.

Both live in the single `irrigation` skill. See `.claude/skills/irrigation/SKILL.md` (shared preamble + intent → playbook router) and `.claude/skills/irrigation/playbooks/` for how the agent loops run, and `docs/spec.md` for the diagnostic-engine spec.

## Build / run

Python only — no build step and no JS/Node toolchain. The MCP server is `tools/mcp_server.py` (registered in `.mcp.json`, FastMCP, needs `requirements.txt`). Every tool also works as a library and as a stdin/stdout CLI:

- `python3 tools/diagnose.py` — questionnaire scoring (reads `data.json`).
- `python3 tools/test_diagnose.py` — questionnaire convergence regression tests.
- `python3 tools/hydraulics.py` — hydraulic solve (reads `setup.yaml`, needs `pyyaml`).
- `python3 tools/test_hydraulics.py` — hydraulics regression tests.

## Diagnostic engine

`tools/engine.py` + `data.json` are the **single source of truth** for the troubleshooting questionnaire — questions, causes, weights, stages, slider curves. `data.json` is hand-maintained; edit it directly. `tools/engine.py` holds the pure scoring algorithm (`rank`, `recommendations`, discriminators, stage progress) — no I/O of its own; `tools/diagnose.py` loads `data.json` and wraps it. Edit weights, question shapes, and scoring rules in these two files, then re-run `python3 tools/test_diagnose.py` — it drives the engine fault-by-fault through a per-fault answer key and asserts each true cause still reaches the top of the ranking within 15 questions (so a weight tweak can't silently break convergence). `docs/fcode_spec.md` documents the `F<component>.<mode>.<instance>` cause taxonomy used in `data.json`.

## Agent tooling (`tools/`)

- `tools/engine.py` — pure scoring engine, stdlib only.
- `tools/diagnose.py` — agent-facing wrapper: returns top causes + next questions with `D`. Library or stdin/stdout CLI.
- `tools/test_diagnose.py` — questionnaire convergence regression: drives the engine fault-by-fault (following each step's top-recommended question) through a representative per-fault answer key — discrete answers plus the Q9/Q10/Q11 context matrices. Severity is two-tier: a true cause ending **out of the top 3** (beyond its `EXPECTED_MAX` cap for documented near-degeneracies) is a **FAILURE** (exit 1); a cause that merely **shifts** to a worse rank but stays in the top 3 (vs its `PREFERRED_MAX`) is a **WARNING** (suite still passes). It also tracks the **median number of questions to lock a fault into the top 3 and keep it there** (`BASELINE_MEDIAN_LOCKIN`, plus per-fault `BASELINE_LOCKIN`); a shift in convergence speed is a WARNING. Run with `python3 tools/test_diagnose.py`.
- `tools/mcp_server.py` — FastMCP server exposing two tools, `diagnose_irrigation(answers, skipped)` and `irrigation_hydraulics(adjustments, zone, concurrent_zones)`. Registered in `.mcp.json`.
- `tools/hydraulics.py` — hydraulic calculator. Parses `setup.yaml` into a node graph and runs a full solve (DAB Jet pump curve → static lift from per-node elevations → Hazen-Williams friction summed per pipe segment, where each segment carries the combined flow of the heads below it → per-head pressure → per-head flow, iterated because unregulated I-20 flow depends on pressure; MP Rotators on PRS40 bodies are 40 PSI regulated). The report leads with a `health` status card (ok/warning/violation, headline, pump capacity, per-zone lines) synthesised from the detail below it; each per-category check carries gauge data (`value`, `min`, `max`, `kind` of band/fill/ceiling, rounded to 1 dp). Returns per-zone flow, head pressures, per-zone `pressure_spread_pct`, a `node_pressures_bar` profile (pump discharge → manifold → after-valve) and per-head `loss_breakdown_bar`, plus a pressure + flow + velocity weakest-link report (velocity vs a 1.5 m/s limit). Supports what-if `adjustments` (swap a nozzle, change a pump, pin an operating pressure, move the water table) and `concurrent_zones=[2,3]` (shared pump/main carrying the combined flow, per-zone valves and laterals). Embeds the Hunter I-20 Blue / MP Rotator charts and DAB Jet curves. Library or stdin/stdout CLI. Needs `pyyaml`.
- `tools/test_hydraulics.py` — sanity checks for the hydraulic calculator (chart lookups, baseline solve, weakest links, what-if behaviour). Run with `python3 tools/test_hydraulics.py`.

## setup.yaml schema

`setup.yaml` is the single source of truth for the homeowner's equipment, topology, wiring, and design choices. It is a **graph**:

- `types` — a catalog mapping a dotted type (`pump.well`, `hose.32`/`.25`/`.16`, `fitting.manifold`/`.tee`/`.swing`/`.joint`/`.cap`, `valve.auto`/`.manual`, `head.rotor` (I-20) / `head.spray` (PRS40, `regulated_bar`), `nozzle.rotor`/`.rotator`/`.stream`, `controller`, `relay`) to default fields (`model`, `max_bar`, `max_flow_m3h`, `min_bar`/`min_flow_m3h`, `location`, …). `fitting.swing` carries per-downstream ratings under `by_feeds`.
- `feeds` — the topology. Each key is a node id `SCOPE.type.NN` (`MAIN.pump.well.01`, `Z1.head.rotor.01`, `Z1.nozzle.rotor.01`); each value is `{to: [downstream ids], …per-node fields}` (`height_m`, `length_m`, `nozzle`, `arc_deg`). The trunk is `MAIN.source.well → pump → … → fitting.manifold`, which fans out to `Z1…Z5` and a capped `Z6`. Zones are derived from the scope prefix; a solvable zone has ≥1 nozzle leaf (Z1–Z5; Z6 is a capped no-flow stub). Z1–Z4 are automatic (`valve.auto`); Z5 is manual (`valve.manual` → 16 mm line → `nozzle.stream`, modelled as free discharge from an open hose); Z6 is capped.
- `wires`, `cable_runs`, `location_descriptions`, `system_metadata`, `control_paths`, `settings`, `system_design_choices` — metadata read by the skills, not by the hydraulic solve.

When editing `setup.yaml`, keep `tools/hydraulics.py`'s graph parsing in sync and re-run `python3 tools/test_hydraulics.py`.

## Session setup

`.claude/hooks/session-start.sh` (registered via `.claude/settings.json`) runs at the start of every Claude Code on the web session: `pip install -r requirements.txt` for the MCP SDK and `pyyaml`. Synchronous so the session is ready when it opens.

## Gotchas

- Bash working directory persists between calls, so a `cd` (e.g. `cd .claude/skills/irrigation/media`) silently changes cwd for every later tool call. File tools like `SendUserFile` resolve relative paths against that cwd, so relative paths break after a `cd`. Use absolute paths for file tools, or avoid `cd` (`ls .claude/skills/irrigation/media` instead).
- When sharing images/files, always pass the `files` array on the **first** `SendUserFile` call — never emit a bare invocation with no arguments. An empty call fails validation with "required parameter `files` is missing" and just adds noise before the retry.
