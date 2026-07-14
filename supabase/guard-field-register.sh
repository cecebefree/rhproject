#!/usr/bin/env bash
# guard-field-register.sh - Schema Guard (Item 13)
# Parses docs/field-register.md as single source of truth.
# Validates BACKED tables/columns against information_schema.
# PLANNED/COMPUTED entries are skipped.
#
# Exit 0 = all BACKED entries valid (pass)
# Exit 1 = any violation
#
# Usage: bash supabase/guard-field-register.sh

set -euo pipefail

REGISTER="docs/field-register.md"
VIOLATIONS=0
TABLES_CHECKED=0
COLUMNS_VERIFIED=0

echo "::group::Field-Register Guard (Item 13 - FINAL)"

if [ ! -f "$REGISTER" ]; then
  echo "  FAIL: $REGISTER not found"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "  SKIP: DATABASE_URL not set - offline check skipped"
  echo "  WARN: run against a live database to validate field register"
  echo "::endgroup::"
  exit 0
fi

# Phase 1: Parse field-register.md
TABLE_LIST=""
current_table=""
current_cols=""

save_table() {
  if [ -n "$current_table" ]; then
    TABLE_LIST="${TABLE_LIST}|${current_table}"
    eval "COLS_${current_table}=\"${current_cols}\""
  fi
}

while IFS= read -r line; do
  if echo "$line" | grep -qE "^## Live Schema"; then
    in_schema=1
    continue
  fi
  if [ "${in_schema:-0}" -eq 1 ] && echo "$line" | grep -qE "^## " && ! echo "$line" | grep -qE "^## Table: "; then
    save_table
    break
  fi
  if [ "${in_schema:-0}" -eq 1 ] && echo "$line" | grep -qE "^## Table: "; then
    save_table
    current_table=$(echo "$line" | sed "s/^## Table: //; s/ .*//")
    current_cols=""
    continue
  fi
  if [ "${in_schema:-0}" -eq 1 ] && [ "$current_table" != "" ]; then
    echo "$line" | grep -qE "^---" && continue
    echo "$line" | grep -qE "^RLS:" && continue
    col_name=$(echo "$line" | awk '{print $1}')
    col_type=$(echo "$line" | awk '{print $2}')
    echo "$col_type" | grep -qE '^(uuid|text|boolean|int|timestamptz|numeric|jsonb|json|integer|bigint|smallint|real|double|char|varchar)' || continue
    [ -z "$col_name" ] && continue
    echo "$col_name" | grep -qE '^(RLS|##)' && continue
    current_cols="$current_cols $col_name"
  fi
done < "$REGISTER"

# Phase 2: Validate each table
OLD_IFS="$IFS"
IFS="|"
for table in $TABLE_LIST; do
  IFS="$OLD_IFS"
  [ -z "$table" ] && continue
  cols_str=$(eval "echo \${COLS_${table}}")
  [ -z "$cols_str" ] && continue
  TABLES_CHECKED=$((TABLES_CHECKED + 1))
  echo ""
  echo "  TABLE: public.$table"
  oid=$(psql "$DATABASE_URL" -t -A -c "SELECT to_regclass('public.${table}');" 2>/dev/null || echo "")
  if [ -z "$oid" ] || [ "$oid" = "NULL" ]; then
    echo "    FAIL: public.$table does not exist - field register out of sync"
    VIOLATIONS=$((VIOLATIONS + 1))
    continue
  fi
  echo "    OK: public.$table (OID $oid)"
  live_cols=$(psql "$DATABASE_URL" -t -A -c "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}' ORDER BY ordinal_position;" 2>/dev/null)
  for col in $cols_str; do
    [ -z "$col" ] && continue
    if echo "$live_cols" | grep -qx "$col"; then
      COLUMNS_VERIFIED=$((COLUMNS_VERIFIED + 1))
    else
      echo "    FAIL: public.$table.$col - column missing from live schema"
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  done
  for live_col in $live_cols; do
    found=0
    for expected in $cols_str; do
      if [ "$live_col" = "$expected" ]; then
        found=1
        break
      fi
    done
    if [ "$found" -eq 0 ]; then
      echo "    WARN: public.$table.$live_col - unregistered extra column in live schema"
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  done
  IFS="|"
done
IFS="$OLD_IFS"

echo ""
echo "  SUMMARY: $TABLES_CHECKED tables checked, $COLUMNS_VERIFIED columns verified"

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "  FAIL: $VIOLATIONS violation(s) found"
  echo "::endgroup::"
  exit 1
fi

echo "  PASS: field register matches live schema"
echo "::endgroup::"
exit 0

