#!/bin/bash
# Row 41 ATTACK 41a: G11 fail-closed-on-NULL
# NULL-tenant office user attacks tenant-scoped tables + release EF
cd /Users/ce/dev/rhproject-new/.swarm
SRK=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' /Users/ce/dev/rhproject-new/.env | cut -d= -f2-)
ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
TOK=$(python3 -c "import json; print(json.load(open('null_office_tok.json'))['token'])")

hr() { printf '\n=== %s ===\n' "$1"; }

hr "41a-1: NULL-tenant SELECT report_cards (RLS deny) -> expect []"
curl -s "http://127.0.0.1:54321/rest/v1/report_cards?select=id,status,tenant_id&limit=10" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOK" -w " [HTTP %{http_code}]\n"

hr "41a-2: NULL-tenant SELECT schedule_slot -> expect []"
curl -s "http://127.0.0.1:54321/rest/v1/schedule_slot?select=id,label&limit=10" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOK" -w " [HTTP %{http_code}]\n"

hr "41a-3: NULL-tenant SELECT courses -> expect []"
curl -s "http://127.0.0.1:54321/rest/v1/courses?select=id,title&limit=10" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOK" -w " [HTTP %{http_code}]\n"

hr "41a-4: NULL-tenant SELECT enrollments -> expect []"
curl -s "http://127.0.0.1:54321/rest/v1/enrollments?select=id,profile_id&limit=10" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOK" -w " [HTTP %{http_code}]\n"

hr "41a-5: NULL-tenant SELECT chapter_progress -> expect []"
curl -s "http://127.0.0.1:54321/rest/v1/chapter_progress?select=id,profile_id&limit=10" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOK" -w " [HTTP %{http_code}]\n"

hr "41a-6: NULL-tenant INSERT into report_cards (write) -> expect 401/403"
curl -s -X POST "http://127.0.0.1:54321/rest/v1/report_cards" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"student_id":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","term":"X","subject":"Y","grade":"A","status":"draft","tenant_id":null}' -w " [HTTP %{http_code}]\n"

hr "41a-7: NULL-tenant UPDATE a draft card via REST (write) -> expect 200 with [] (RLS silently blocks, zero rows)"
RESP=$(curl -s -X PATCH "http://127.0.0.1:54321/rest/v1/report_cards?id=eq.025b1210-26cb-448d-aa81-cd0a035952aa" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"grade":"Z"}' -w "\n%{http_code}")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
echo "$BODY [HTTP $HTTP_CODE]"
if [ "$BODY" = "[]" ]; then
  echo ">> ZERO ROWS AFFECTED — RLS correctly blocked update"
else
  echo ">> WARNING: row(s) returned — verify against expected RLS behavior"
fi

hr "41a-8: NULL-tenant release EF (write via EF) -> expect D-15 403"
curl -s -X POST "http://127.0.0.1:54321/functions/v1/release-report-card" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"report_card_id":"025b1210-26cb-448d-aa81-cd0a035952aa","target_status":"released"}' -w " [HTTP %{http_code}]\n"

hr "41a-9: FORGED tenant_id in JWT (claims tenant 2, profile NULL) -> expect deny/0 rows"
FORGED=$(python3 -c "
import hmac,hashlib,json,time,base64
def b(x): return base64.urlsafe_b64encode(x).rstrip(b'=').decode()
h=b(json.dumps({'alg':'HS256','typ':'JWT'},separators=(',',':')).encode())
p=b(json.dumps({'sub':'eab9602b-0999-4b3f-a747-77c05c81e814','role':'authenticated','exp':int(time.time())+7200,'app_metadata':{'role':'office','tenant_id':'00000000-0000-0000-0000-000000000002'},'aud':'authenticated'},separators=(',',':')).encode())
s=hmac.new(b'super-secret-jwt-token-with-at-least-32-characters-long'.encode(),(h+'.'+p).encode(),hashlib.sha256).digest()
print(h+'.'+p+'.'+b(s))
")
curl -s "http://127.0.0.1:54321/rest/v1/report_cards?select=id,status,tenant_id&limit=10" \
  -H "apikey: $ANON" -H "Authorization: Bearer $FORGED" -w " [HTTP %{http_code}]\n"
echo "(note: profile row is still NULL-tenant; R20 says tenant_id is set ONLY by assign_tenant EF, not JWT)"
