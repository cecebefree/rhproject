#!/bin/bash
# v2 TODO: ternary/variable-constructed require(sdk) not statically decidable (Security Lead noted)
set -uo pipefail
PATTERNS='openai|@ai-sdk|langchain|anthropic|@anthropic-ai|ai/|@langchain'
violations=0

check_file() {
  local f="$1"
  for q in "'" '"' '\`'; do
    grep -HnE "(from[[:space:]]+|require\(|import\()${q}(${PATTERNS})" "$f" 2>/dev/null && violations=1 || true
  done
}

for d in apps packages; do
  [ ! -d "$d" ] && continue
  while read -r f; do
    check_file "$f"
  done < <(find "$d" -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" 2>/dev/null || true)
done

[ "$violations" -eq 0 ] && echo "PASS: No unauthorized AI imports." && exit 0
exit 1
