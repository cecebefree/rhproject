#!/bin/bash
# seed-auth-users.sh — P2-008: Seed 8 Redhouse auth users via Admin API (Way A)

set -eo pipefail

SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
TENANT_ID="00000000-0000-0000-0000-000000000001"

echo "P2-008: Seeding 8 Redhouse auth users"
echo ""

# Create each user
create_user() {
  local role="$1" email="$2" name="$3"
  local existing=$(curl -s -o /dev/null -w "%{http_code}" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" "$SUPABASE_URL/auth/v1/admin/users?email=$email")
  if [ "$existing" = "200" ]; then
    echo "  SKIP: $email"
  else
    curl -s -X POST -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" -d "{\"email\":\"$email\",\"password\":\"TestPassword123!\",\"email_confirm\":true,\"app_metadata\":{\"role\":\"$role\",\"tenant_id\":\"$TENANT_ID\"},\"user_metadata\":{\"name\":\"$name\"}}" "$SUPABASE_URL/auth/v1/admin/users" > /dev/null
    echo "  CREATED: $email"
  fi
}

echo "--- Creating auth users ---"
create_user student student@redhouse.test "Student User"
create_user outside_student outside@redhouse.test "Outside Student"
create_user family family@redhouse.test "Family User"
create_user alumni alumni@redhouse.test "Alumni User"
create_user teacher teacher@redhouse.test "Teacher User"
create_user expert expert@redhouse.test "Expert User"
create_user guest guest@redhouse.test "Guest User"
create_user admin admin@redhouse.test "Super Admin"

echo ""
echo "--- Updating profiles ---"
docker exec supabase_db_rhproject-new psql -U postgres -d postgres -c "
UPDATE profiles SET 
  role = CASE name
    WHEN 'Student User' THEN 'student'
    WHEN 'Outside Student' THEN 'outside_student'
    WHEN 'Family User' THEN 'family'
    WHEN 'Alumni User' THEN 'alumni'
    WHEN 'Teacher User' THEN 'teacher'
    WHEN 'Expert User' THEN 'expert'
    WHEN 'Guest User' THEN 'guest'
    WHEN 'Super Admin' THEN 'admin'
    ELSE role
  END,
  registration_status = 'approved',
  consent_given = TRUE,
  tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE name IN ('Student User','Outside Student','Family User','Alumni User','Teacher User','Expert User','Guest User','Super Admin');
"

echo ""
echo "--- Verification ---"
docker exec supabase_db_rhproject-new psql -U postgres -d postgres -c "
SELECT u.email, p.role, p.tenant_id, p.registration_status, p.consent_given
FROM auth.users u
JOIN profiles p ON u.id = p.id
ORDER BY p.role;
"
