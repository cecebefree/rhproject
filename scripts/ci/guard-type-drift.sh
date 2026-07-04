#!/bin/bash
set -uo pipefail
F=packages/shared/src/database.types.ts
T=$(mktemp)
supabase gen types typescript --local 2>/dev/null > "$T"
[ ! -s "$T" ] && echo "FAIL: empty" && rm -f "$T" && exit 1
if ! diff "$F" "$T" >/dev/null 2>&1; then
  echo "FAIL: types drifted"
  diff "$F" "$T" 2>/dev/null || true
  rm -f "$T"
  exit 1
fi
rm -f "$T"
echo "PASS: types in sync"
