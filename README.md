# irrigation

An agent-facing diagnostic toolkit for a homeowner's irrigation system, delivered as a single Claude skill backed by MCP tools (no web app).

- **Troubleshooting** — the `irrigation` skill's `troubleshoot` playbook drives a question-and-answer loop over a scoring engine (`diagnose_irrigation` MCP tool) that re-ranks the most likely root causes each round.
- **Hydraulics & general help** — the same skill explains parts, identifies models, and plans capacity/upgrades, backed by a full hydraulic solve (`irrigation_hydraulics` MCP tool).

Everything is Python. The MCP server is `tools/mcp_server.py` (registered in `.mcp.json`); each tool also runs as a CLI:

```sh
pip install -r requirements.txt
python3 tools/diagnose.py             # questionnaire scoring (reads data.json)
echo '{}' | python3 tools/hydraulics.py   # hydraulic solve (reads setup.yaml)
python3 tools/test_hydraulics.py      # hydraulics tests
```

See `CLAUDE.md` for architecture and `docs/` for the specs.
