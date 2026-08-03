#!/usr/bin/env python3
"""Extended smoke test for migration 086 — run after seed on local or hosted."""
import subprocess, json, sys

SUPABASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:54321"
ANON_KEY = sys.argv[2] if len(sys.argv) > 2 else "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

EMAILS = {
    "student": "student@demo.redhouse",
    "teacher": "teacher@demo.redhouse",
    "admin": "admin@demo.redhouse",
    "guardian": "guardian@demo.redhouse",
    "other": "other@demo.redhouse",
}
PASSWORD = "password"

def get_token(role):
    import urllib.request
    data = json.dumps({"email": EMAILS[role], "password": PASSWORD}).encode()
    req = urllib.request.Request(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        data=data,
        headers={"apikey": ANON_KEY, "Content-Type": "application/json"},
    )
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())["access_token"]

def rest_query(token, table, select="*", head=False):
    import urllib.request
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&limit=5"
    method = "HEAD" if head else "GET"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": ANON_KEY,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "count=exact" if head else "return=representation",
        },
        method=method,
    )
    try:
        resp = urllib.request.urlopen(req)
        if head:
            return int(resp.headers.get("Content-Range", "0-0/0").split("/")[1])
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return f"ERROR {e.code}"

def rpc_query(token, func, params=None):
    import urllib.request
    url = f"{SUPABASE_URL}/rest/v1/rpc/{func}"
    data = json.dumps(params or {}).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "apikey": ANON_KEY,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return f"ERROR {e.code}"

print(f"Target: {SUPABASE_URL}")
print()

# Get tokens
tokens = {}
for role in EMAILS:
    try:
        tokens[role] = get_token(role)
        print(f"  {role}: token OK")
    except Exception as e:
        print(f"  {role}: SIGN-IN FAILED ({e})")

print()

# ── Core read probes (row 35 direct-read) ──
print("=== DIRECT-READ PROBES (student JWT) ===")
student = tokens.get("student")
if student:
    for table in ["schedule_slot", "announcement", "book", "booklist", "enrichment_meta", "consent_records"]:
        result = rest_query(student, table)
        count = len(result) if isinstance(result, list) else result
        print(f"  {table}: {count}")

print()

# ── RPC probes (row 34+35) ──
print("=== RPC PROBES ===")
for role in ["student", "teacher", "admin"]:
    t = tokens.get(role)
    if not t:
        continue
    devotional = rpc_query(t, "get_today_devotional")
    print(f"  {role}.get_today_devotional: {devotional}")
    chapters = rpc_query(t, "get_chapters_for_student", {"p_student_class_id": "00000000-0000-0000-0000-000000000001"})
    print(f"  {role}.get_chapters_for_student: {type(chapters).__name__} ({len(chapters) if isinstance(chapters, list) else chapters})")

print()

# ── Positive direct-read per role per table ──
print("=== POSITIVE DIRECT-READ (admin JWT, should see rows) ===")
admin = tokens.get("admin")
if admin:
    for table in ["schedule_slot", "announcement", "book"]:
        result = rest_query(admin, table)
        count = len(result) if isinstance(result, list) else result
        print(f"  {table}: {count}")

print()

# ── Negative direct-read (wrong tenant) ──
print("=== NEGATIVE DIRECT-READ (other@demo.redhouse, should see 0) ===")
other = tokens.get("other")
if other:
    for table in ["schedule_slot", "announcement", "book"]:
        result = rest_query(other, table)
        count = len(result) if isinstance(result, list) else result
        print(f"  {table}: {count}")

print()
print("=== SMOKE COMPLETE ===")
