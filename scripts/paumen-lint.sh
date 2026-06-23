#!/usr/bin/env bash
# paumen-lint: enforce the PAUMEN markup contract for the soil UI.
#
# Bans in HTML/JS(X)/TS(X)/CJS/MJS:  <div>, <span>, inline style=, class=
# (Phosphor icon classes "ph-*" are carved out.)
# Bans the same set:                 !important  (catches CSS-in-JS / style strings)
#
# CSS quality is owned by Stylelint (soil/.stylelintrc.json), not this script.
#
# Default targets: git-tracked markup files under soil/ (the UI's home). The
# docs/mockups prototype and the sim/ + tools/ engine code are intentionally
# out of scope. Override by passing paths:
#   scripts/paumen-lint.sh                 # all soil/ markup
#   scripts/paumen-lint.sh soil/ui.html    # specific files
#
# Contained exceptions (e.g. an SVG/viz layer that needs inline transforms):
#   <!-- paumen-lint-disable -->  ...  <!-- paumen-lint-enable -->   (block)
#   // paumen-lint-disable-next-line                                 (one line)
set -euo pipefail

exts=('*.html' '*.htm' '*.js' '*.jsx' '*.cjs' '*.mjs' '*.ts' '*.tsx')

if [ $# -gt 0 ]; then
  mapfile -t targets < <(printf '%s\n' "$@")
else
  mapfile -t targets < <(git ls-files -- "${exts[@]/#/soil/}")
fi

files=()
for f in "${targets[@]}"; do
  [ -f "$f" ] || continue
  case "$f" in
    *.html | *.htm | *.js | *.jsx | *.cjs | *.mjs | *.ts | *.tsx) files+=("$f") ;;
  esac
done

# Build the set of exempt "file:line" keys from the disable markers above.
exempt=""
if [ ${#files[@]} -gt 0 ]; then
  exempt=$(awk '
    FNR==1 { off=0 }
    /paumen-lint-disable-next-line/ { print FILENAME":"(FNR+1); next }
    /paumen-lint-enable/            { off=0; next }
    /paumen-lint-disable/           { off=1; next }
    off                             { print FILENAME":"FNR }
  ' "${files[@]}")
fi

violations=0

# Drop hits whose "file:line" falls in an exempt region.
filter() {
  local hits="$1"
  [ -z "$hits" ] && return 0
  if [ -z "$exempt" ]; then
    printf '%s\n' "$hits"
    return 0
  fi
  printf '%s\n' "$hits" |
    awk -F: 'NR==FNR{ex[$0]=1;next}{k=$1":"$2; if(!(k in ex)) print}' <(printf '%s\n' "$exempt") -
}

scan() {
  local pattern="$1"
  shift
  [ $# -eq 0 ] && return 0
  grep -nHE "$pattern" "$@" 2>/dev/null || true
}

# class= scan with Phosphor carve-out: drops lines whose only class= value
# is one or more space-separated ph-* tokens (e.g. class="ph-bold ph-gear").
scan_class() {
  [ $# -eq 0 ] && return 0
  local raw
  raw=$(grep -nHE '[[:space:]]class[[:space:]]*=' "$@" 2>/dev/null || true)
  [ -z "$raw" ] && return 0
  printf '%s\n' "$raw" |
    grep -vE 'class[[:space:]]*=[[:space:]]*"ph-[a-z0-9-]+([[:space:]]+ph-[a-z0-9-]+)*"' || true
}

report() {
  local label="$1" hits
  hits=$(filter "$2")
  [ -z "$hits" ] && return 0
  printf '\n[FAIL] %s\n' "$label"
  printf '%s\n' "$hits" | awk '{print "    " $0}'
  violations=$((violations + $(printf '%s\n' "$hits" | wc -l)))
}

if [ ${#files[@]} -gt 0 ]; then
  report '<div> forbidden' "$(scan '<\/?div\b' "${files[@]}")"
  report '<span> forbidden' "$(scan '<\/?span\b' "${files[@]}")"
  report 'inline style= forbidden' "$(scan '[[:space:]]style[[:space:]]*=' "${files[@]}")"
  report 'class= forbidden (non-Phosphor)' "$(scan_class "${files[@]}")"
  report '!important forbidden' "$(scan '!important' "${files[@]}")"
fi

if [ "$violations" -gt 0 ]; then
  printf '\npaumen-lint: %d violation(s)\n' "$violations" >&2
  exit 1
fi

printf 'paumen-lint: clean (%d files scanned)\n' "${#files[@]}"
