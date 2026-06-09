# CLAUDE.md

## Project

An agent-facing diagnostic toolkit for one homeowner's irrigation/rotor system. One **Claude skill backed by MCP tools** (there is no web app), covering two capabilities:

- **Troubleshooting** — a scoring engine walks a question-and-answer loop and continually re-ranks the most likely root failure modes. Driven by the `playbooks/troubleshoot.md` playbook via the `diagnose_irrigation` MCP tool.
- **Hydraulics & general assistance** — how-it-works / identify / upgrade / maintenance playbooks.

## Session setup

`.claude/hooks/session-start.sh` (registered via `.claude/settings.json`) runs at the start of every Claude Code on the web session: `pip install -r requirements.txt` for the MCP SDK and `pyyaml`. Synchronous so the session is ready when it opens.

## Gotchas

- Bash working directory persists between calls, so a `cd` (e.g. `cd .claude/skills/irrigation/media`) silently changes cwd for every later tool call. File tools like `SendUserFile` resolve relative paths against that cwd, so relative paths break after a `cd`. Use absolute paths for file tools, or avoid `cd` (`ls .claude/skills/irrigation/media` instead).
- When sharing images/files, always pass the `files` array on the **first** `SendUserFile` call — never emit a bare invocation with no arguments. An empty call fails validation with "required parameter `files` is missing" and just adds noise before the retry.
