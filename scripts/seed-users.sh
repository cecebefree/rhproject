#!/bin/bash
# scripts/seed-users.sh — Seed auth users via Admin API + dependent data.
# Runs AFTER `supabase db reset` (local) or `supabase db reset --linked` (hosted).
# No auth.* SQL writes — all user creation via GoTrue Admin API.
#
# Usage:
#   Local:  SUPABASE_URL=http://127.0.0.1:54321 bash scripts/seed-users.sh
#   Hosted: SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<key> bash scripts/seed-users.sh

set -eo pipefail

REDHOUSE_TENANT='e97e5c3a-1234-4321-abcd-000000000001'
TENANT2='00000000-0000-0000-0000-000000000002'
PASSWORD="${SEED_PASSWORD:-password}"
SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY required}"

AUTH="$SUPABASE_URL/auth/v1"
HEADERS=(-H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json")

# ── Helpers ──────────────────────────────────────────────────────────

# Fetch all existing user emails once (cached)
EXISTING_EMAILS=""
fetch_existing_emails() {
  if [ -z "$EXISTING_EMAILS" ]; then
    EXISTING_EMAILS=$(curl -s "${HEADERS[@]}" "$AUTH/admin/users" | grep -o '"email":"[^"]*"' | sed 's/"email":"//;s/"//' || true)
  fi
}

create_user() {
  local email="$1" password="$2" role="$3" tenant_id="$4" name="$5"
  fetch_existing_emails
  if echo "$EXISTING_EMAILS" | grep -qx "$email"; then
    echo "  SKIP: $email (exists)"
    return 0
  fi
  local resp http
  resp=$(curl -s -w "\n%{http_code}" -X POST "${HEADERS[@]}" \
    -d "{\"email\":\"$email\",\"password\":\"$password\",\"email_confirm\":true,\"app_metadata\":{\"role\":\"$role\",\"tenant_id\":\"$tenant_id\"},\"user_metadata\":{\"name\":\"$name\"}}" \
    "$AUTH/admin/users")
  http=$(echo "$resp" | tail -1)
  if [ "$http" = "201" ] || [ "$http" = "200" ]; then
    echo "  CREATED: $email (role=$role)"
  else
    echo "  ERROR $http: $email" >&2
    echo "$resp" | head -1 >&2
    return 1
  fi
}

# Detect local vs hosted: local uses docker exec psql, hosted uses supabase db query --linked
if [[ "$SUPABASE_URL" == *"127.0.0.1"* || "$SUPABASE_URL" == *"localhost"* ]]; then
  DB_CONTAINER="supabase_db_rhproject-new"
  db_query() {
    docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "$1"
  }
else
  db_query() {
    supabase db query --linked "$1"
  }
fi

echo "=== Seed Users + Data ==="
echo "URL: $SUPABASE_URL"
echo ""

# ── 1. CREATE USERS (Admin API) ──────────────────────────────────────

echo "--- Creating users ---"
create_user admin@demo.redhouse     "$PASSWORD" admin   "$REDHOUSE_TENANT" "Admin User"
create_user teacher@demo.redhouse   "$PASSWORD" teacher "$REDHOUSE_TENANT" "Teacher User"
create_user student@demo.redhouse   "$PASSWORD" student "$REDHOUSE_TENANT" "Student User"
create_user teacher2@demo.redhouse  "$PASSWORD" teacher "$REDHOUSE_TENANT" "Teacher Two"
create_user outside@demo.redhouse   "$PASSWORD" outside_student "$REDHOUSE_TENANT" "Outside Student"
create_user guardian@demo.redhouse  "$PASSWORD" family  "$REDHOUSE_TENANT" "Test Guardian"
create_user guardian2@demo.redhouse "$PASSWORD" family  "$REDHOUSE_TENANT" "Unlinked Guardian"
create_user other@demo.redhouse     "$PASSWORD" student "$TENANT2"         "Other Tenant Student"

# ── 2. LOOKUP USER IDs (single batch query) ─────────────────────────

echo ""
echo "--- Looking up user IDs ---"

if [[ "$SUPABASE_URL" == *"127.0.0.1"* || "$SUPABASE_URL" == *"localhost"* ]]; then
  ID_MAP=$(docker exec "$DB_CONTAINER" psql -U postgres -d postgres -t -A -c "SELECT email, id FROM auth.users WHERE email IN ('admin@demo.redhouse','teacher@demo.redhouse','student@demo.redhouse','teacher2@demo.redhouse','outside@demo.redhouse','guardian@demo.redhouse','guardian2@demo.redhouse','other@demo.redhouse');")
else
  # Management API returns all users in a single JSON object; extract per-email with jq-free grep
  HOSTED_RAW=$(curl -s -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" "$SUPABASE_URL/auth/v1/admin/users")
  ID_MAP=""
  for email in admin@demo.redhouse teacher@demo.redhouse student@demo.redhouse teacher2@demo.redhouse outside@demo.redhouse guardian@demo.redhouse guardian2@demo.redhouse other@demo.redhouse; do
    # Split on },{ to isolate each user object, then grep for the email
    uid=$(echo "$HOSTED_RAW" | tr '}' '\n' | grep "\"email\":\"$email\"" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
    [ -n "$uid" ] && ID_MAP="$ID_MAP$email|$uid
"
  done
fi

get_id() { echo "$ID_MAP" | grep "^$1|" | cut -d'|' -f2; }

ADMIN_ID=$(get_id "admin@demo.redhouse")
TEACHER_ID=$(get_id "teacher@demo.redhouse")
STUDENT_ID=$(get_id "student@demo.redhouse")
TEACHER2_ID=$(get_id "teacher2@demo.redhouse")
OUTSIDE_ID=$(get_id "outside@demo.redhouse")
GUARDIAN_ID=$(get_id "guardian@demo.redhouse")
GUARDIAN2_ID=$(get_id "guardian2@demo.redhouse")
OTHER_ID=$(get_id "other@demo.redhouse")

echo "  admin=$ADMIN_ID"
echo "  teacher=$TEACHER_ID"
echo "  student=$STUDENT_ID"
echo "  teacher2=$TEACHER2_ID"
echo "  outside=$OUTSIDE_ID"
echo "  guardian=$GUARDIAN_ID"
echo "  guardian2=$GUARDIAN2_ID"
echo "  other=$OTHER_ID"

# Validate all IDs present
for label_id in "admin=$ADMIN_ID" "teacher=$TEACHER_ID" "student=$STUDENT_ID" \
                "teacher2=$TEACHER2_ID" "outside=$OUTSIDE_ID" "guardian=$GUARDIAN_ID" \
                "guardian2=$GUARDIAN2_ID" "other=$OTHER_ID"; do
  val="${label_id#*=}"
  if [ -z "$val" ]; then
    echo "FATAL: missing user ID for ${label_id%%=*}" >&2
    exit 1
  fi
done

# ── 3. ENRICH PROFILES (trigger creates with role='student', tenant_id=NULL) ──
# Must use set_config bypass in same psql session as UPDATEs (057 immutability trigger).

echo ""
echo "--- Enriching profiles ---"
db_query "
SELECT set_config('app.tenant_assignment_bypass', 'true', false);

UPDATE public.profiles SET role = 'admin',   registration_status = 'approved', consent_given = true, tenant_id = '$REDHOUSE_TENANT' WHERE id = '$ADMIN_ID';
UPDATE public.profiles SET role = 'teacher', registration_status = 'approved', consent_given = true, tenant_id = '$REDHOUSE_TENANT' WHERE id = '$TEACHER_ID';
UPDATE public.profiles SET role = 'student', registration_status = 'approved', consent_given = true, tenant_id = '$REDHOUSE_TENANT' WHERE id = '$STUDENT_ID';
UPDATE public.profiles SET role = 'teacher', registration_status = 'approved', consent_given = true, tenant_id = '$REDHOUSE_TENANT' WHERE id = '$TEACHER2_ID';
UPDATE public.profiles SET role = 'outside_student', registration_status = 'approved', consent_given = true, tenant_id = '$REDHOUSE_TENANT' WHERE id = '$OUTSIDE_ID';
UPDATE public.profiles SET role = 'family',  registration_status = 'approved', consent_given = true, tenant_id = '$REDHOUSE_TENANT' WHERE id = '$GUARDIAN_ID';
UPDATE public.profiles SET role = 'family',  registration_status = 'approved', consent_given = true, tenant_id = '$REDHOUSE_TENANT' WHERE id = '$GUARDIAN2_ID';
UPDATE public.profiles SET role = 'student', registration_status = 'approved', consent_given = true, tenant_id = '$TENANT2'         WHERE id = '$OTHER_ID';

SELECT set_config('app.tenant_assignment_bypass', 'false', false);
"

# ── 4. ACCESS WINDOW (032) ───────────────────────────────────────────

echo "--- Access window fixtures ---"
db_query "
UPDATE public.profiles
  SET has_core = true,
      access_starts_at = now() - interval '1 day',
      access_ends_at   = now() + interval '365 days'
WHERE id = '$STUDENT_ID';

UPDATE public.profiles
  SET has_core = false,
      access_starts_at = now() - interval '1 day',
      access_ends_at   = now() + interval '365 days'
WHERE id = '$OTHER_ID';
"

# ── 5. COURSES (014 + 039 enrichment columns) ───────────────────────

echo "--- Courses ---"
db_query "
INSERT INTO public.courses (id, title, price, status, teacher_id, type, open_to_outside)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Test Course One', 0, 'published', '$TEACHER_ID', 'core', false),
  ('22222222-2222-2222-2222-222222222222', 'Test Course Two', 0, 'published', '$TEACHER_ID', 'core', false),
  ('33333333-3333-3333-3333-333333333333', 'Culinary Club',  0, 'published', '$TEACHER_ID', 'club', false),
  ('44444444-4444-4444-4444-444444444444', 'Finance 101',     0, 'published', '$TEACHER_ID', 'enrichment', true)
ON CONFLICT (id) DO NOTHING;
"

# ── 6. CHAPTERS (015) ───────────────────────────────────────────────

echo "--- Chapters ---"
db_query "
INSERT INTO public.chapters (course_id, title, description, video_url, order_index)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Chapter 1: Introduction', 'First chapter', 'https://example.com/ch1', 0),
  ('11111111-1111-1111-1111-111111111111', 'Chapter 2: Basics',       'Second chapter', 'https://example.com/ch2', 1),
  ('22222222-2222-2222-2222-222222222222', 'Chapter 1: Overview',     'Course overview', 'https://example.com/c2ch1', 0)
ON CONFLICT (course_id, order_index) DO NOTHING;
"

# ── 7. DEVOTIONAL (020) — day = today's day-of-year ──────────────────

echo "--- Devotional config + item (today) ---"
db_query "
INSERT INTO public.devotional_config (tenant_id, branding, is_active)
VALUES ('$REDHOUSE_TENANT', '{}', true)
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO public.devotional_item (tenant_id, type, day, url_or_text, is_iframe, is_active)
VALUES ('$REDHOUSE_TENANT', 'verse', extract(doy from current_date)::int, 'https://example.com/verse-today', false, true)
ON CONFLICT (tenant_id, type, day) DO NOTHING;

INSERT INTO public.devotional_item (tenant_id, type, day, url_or_text, is_iframe, is_active)
VALUES ('$REDHOUSE_TENANT', 'reflection', extract(doy from current_date)::int, 'Today''s reflection text', false, true)
ON CONFLICT (tenant_id, type, day) DO NOTHING;
"

# ── 8. STUDENT_CLASS (027 enrolments) ────────────────────────────────

echo "--- Student class enrolments ---"
db_query "
INSERT INTO public.student_class (student_id, class_id, tenant_id)
VALUES
  ('$STUDENT_ID',  '11111111-1111-1111-1111-111111111111', '$REDHOUSE_TENANT'),
  ('$OTHER_ID',    '11111111-1111-1111-1111-111111111111', '$REDHOUSE_TENANT'),
  ('$OTHER_ID',    '22222222-2222-2222-2222-222222222222', '$REDHOUSE_TENANT'),
  ('$STUDENT_ID',  '33333333-3333-3333-3333-333333333333', '$REDHOUSE_TENANT'),
  ('$STUDENT_ID',  '44444444-4444-4444-4444-444444444444', '$REDHOUSE_TENANT'),
  ('$OTHER_ID',    '33333333-3333-3333-3333-333333333333', '$REDHOUSE_TENANT'),
  ('$OTHER_ID',    '44444444-4444-4444-4444-444444444444', '$REDHOUSE_TENANT')
ON CONFLICT (student_id, class_id) DO NOTHING;
"

# ── 9. ENRICHMENT META (039) ─────────────────────────────────────────

echo "--- Enrichment meta ---"
db_query "
INSERT INTO public.enrichment_meta (tenant_id, student_class_id, pace, completed, total, note)
SELECT '$REDHOUSE_TENANT', sc.id, 'self-paced', 3, 7, 'Starting Term 2'
FROM public.student_class sc
WHERE sc.student_id = '$STUDENT_ID' AND sc.class_id = '44444444-4444-4444-4444-444444444444'
ON CONFLICT (student_class_id) DO NOTHING;
"

# ── 10. ENROLLMENTS + PLATFORM_ACCESS (016, 035) ────────────────────

echo "--- Enrollments + platform access ---"
db_query "
INSERT INTO public.enrollments (student_id, course_id, payment_reference)
VALUES
  ('$STUDENT_ID', '11111111-1111-1111-1111-111111111111', 'seed-paid-001'),
  ('$OTHER_ID',   '22222222-2222-2222-2222-222222222222', 'seed-paid-002')
ON CONFLICT (student_id, course_id) DO NOTHING;

INSERT INTO public.platform_access (user_id, tenant_id, platform, access_starts_at, access_ends_at)
VALUES
  ('$STUDENT_ID', '$REDHOUSE_TENANT', 'core',       now() - interval '1 day', now() + interval '300 days'),
  ('$STUDENT_ID', '$REDHOUSE_TENANT', 'enrichment', now() - interval '1 day', now() + interval '300 days'),
  ('$OTHER_ID',   '$REDHOUSE_TENANT', 'enrichment', now() - interval '1 day', now() + interval '300 days')
ON CONFLICT DO NOTHING;
"

# ── 11. NOTIFICATIONS (036) ──────────────────────────────────────────

echo "--- Notifications ---"
db_query "
INSERT INTO public.notifications (id, user_id, tenant_id, type, title, body)
VALUES
  ('aaaa0000-0000-0000-0000-0000000000a1', '$STUDENT_ID', '$REDHOUSE_TENANT',
   'announcement', 'Welcome stud1', 'Seed notification for student1'),
  ('aaaa0000-0000-0000-0000-0000000000a2', '$OTHER_ID',   '$REDHOUSE_TENANT',
   'system', 'Welcome stud2', 'Seed notification for student2')
ON CONFLICT (id) DO NOTHING;
"

# ── 12. SCHEDULE SLOT (037) ──────────────────────────────────────────

echo "--- Schedule slot ---"
db_query "
INSERT INTO public.schedule_slot (id, tenant_id, course_id, term_id, label, start_time, end_time, days_of_week)
VALUES
  ('bbbb0000-0000-0000-0000-0000000000b1', '$REDHOUSE_TENANT',
   '11111111-1111-1111-1111-111111111111', 'cccc0000-0000-0000-0000-0000000000c1',
   'Section A', '09:00', '10:00', ARRAY[1,3,5]),
  ('bbbb0000-0000-0000-0000-0000000000b2', '$REDHOUSE_TENANT',
   '22222222-2222-2222-2222-222222222222', 'cccc0000-0000-0000-0000-0000000000c1',
   'Section B', '10:30', '11:30', ARRAY[2,4])
ON CONFLICT (id) DO NOTHING;
"

# ── 13. BOOKLISTS (040) ──────────────────────────────────────────────

echo "--- Book + booklist fixtures ---"
db_query "
INSERT INTO public.book (id, tenant_id, title, curriculum_type, isbn_13)
VALUES
  ('d0000000-0000-0000-0000-000000000001', '$REDHOUSE_TENANT', 'Cambridge Math', 'cambridge', '9781107641114'),
  ('d0000000-0000-0000-0000-000000000002', '$REDHOUSE_TENANT', 'Reference Bible', 'library', null),
  ('d0000000-0000-0000-0000-000000000003', '$REDHOUSE_TENANT', 'Revoked Dictionary', 'library', '9780198739520'),
  ('d0000000-0000-0000-0000-000000000004', '$REDHOUSE_TENANT', 'Science E-Book', 'ib', '9781108712345')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.book (id, tenant_id, title, curriculum_type, isbn_13, ebook_available)
VALUES ('d0000000-0000-0000-0000-000000000005', '$REDHOUSE_TENANT', 'Home School Reader', 'home_school', '9781234567890', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.book (id, tenant_id, title, curriculum_type, isbn_13)
VALUES ('d0000000-0000-0000-0000-000000000006', '$TENANT2', 'Tenant 2 Book', 'library', '9780000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.booklist (id, tenant_id, child_id, school_year)
VALUES
  ('b0000000-0000-0000-0000-000000000001', '$REDHOUSE_TENANT', '$STUDENT_ID', '2026-2027'),
  ('b0000000-0000-0000-0000-000000000002', '$REDHOUSE_TENANT', '$STUDENT_ID', '2025-2026'),
  ('b0000000-0000-0000-0000-000000000003', '$REDHOUSE_TENANT', '$OTHER_ID',   '2026-2027'),
  ('b0000000-0000-0000-0000-000000000004', '$TENANT2',         '$OTHER_ID',   '2026-2027')
ON CONFLICT (tenant_id, child_id, school_year) DO NOTHING;

INSERT INTO public.booklist_item (id, tenant_id, booklist_id, book_id, title, source_type, source_id)
VALUES ('c0000000-0000-0000-0000-000000000001', '$REDHOUSE_TENANT',
        'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
        'Cambridge Math', 'course', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.booklist_item (id, tenant_id, booklist_id, book_id, title, source_type, permanent)
VALUES ('c0000000-0000-0000-0000-000000000002', '$REDHOUSE_TENANT',
        'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
        'Reference Bible', 'course', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.booklist_item (id, tenant_id, booklist_id, book_id, title, source_type, permanent, revoked_at)
VALUES ('c0000000-0000-0000-0000-000000000003', '$REDHOUSE_TENANT',
        'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
        'Revoked Dictionary', 'course', true, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.booklist_item (id, tenant_id, booklist_id, book_id, title, source_type, source_id)
VALUES ('c0000000-0000-0000-0000-000000000004', '$REDHOUSE_TENANT',
        'b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001',
        'Cambridge Math', 'course', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.booklist_item (id, tenant_id, booklist_id, book_id, title, source_type)
VALUES ('c0000000-0000-0000-0000-000000000005', '$REDHOUSE_TENANT',
        'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000004',
        'Science E-Book', 'course')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.booklist_item (id, tenant_id, booklist_id, book_id, title, source_type)
VALUES ('c0000000-0000-0000-0000-000000000006', '$TENANT2',
        'b0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000006',
        'Tenant 2 Book', 'course')
ON CONFLICT (id) DO NOTHING;
"

# ── 14. FAMILY (063) ─────────────────────────────────────────────────

echo "--- Family child links ---"
db_query "
INSERT INTO public.family_child (guardian_id, child_id)
VALUES
  ('$GUARDIAN_ID', '$STUDENT_ID'),
  ('$GUARDIAN_ID', '$OTHER_ID')
ON CONFLICT (guardian_id, child_id) DO NOTHING;
"

# ── 15. ANNOUNCEMENTS (041) ──────────────────────────────────────────

echo "--- Announcements ---"
db_query "
INSERT INTO public.announcement (id, tenant_id, title, body, audience_roles, publish_at, expires_at, pinned, created_by)
VALUES
  ('a1000000-0000-0000-0000-000000000001', '$REDHOUSE_TENANT',
   'School Reopening', 'School reopens on Monday.', '{}',
   now() - interval '2 days', null, false, '$ADMIN_ID'),
  ('a1000000-0000-0000-0000-000000000002', '$REDHOUSE_TENANT',
   'Staff Meeting', 'Staff meeting Friday.', '{teacher}',
   now() - interval '1 day', null, false, '$ADMIN_ID'),
  ('a1000000-0000-0000-0000-000000000003', '$REDHOUSE_TENANT',
   'Upcoming Event', 'Save the date!', '{}',
   now() + interval '30 days', null, false, '$ADMIN_ID'),
  ('a1000000-0000-0000-0000-000000000004', '$REDHOUSE_TENANT',
   'Expired Notice', 'This notice has expired.', '{}',
   now() - interval '10 days', now() - interval '1 day', false, '$ADMIN_ID'),
  ('a1000000-0000-0000-0000-000000000005', '$REDHOUSE_TENANT',
   'Important Announcement', 'Please read this pinned notice.', '{}',
   now() - interval '3 days', null, true, '$ADMIN_ID'),
  ('a1000000-0000-0000-0000-000000000006', '$TENANT2',
   'Tenant 2 Welcome', 'Welcome to the second tenant.', '{}',
   now() - interval '1 day', null, false, '$OTHER_ID')
ON CONFLICT (id) DO NOTHING;
"

# ── 16. REPORT CARDS + CERTIFICATES (R18) ────────────────────────────

echo "--- Report cards + certificates ---"
db_query "
INSERT INTO public.report_cards (student_id, term, subject, grade, status, created_by, released_by, released_at, visible_at, tenant_id)
SELECT '$STUDENT_ID', '2026 Term 1', 'Mathematics', 'A', 'visible',
       '$TEACHER_ID', '$ADMIN_ID', now() - interval '2 days', now() - interval '1 day', '$REDHOUSE_TENANT'
WHERE NOT EXISTS (
    SELECT 1 FROM public.report_cards
    WHERE student_id = '$STUDENT_ID' AND term = '2026 Term 1' AND subject = 'Mathematics'
);

INSERT INTO public.certificates (user_id, cert_class, title, description, signatory, status, tenant_id)
SELECT '$STUDENT_ID', 'core_subject', 'Mathematics Certificate',
       'Core subject completion — Mathematics 2026 Term 1', 'Head Teacher', 'issued', '$REDHOUSE_TENANT'
WHERE NOT EXISTS (
    SELECT 1 FROM public.certificates
    WHERE user_id = '$STUDENT_ID' AND cert_class = 'core_subject' AND title = 'Mathematics Certificate'
);

INSERT INTO public.certificates (user_id, cert_class, title, description, signatory, status, tenant_id)
SELECT '$STUDENT_ID', 'enrichment', 'Finance 101 Completion',
       'Enrichment course completion', 'Mr. Olivier', 'issued', '$REDHOUSE_TENANT'
WHERE NOT EXISTS (
    SELECT 1 FROM public.certificates
    WHERE user_id = '$STUDENT_ID' AND cert_class = 'enrichment' AND title = 'Finance 101 Completion'
);
"

echo ""
echo "=== Seed complete ==="
