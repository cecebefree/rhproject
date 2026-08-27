#!/bin/bash
# Fix test JWT claims: move tenant_id from app_metadata to top level
# Pattern: "app_metadata":{"role":"X","tenant_id":"Y"}
# Becomes:  "tenant_id":"Y","app_metadata":{"role":"X","tenant_id":"Y"}

TEST_DIR="supabase/tests"

for f in "$TEST_DIR"/*.sql; do
  if grep -q '"app_metadata":{.*"tenant_id":' "$f" 2>/dev/null; then
    # Extract tenant_id UUIDs from app_metadata blocks
    # Add "tenant_id":"<uuid>"," before "app_metadata":
    # Useperl for reliable regex with backreferences
    perl -i -pe 's/("sub":"[^"]*","role":"[^"]*",)"app_metadata":\{"role":"([^"]*)","tenant_id":"([^"]*)"\}/$1"tenant_id":"$3","app_metadata":{"role":"$2","tenant_id":"$3"}/g' "$f"
    echo "Fixed: $f"
  fi
done
