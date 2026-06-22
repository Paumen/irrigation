#!/bin/bash
# PreToolUse hook (Read): when about to read an HTML *page*, render its current
# state to a PNG and point the assistant at it, so the current UI is visible
# while planning an edit (e.g. judging "how much wider" a box can go).
#
# mtime-cached: re-renders only when the file changed since the last shot, so
# repeated reads of an unchanged page don't re-launch the (slow) browser or
# re-surface the same image. Reads the hook JSON on stdin; emits
# hookSpecificOutput.additionalContext on a fresh render.
set -uo pipefail

input=$(cat)
f=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

case "$f" in
  *.html|*.htm) ;;
  *) exit 0 ;;          # not HTML — nothing to do
esac
[ -f "$f" ] || exit 0

# Full pages only — skip fragments/partials to cut noise.
grep -qiE '<html|<body' "$f" || exit 0

# mtime cache: skip the render if the file is unchanged since the last shot.
cache_dir=/tmp/claude-html-shots/cache
mkdir -p "$cache_dir"
key=$(printf '%s' "$f" | sha1sum | cut -d' ' -f1)
meta="$cache_dir/$key"
mtime=$(stat -c %Y "$f" 2>/dev/null || echo 0)

if [ -f "$meta" ]; then
  read -r cached_mtime cached_png < "$meta" || true
  if [ "${cached_mtime:-}" = "$mtime" ] && [ -n "${cached_png:-}" ] && [ -f "$cached_png" ]; then
    exit 0             # unchanged since last shot — already seen it, stay quiet
  fi
fi

png=$(NODE_PATH=/opt/node22/lib/node_modules node "$(dirname "$0")/html-shot.cjs" "$f" 2>/dev/null) || exit 0
[ -n "$png" ] || exit 0

printf '%s %s\n' "$mtime" "$png" > "$meta"

# Build JSON with jq so paths with quotes/backslashes can't break it.
jq -n --arg png "$png" --arg f "$f" '{hookSpecificOutput: {hookEventName: "PreToolUse", additionalContext: "A screenshot of the current render of \($f) was saved at \($png). Read that PNG now (Read displays it visually) to see the current UI before deciding your edit."}}'
