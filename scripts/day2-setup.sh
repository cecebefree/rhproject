#!/bin/bash
# scripts/day2-setup.sh — Create test users + seed data for RLS testing
# Usage: bash scripts/day2-setup.sh
set -eo pipefail

SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY}"
PASSWORD="${SEED_PASSWORD:-TestPass123!}"
AUTH="$SUPABASE_URL/auth/v1"
HEADERS=(-H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json")

DB_CONTAINER="supabase_db_rhproject-new"
db_query() {
  docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -A -c "$1"
}

echo "=== Day 2: RLS Test Setup ==="
echo "URL: $SUPABASE_URL"
echo ""

# ── 1. CREATE TEST USERS ──────────────────────────────────────────────
echo "--- Creating test users ---"

create_user() {
  local email="$1" password="$2" role="$3" extra_meta="$4" name="$5"
  local existing
  existing=$(curl -s "${HEADERS[@]}" "$AUTH/admin/users" | grep -o "\"email\":\"$email\"" || true)
  if [ -n "$existing" ]; then
    echo "  SKIP: $email (exists)" >&2
    local uid
    uid=$(curl -s "${HEADERS[@]}" "$AUTH/admin/users" | python3 -c "import sys,json; users=json.load(sys.stdin)['users']; print(next((u['id'] for u in users if u['email']=='$email'),''))" 2>/dev/null || true)
    echo "$uid"
    return 0
  fi
  local payload="{\"email\":\"$email\",\"password\":\"$password\",\"email_confirm\":true,\"app_metadata\":{\"role\":\"$role\"},\"user_metadata\":{\"name\":\"$name\"}"
  if [ -n "$extra_meta" ]; then
    payload="$payload,$extra_meta"
  fi
  payload="$payload}"
  
  local resp http
  resp=$(curl -s -w "\n%{http_code}" -X POST "${HEADERS[@]}" -d "$payload" "$AUTH/admin/users")
  http=$(echo "$resp" | tail -1)
  local body
  body=$(echo "$resp" | head -1)
  if [ "$http" = "201" ] || [ "$http" = "200" ]; then
    local uid
    uid=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")
    echo "  CREATED: $email (role=$role, id=$uid)" >&2
    echo "$uid"
  else
    echo "  ERROR $http: $email" >&2
    echo "$body" | head -1 >&2
    echo ""
  fi
}

# Create 4 test users
ADMIN_ID=$(create_user "day2-admin@test.local" "$PASSWORD" "admin" "" "Day2 Admin")
STUDENT_ID=$(create_user "day2-student@test.local" "$PASSWORD" "student" "" "Day2 Student")
FAMILY_ID=$(create_user "day2-family@test.local" "$PASSWORD" "family" "" "Day2 Family")
TEACHER_ID=$(create_user "day2-teacher@test.local" "$PASSWORD" "teacher" "" "Day2 Teacher")

echo ""
echo "User IDs:"
echo "  Admin:   $ADMIN_ID"
echo "  Student: $STUDENT_ID"
echo "  Family:  $FAMILY_ID"
echo "  Teacher: $TEACHER_ID"
echo ""

# ── 2. SEED TEST DATA ─────────────────────────────────────────────────
echo "--- Seeding test data ---"

# Create academic group (required for students)
AG_ID=$(db_query "SELECT id FROM supabase.organizations LIMIT 1;")
if [ -z "$AG_ID" ]; then
  AG_ID=$(db_query "INSERT INTO supabase.organizations (name, slug) VALUES ('Test School', 'test-school') RETURNING id;")
  echo "  Created academic group: $AG_ID"
else
  echo "  Using existing academic group: $AG_ID"
fi

# Create test students (linked to auth users)
STUDENT_UUID_A=$(db_query "INSERT INTO public.students (id, first_name, last_name, grade, academic_group_id, enrollment_status, created_by) VALUES ('$STUDENT_ID', 'Test', 'Student', 'Year 9', '$AG_ID', 'active', '$ADMIN_ID') ON CONFLICT (id) DO UPDATE SET enrollment_status='active' RETURNING id;")

# Create a second student NOT linked to the test family (for isolation testing)
STUDENT_UUID_B=$(db_query "INSERT INTO public.students (first_name, last_name, grade, academic_group_id, enrollment_status, created_by) VALUES ('Other', 'Student', 'Year 7', '$AG_ID', 'active', '$ADMIN_ID') RETURNING id;")
echo "  Created students: $STUDENT_UUID_A (linked), $STUDENT_UUID_B (unlinked)"

# Create parent records linked to students
PARENT_UUID_A=$(db_query "INSERT INTO public.parents (id, student_id, email, first_name, last_name, phone, primary_contact, created_by) VALUES ('$FAMILY_ID', '$STUDENT_UUID_A', 'day2-family@test.local', 'Day2', 'Family', '+1234567890', true, '$ADMIN_ID') ON CONFLICT (id) DO UPDATE SET primary_contact=true RETURNING id;")
echo "  Created parent: $PARENT_UUID_A"

# Create payments
PAYMENT_UUID_A=$(db_query "INSERT INTO public.payments (student_id, amount, status, payment_type, created_by) VALUES ('$STUDENT_UUID_A', 1500.00, 'completed', 'tuition', '$ADMIN_ID') RETURNING id;")
PAYMENT_UUID_B=$(db_query "INSERT INTO public.payments (student_id, amount, status, payment_type, created_by) VALUES ('$STUDENT_UUID_B', 2000.00, 'completed', 'tuition', '$ADMIN_ID') RETURNING id;")
echo "  Created payments: $PAYMENT_UUID_A (student A), $PAYMENT_UUID_B (student B)"

# Create invoices
INVOICE_UUID_A=$(db_query "INSERT INTO public.invoices (student_id, invoice_number, amount, status, due_date, created_by) VALUES ('$STUDENT_UUID_A', 'INV-2025-001', 1500.00, 'paid', '2025-09-01', '$ADMIN_ID') RETURNING id;")
INVOICE_UUID_B=$(db_query "INSERT INTO public.invoices (student_id, invoice_number, amount, status, due_date, created_by) VALUES ('$STUDENT_UUID_B', 'INV-2025-002', 2000.00, 'unpaid', '2025-09-15', '$ADMIN_ID') RETURNING id;")
echo "  Created invoices: $INVOICE_UUID_A (student A), $INVOICE_UUID_B (student B)"

echo ""
echo "=== Seed Complete ==="
echo ""
echo "Test Data Summary:"
echo "  Student A: $STUDENT_UUID_A (linked to family $FAMILY_ID)"
echo "  Student B: $STUDENT_UUID_B (NOT linked to test family)"
echo "  Parent A:  $PARENT_UUID_A (linked to student A)"
echo "  Payment A: $PAYMENT_UUID_A (student A, completed)"
echo "  Payment B: $PAYMENT_UUID_B (student B, completed)"
echo "  Invoice A: $INVOICE_UUID_A (student A, paid)"
echo "  Invoice B: $INVOICE_UUID_B (student B, unpaid)"
echo ""

# ── 3. EXTRACT JWT TOKENS ─────────────────────────────────────────────
echo "--- Extracting JWT tokens ---"

TOKENS_DIR="scripts/.day2-tokens"
mkdir -p "$TOKENS_DIR"

for pair in "admin:day2-admin@test.local" "student:day2-student@test.local" "family:day2-family@test.local" "teacher:day2-teacher@test.local"; do
  role="${pair%%:*}"
  email="${pair##*:}"
  resp=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$PASSWORD\"}")
  token=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token','FAILED'))" 2>/dev/null || echo "FAILED")
  if [ "$token" != "FAILED" ]; then
    echo "$token" > "$TOKENS_DIR/$role.token"
    echo "  $role: OK (${#token} chars)"
  else
    echo "  $role: FAILED to get token"
    echo "  Response: $resp"
  fi
done

echo ""
echo "Tokens saved to $TOKENS_DIR/"
echo ""
echo "=== Setup Complete ==="
echo "Run tests with: bash scripts/test-rls-rest.sh"
