#!/usr/bin/env bash
# Exceptions:
#   <!-- paumen-lint-disable -->  ...  <!-- paumen-lint-enable -->   (block)
#   // paumen-lint-disable-next-line                                 (one line)
set -euo pipefail

if [ $# -gt 0 ]; then
  mapfile -t targets < <(printf '%s\n' "$@")
else
  # A `soil/*.ext` pathspec would miss nested dirs; filter extensions below.
  mapfile -t targets < <(git ls-files -- soil/)
fi

files=()
for f in "${targets[@]}"; do
  [ -f "$f" ] || continue
  case "$f" in
    *.html | *.htm | *.js | *.jsx | *.cjs | *.mjs | *.ts | *.tsx) files+=("$f") ;;
  esac
done

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

# Strip ph-* per-attribute, not per-line, so a ph-* can't shield a forbidden class.
scan_class() {
  [ $# -eq 0 ] && return 0
  local raw
  raw=$(grep -nHE '[[:space:]]class(Name)?[[:space:]]*=' "$@" 2>/dev/null || true)
  [ -z "$raw" ] && return 0
  printf '%s\n' "$raw" | awk '
    match($0, /^[^:]+:[0-9]+:/) {
      content = substr($0, RLENGTH + 1)
      gsub(/class(Name)?[ \t]*=[ \t]*"ph-[a-z0-9-]+([ \t]+ph-[a-z0-9-]+)*"/, "", content)
      gsub(/class(Name)?[ \t]*=[ \t]*'\''ph-[a-z0-9-]+([ \t]+ph-[a-z0-9-]+)*'\''/, "", content)
      if (content ~ /class(Name)?[ \t]*=/) print $0
    }
  '
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
  report 'inline style= forbidden' "$(scan '[[:space:]]style[[:space:]]*=' "${files[@]}" | grep -vE '\b(const|let|var|export|import)\b' || true)"
  report 'class=/className= forbidden (non-Phosphor)' "$(scan_class "${files[@]}")"
  report '!important forbidden' "$(scan '!important' "${files[@]}")"
fi

if [ "$violations" -gt 0 ]; then
  printf '\npaumen-lint: %d violation(s)\n' "$violations" >&2
  exit 1
fi

printf 'paumen-lint: clean (%d files scanned)\n' "${#files[@]}"
