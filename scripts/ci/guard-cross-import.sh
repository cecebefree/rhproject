#!/bin/bash
set -uo pipefail
violations=0

check_file() {
  local f="$1"
  for q in "'" '"' '\`'; do
    r=$(grep -HnE "(from[[:space:]]+|require\(|import\()${q}(\.\.\/)+apps/" "$f" 2>/dev/null || true)
    [ -n "$r" ] && echo "FAIL: cross-app relative import: $r" && violations=1
    p=$(grep -HnE "(from[[:space:]]+|require\(|import\()${q}@redhouse/(web|lms)" "$f" 2>/dev/null || true)
    [ -n "$p" ] && echo "FAIL: cross-app package import: $p" && violations=1
  done
}

for d in apps packages; do
  [ ! -d "$d" ] && continue
  while read -r f; do
    check_file "$f"
  done < <(find "$d" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -not -path "*/node_modules/*" -not -path "*/.turbo/*" 2>/dev/null || true)
done

[ "$violations" -eq 0 ] && echo "PASS: No cross-app imports." && exit 0
exit 1
