#!/bin/bash
# PostToolUse hook: when a .html file is written/edited, render a screenshot
# via Playwright Chromium and ask the assistant to surface it with SendUserFile.
# Reads the hook JSON on stdin; emits hookSpecificOutput.additionalContext on success.
set -uo pipefail

input=$(cat)
f=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_response.filePath // empty')

case "$f" in
  *.html) ;;
  *) exit 0 ;;        # not HTML — nothing to do
esac
[ -f "$f" ] || exit 0

png=$(NODE_PATH=/opt/node22/lib/node_modules node "$(dirname "$0")/html-shot.cjs" "$f" 2>/dev/null) || exit 0
[ -n "$png" ] || exit 0

printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"An HTML screenshot of %s was rendered at %s. Display it to the user now by calling SendUserFile with that exact path (status: normal)."}}' "$f" "$png"
