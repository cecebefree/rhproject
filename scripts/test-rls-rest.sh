#!/bin/bash
# scripts/test-rls-rest.sh — RLS isolation tests via REST API
# Tests that each role can only access data permitted by RLS policies.
# Prerequisites: bash scripts/day2-setup.sh first
set -eo pipefail

SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
ANON_KEY="${SUPABASE_ANON_KEY:-}"
TOKENS_DIR="scripts/.day2-tokens"
PASS=0
FAIL=0
RESULTS=()

echo "=== Day 2: RLS Isolation Tests ==="
echo "URL: $SUPABASE_URL"
echo ""

# ── Helpers ────────────────────────────────────────────────────────────

get_token() {
  local role="$1"
  local f="$TOKENS_DIR/$role.token"
  if [ -f "$f" ]; then
    cat "$f"
  else
    echo ""
  fi
}

# Make authenticated GET request, return HTTP status
api_get() {
  local token="$1" table="$2" filter="${3:-}"
  local url="$SUPABASE_URL/rest/v1/$table?select=*"
  if [ -n "$filter" ]; then
    url="$url&$filter"
  fi
  local resp
  resp=$(curl -s -w "\n%{http_code}" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    "$url" 2>/dev/null)
  local http
  http=$(echo "$resp" | tail -1)
  local body
  body=$(echo "$resp" | sed '$d')
  echo "$http|$body"
}

# Make authenticated POST request, return HTTP status
api_post() {
  local token="$1" table="$2" data="$3"
  local resp
  resp=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "$data" \
    "$SUPABASE_URL/rest/v1/$table" 2>/dev/null)
  local http
  http=$(echo "$resp" | tail -1)
  local body
  body=$(echo "$resp" | sed '$d')
  echo "$http|$body"
}

# Make authenticated PUT request, return HTTP status
api_put() {
  local token="$1" table="$2" filter="$3" data="$4"
  local resp
  resp=$(curl -s -w "\n%{http_code}" \
    -X PATCH \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "$data" \
    "$SUPABASE_URL/rest/v1/$table?$filter" 2>/dev/null)
  local http
  http=$(echo "$resp" | tail -1)
  local body
  body=$(echo "$resp" | sed '$d')
  echo "$http|$body"
}

# Unauthenticated GET (no Bearer token, just API key)
api_get_noauth() {
  local table="$1"
  local resp
  resp=$(curl -s -w "\n%{http_code}" \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    "$SUPABASE_URL/rest/v1/$table?select=*" 2>/dev/null)
  local http
  http=$(echo "$resp" | tail -1)
  echo "$http"
}

assert_pass() {
  local test_name="$1"
  PASS=$((PASS + 1))
  RESULTS+=("PASS: $test_name")
  echo "  ✓ PASS: $test_name"
}

assert_fail() {
  local test_name="$1" detail="$2"
  FAIL=$((FAIL + 1))
  RESULTS+=("FAIL: $test_name — $detail")
  echo "  ✗ FAIL: $test_name — $detail"
}

assert_http() {
  local test_name="$1" actual="$2" expected="$3"
  if [ "$actual" = "$expected" ]; then
    assert_pass "$test_name"
  else
    assert_fail "$test_name" "expected HTTP $expected, got $actual"
  fi
}

assert_row_count() {
  local test_name="$1" body="$2" expected="$3"
  local count
  count=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
  if [ "$count" = "$expected" ]; then
    assert_pass "$test_name (rows=$count)"
  else
    assert_fail "$test_name" "expected $expected rows, got $count"
  fi
}

# ── Load tokens ────────────────────────────────────────────────────────
ADMIN_TOKEN=$(get_token "admin")
STUDENT_TOKEN=$(get_token "student")
FAMILY_TOKEN=$(get_token "family")
TEACHER_TOKEN=$(get_token "teacher")

if [ -z "$ADMIN_TOKEN" ] || [ -z "$STUDENT_TOKEN" ] || [ -z "$FAMILY_TOKEN" ]; then
  echo "ERROR: Missing tokens. Run day2-setup.sh first."
  exit 1
fi

echo "Tokens loaded: admin=${#ADMIN_TOKEN}ch student=${#STUDENT_TOKEN}ch family=${#FAMILY_TOKEN}ch teacher=${#TEACHER_TOKEN}ch"
echo ""

# ══════════════════════════════════════════════════════════════════════
# TEST GROUP 1: ADMIN ACCESS
# ══════════════════════════════════════════════════════════════════════
echo "--- Test Group 1: Admin Access (office_desk_admin) ---"

result=$(api_get "$ADMIN_TOKEN" "students")
http="${result%%|*}"; body="${result#*|}"
assert_http "Admin can read students" "$http" "200"

result=$(api_get "$ADMIN_TOKEN" "parents")
http="${result%%|*}"; body="${result#*|}"
assert_http "Admin can read parents" "$http" "200"

result=$(api_get "$ADMIN_TOKEN" "payments")
http="${result%%|*}"; body="${result#*|}"
assert_http "Admin can read payments" "$http" "200"

result=$(api_get "$ADMIN_TOKEN" "invoices")
http="${result%%|*}"; body="${result#*|}"
assert_http "Admin can read invoices" "$http" "200"

result=$(api_get "$ADMIN_TOKEN" "audit_log")
http="${result%%|*}"; body="${result#*|}"
assert_http "Admin can read audit_log" "$http" "200"

# Get a valid student_id for the insert test
VALID_STUDENT_ID=$(curl -s "$SUPABASE_URL/rest/v1/students?select=id&limit=1" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])" 2>/dev/null)

# Admin INSERT
result=$(api_post "$ADMIN_TOKEN" "invoices" "{\"student_id\":\"$VALID_STUDENT_ID\",\"invoice_number\":\"INV-TEST-$(date +%s%N)\",\"amount\":100,\"status\":\"unpaid\",\"due_date\":\"2025-12-31\"}")
http="${result%%|*}"
assert_http "Admin can insert invoices" "$http" "201"

echo ""

# ══════════════════════════════════════════════════════════════════════
# TEST GROUP 2: STUDENT ACCESS
# ══════════════════════════════════════════════════════════════════════
echo "--- Test Group 2: Student Access ---"

result=$(api_get "$STUDENT_TOKEN" "students")
http="${result%%|*}"; body="${result#*|}"
assert_http "Student can read students" "$http" "200"
# Should only see own record
assert_row_count "Student sees only own student record" "$body" "1"

result=$(api_get "$STUDENT_TOKEN" "payments")
http="${result%%|*}"; body="${result#*|}"
assert_http "Student can read payments" "$http" "200"

result=$(api_get "$STUDENT_TOKEN" "invoices")
http="${result%%|*}"; body="${result#*|}"
assert_http "Student can read invoices" "$http" "200"

# Student should NOT be able to insert invoices
result=$(api_post "$STUDENT_TOKEN" "invoices" "{\"student_id\":\"$VALID_STUDENT_ID\",\"invoice_number\":\"INV-STU-$(date +%s%N)\",\"amount\":100,\"status\":\"unpaid\",\"due_date\":\"2025-12-31\"}")
http="${result%%|*}"
assert_http "Student CANNOT insert invoices (403)" "$http" "403"

echo ""

# ══════════════════════════════════════════════════════════════════════
# TEST GROUP 3: FAMILY/PARENT ACCESS
# ══════════════════════════════════════════════════════════════════════
echo "--- Test Group 3: Family/Parent Access ---"

result=$(api_get "$FAMILY_TOKEN" "parents")
http="${result%%|*}"; body="${result#*|}"
assert_http "Family can read parents" "$http" "200"
assert_row_count "Family sees own parent record" "$body" "1"

result=$(api_get "$FAMILY_TOKEN" "students")
http="${result%%|*}"; body="${result#*|}"
assert_http "Family can read students (children)" "$http" "200"

result=$(api_get "$FAMILY_TOKEN" "invoices")
http="${result%%|*}"; body="${result#*|}"
assert_http "Family can read invoices" "$http" "200"

result=$(api_get "$FAMILY_TOKEN" "payments")
http="${result%%|*}"; body="${result#*|}"
assert_http "Family can read payments" "$http" "200"

# Family should NOT see audit_log (RLS returns 0 rows, not 403)
result=$(api_get "$FAMILY_TOKEN" "audit_log")
http="${result%%|*}"; body="${result#*|}"
assert_row_count "Family sees 0 rows from audit_log (no policy)" "$body" "0"

echo ""

# ══════════════════════════════════════════════════════════════════════
# TEST GROUP 4: TEACHER ACCESS
# ══════════════════════════════════════════════════════════════════════
echo "--- Test Group 4: Teacher Access ---"

result=$(api_get "$TEACHER_TOKEN" "students")
http="${result%%|*}"
# Teachers may or may not have read access depending on policy
echo "  Teacher read students: HTTP $http"

result=$(api_get "$TEACHER_TOKEN" "invoices")
http="${result%%|*}"
echo "  Teacher read invoices: HTTP $http"

echo ""

# ══════════════════════════════════════════════════════════════════════
# TEST GROUP 5: UNAUTHENTICATED ACCESS
# ══════════════════════════════════════════════════════════════════════
echo "--- Test Group 5: Unauthenticated Access ---"

http=$(api_get_noauth "students")
assert_http "Unauth read students blocked" "$http" "401"

http=$(api_get_noauth "parents")
assert_http "Unauth read parents blocked" "$http" "401"

http=$(api_get_noauth "payments")
assert_http "Unauth read payments blocked" "$http" "401"

http=$(api_get_noauth "invoices")
assert_http "Unauth read invoices blocked" "$http" "401"

http=$(api_get_noauth "audit_log")
assert_http "Unauth read audit_log blocked" "$http" "401"

echo ""

# ══════════════════════════════════════════════════════════════════════
# TEST GROUP 6: CROSS-ROLE ISOLATION
# ══════════════════════════════════════════════════════════════════════
echo "--- Test Group 6: Cross-Role Isolation ---"

# Student should NOT see parents data (no policy = 0 rows via RLS)
result=$(api_get "$STUDENT_TOKEN" "parents")
http="${result%%|*}"; body="${result#*|}"
assert_row_count "Student sees 0 rows from parents (no policy)" "$body" "0"

# Student should NOT be able to update other students (RLS filters to 0 rows)
result=$(api_put "$STUDENT_TOKEN" "students" "first_name=eq.Other" '{"first_name":"Hacked"}')
http="${result%%|*}"; body="${result#*|}"
# PostgREST returns 200 with empty array when RLS filters out all rows
assert_row_count "Student update affects 0 rows (RLS blocks other students)" "$body" "0"

echo ""

# ══════════════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════════════
echo "═══════════════════════════════════════════════════════════════════"
echo "RESULTS: $PASS passed, $FAIL failed, $((PASS + FAIL)) total"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "FAILED TESTS:"
  for r in "${RESULTS[@]}"; do
    if [[ "$r" == FAIL* ]]; then
      echo "  $r"
    fi
  done
  echo ""
  echo "STATUS: BLOCKED — RLS isolation failures detected"
  exit 1
else
  echo "STATUS: ALL TESTS PASSED"
  exit 0
fi
