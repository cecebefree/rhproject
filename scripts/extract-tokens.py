#!/usr/bin/env python3
"""Extract JWT tokens for test users."""
import json, urllib.request, os

SUPABASE_URL = os.environ.get("SUPABASE_URL", "http://127.0.0.1:54321")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU")
PASSWORD = "TestPass123!"
TOKENS_DIR = "scripts/.day2-tokens"

os.makedirs(TOKENS_DIR, exist_ok=True)

for role in ["admin", "student", "family", "teacher"]:
    email = f"day2-{role}@test.local"
    data = json.dumps({"email": email, "password": PASSWORD}).encode()
    req = urllib.request.Request(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        data=data,
        headers={"apikey": SERVICE_KEY, "Content-Type": "application/json"}
    )
    try:
        resp = urllib.request.urlopen(req)
        body = json.loads(resp.read())
        token = body.get("access_token", "FAILED")
        user_email = body.get("user", {}).get("email", "?")
        app_role = body.get("user", {}).get("app_metadata", {}).get("role", "?")
        
        token_path = os.path.join(TOKENS_DIR, f"{role}.token")
        with open(token_path, "w") as f:
            f.write(token)
        
        print(f"  {role}: OK email={user_email} app_role={app_role} token_len={len(token)}")
    except Exception as e:
        print(f"  {role}: FAILED - {e}")

print(f"\nTokens saved to {TOKENS_DIR}/")
