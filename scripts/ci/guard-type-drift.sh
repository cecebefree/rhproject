#!/bin/bash
# guard-type-drift.sh — verify packages/shared/src/database.types.ts matches the
# schema generated from the live database.
#
# Canonical recipe (local AND CI): regenerate types from DATABASE_URL, public schema only.
#   supabase gen types typescript --db-url "$DATABASE_URL" --schema public
# --local is RETIRED: CI runs bare postgres + migrations, so public schema is fully
# determined by migrations and local/CI output converge.
#
# CLI version MUST be pinned (supabase 2.108.0) — type-format differs across CLI versions.
# Reactivated by operator ruling (quarantine "Do not re-enable without a ruling" lifted).
#
# Exit codes / messages (fail LOUD, no swallowing):
#   0  PASS: types in sync
#   1  FAIL: type generation failed   (CLI error / cannot connect to DATABASE_URL)
#   1  FAIL: empty type output         (CLI ran but produced no types)
#   1  FAIL: types drifted             (generated != committed snapshot)
set -uo pipefail

F=packages/shared/src/database.types.ts

if [ -z "${DATABASE_URL:-}" ]; then
  echo "FAIL: type generation failed — DATABASE_URL is not set"
  exit 1
fi

T=$(mktemp)
# Capture stderr separately so a connection/gen error is reported, not hidden.
if ! supabase gen types typescript --db-url "$DATABASE_URL" --schema public > "$T" 2>/tmp/guard-type-drift.err; then
  echo "FAIL: type generation failed — supabase gen types exited non-zero"
  echo "--- supabase stderr ---"
  cat /tmp/guard-type-drift.err || true
  rm -f "$T"
  exit 1
fi

if [ ! -s "$T" ]; then
  echo "FAIL: empty type output — supabase gen types produced no types"
  rm -f "$T"
  exit 1
fi

if ! diff "$F" "$T" >/dev/null; then
  echo "FAIL: types drifted — regenerate with: supabase gen types typescript --db-url \"\$DATABASE_URL\" --schema public"
  diff "$F" "$T" || true
  rm -f "$T"
  exit 1
fi

rm -f "$T"
echo "PASS: types in sync"
