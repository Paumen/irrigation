#!/bin/bash
# PostToolUse hook: when a Python file under tools/ is written/edited, auto-format
# and lint-fix it with ruff. Reads the hook JSON on stdin; emits
# hookSpecificOutput.additionalContext so the assistant knows the file on disk
# may have changed (re-read before the next edit to avoid a stale-content edit).
set -uo pipefail

input=$(cat)
f=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_response.filePath // empty')

# Only act on tracked Python sources under tools/.
case "$f" in
  *tools/*.py) ;;
  *) exit 0 ;;
esac
[ -f "$f" ] || exit 0

command -v ruff >/dev/null 2>&1 || exit 0   # ruff not installed — skip silently

before=$(cat "$f")
ruff format -q "$f" >/dev/null 2>&1 || true
ruff check -q --fix "$f" >/dev/null 2>&1 || true
after=$(cat "$f")

# Nothing changed — stay quiet.
[ "$before" = "$after" ] && exit 0

printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"ruff reformatted/lint-fixed %s on disk. Re-read it before your next edit so your edit matches the current contents."}}' "$f"
