#!/usr/bin/env bash
# guard-field-register.sh (LOCKED — Item 15)
# Validates that ALL expected tables exist in the live schema.
# Phase 2 tables: consent_records, suppression_records, report_cards, certificates.
# Phase 1 core: profiles, tenants.
#
# Usage: bash supabase/guard-field-register.sh
# Exit 0 = all tables exist (pass), 1 = any missing (fail)

set -euo pipefail

echo "::group::Field-Register Guard (Item 15 — LOCKED)"

TABLES=(
  profiles
  tenants
  consent_records
  suppression_records
  report_cards
  certificates
)

if [ -n "${DATABASE_URL:-}" ]; then
  for table in "${TABLES[@]}"; do
    oid=$(psql "$DATABASE_URL" -t -A -c "SELECT to_regclass('public.$table');" 2>/dev/null || echo "")
    if [ "$oid" != "" ] && [ "$oid" != "NULL" ]; then
      echo "  OK: public.$table (OID $oid)"
    else
      echo "  FAIL: public.$table does not exist — field register out of sync"
      exit 1
    fi
  done
  echo ""
  echo "All 6 tables present. Field register validated."
else
  echo "  SKIP: DATABASE_URL not set — offline check skipped"
  echo "  WARN: run against a live database to validate field register"
fi

echo "::endgroup::"
