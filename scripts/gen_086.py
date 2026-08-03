#!/usr/bin/env python3
"""Generate migration 086: rewrite all auth.jwt() tenant_id readers to use helper."""
import subprocess, re, json

def db_query(sql):
    r = subprocess.run(
        ['supabase', 'db', 'query', '--linked', '--output-format', 'json', sql],
        capture_output=True, text=True, timeout=60
    )
    try:
        data = json.loads(r.stdout)
        return data.get('rows', [])
    except (json.JSONDecodeError, KeyError):
        return []

# Single query: get all policies with auth.jwt() in their definitions
policies = db_query("""
SELECT c.relname as tablename, p.polname as policyname, p.polcmd as cmd,
       pg_get_expr(p.polqual, c.oid) as qual_def,
       pg_get_expr(p.polwithcheck, c.oid) as check_def
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND (pg_get_expr(p.polqual, c.oid) LIKE '%auth.jwt()%'
       OR pg_get_expr(p.polwithcheck, c.oid) LIKE '%auth.jwt()%')
ORDER BY c.relname, p.polname;
""")

print(f"Found {len(policies)} policies to normalize")

lines = [
    "-- 086_normalize_jwt_tenant_id_helper.sql",
    "-- Rewrites ALL auth.jwt() tenant_id readers to public.jwt_tenant_id()",
    "--",
    "-- Helper returns auth.jwt() -> 'app_metadata' ->> 'tenant_id'",
    "-- which is the canonical path set by custom_access_token_hook (022).",
    "-- Both wrong-path (root-level) and correct-path (app_metadata) are normalized.",
    "--",
    "-- PREDECESSOR: 085_hook_emit_tenant_id_both_levels.sql",
    "",
    "BEGIN;",
    "",
    "CREATE OR REPLACE FUNCTION public.jwt_tenant_id()",
    "RETURNS uuid",
    "LANGUAGE sql",
    "STABLE",
    "SET search_path = public",
    "AS $$",
    "  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;",
    "$$;",
    "",
    "GRANT EXECUTE ON FUNCTION public.jwt_tenant_id() TO authenticated;",
    "",
    "COMMENT ON FUNCTION public.jwt_tenant_id() IS",
    "  'Returns tenant_id from JWT app_metadata. Single source of truth for RLS policies.';",
    "",
]

def replace_jwt(s):
    if not s:
        return s
    # Wrong path: auth.jwt() ->> 'tenant_id'
    s = re.sub(r"auth\.jwt\(\)\s*->>\s*'tenant_id'::text", "public.jwt_tenant_id()", s)
    s = re.sub(r"auth\.jwt\(\)\s*->>\s*'tenant_id'", "public.jwt_tenant_id()", s)
    # Correct path: auth.jwt() -> 'app_metadata'::text ->> 'tenant_id' (pg_get_expr adds ::text and parens)
    # The pg_get_expr output wraps in parens: (auth.jwt() -> 'app_metadata'::text ->> 'tenant_id'::text)
    # We need to consume the outer wrapping paren too
    s = re.sub(r"\(auth\.jwt\(\)\s*->\s*'app_metadata'::text\)\s*->>\s*'tenant_id'::text", "public.jwt_tenant_id()", s)
    s = re.sub(r"\(auth\.jwt\(\)\s*->\s*'app_metadata'\)\s*->>\s*'tenant_id'::text", "public.jwt_tenant_id()", s)
    s = re.sub(r"\(auth\.jwt\(\)\s*->\s*'app_metadata'::text\)\s*->>\s*'tenant_id'", "public.jwt_tenant_id()", s)
    s = re.sub(r"\(auth\.jwt\(\)\s*->\s*'app_metadata'\)\s*->>\s*'tenant_id'", "public.jwt_tenant_id()", s)
    # Also handle without wrapping parens
    s = re.sub(r"auth\.jwt\(\)\s*->\s*'app_metadata'::text\)?\s*->>\s*'tenant_id'::text", "public.jwt_tenant_id()", s)
    s = re.sub(r"auth\.jwt\(\)\s*->\s*'app_metadata'\)?\s*->>\s*'tenant_id'::text", "public.jwt_tenant_id()", s)
    s = re.sub(r"auth\.jwt\(\)\s*->\s*'app_metadata'::text\)?\s*->>\s*'tenant_id'", "public.jwt_tenant_id()", s)
    s = re.sub(r"auth\.jwt\(\)\s*->\s*'app_metadata'\)?\s*->>\s*'tenant_id'", "public.jwt_tenant_id()", s)
    return s

rewrite_count = 0
for pol in policies:
    tn = pol['tablename']
    pn = pol['policyname']
    cmd = pol.get('cmd', '*')
    qual = pol.get('qual_def', '')
    check = pol.get('check_def', '')

    if not qual and not check:
        print(f"  SKIP: {tn}.{pn} (empty)")
        continue

    def strip_outer_parens(s):
        """Remove outermost wrapping parens from pg_get_expr output."""
        s = s.strip()
        while s.startswith('(') and s.endswith(')'):
            # Check if the outer parens are truly wrapping (balanced)
            depth = 0
            balanced = True
            for i, c in enumerate(s):
                if c == '(':
                    depth += 1
                elif c == ')':
                    depth -= 1
                if depth == 0 and i < len(s) - 1:
                    balanced = False
                    break
            if balanced:
                s = s[1:-1].strip()
            else:
                break
        return s

    qual = strip_outer_parens(qual) if qual else ''
    check = strip_outer_parens(check) if check else ''

    new_qual = replace_jwt(qual)
    new_check = replace_jwt(check)
    changed = (new_qual != qual) or (new_check != check)

    if changed:
        rewrite_count += 1
        tag = "REWRITE"
    else:
        tag = "SAME"

    # Collapse multi-line qual/check to single line for supabase db query compatibility
    new_qual_flat = ' '.join(new_qual.split()) if new_qual else ''
    new_check_flat = ' '.join(new_check.split()) if new_check else ''

    lines.append(f"-- {tag}: {tn}.{pn} [{cmd}]")
    lines.append(f"DROP POLICY IF EXISTS {pn} ON public.{tn};")

    cmd_map = {'*': '*', 'r': 'SELECT', 'a': 'INSERT', 'w': 'UPDATE', 'd': 'DELETE'}
    cmd_sql = cmd_map.get(cmd, cmd)

    create = f"CREATE POLICY {pn} ON public.{tn}"
    if cmd_sql and cmd_sql != '*':
        create += f" FOR {cmd_sql}"
    create += " TO authenticated"

    if new_qual_flat and new_check_flat:
        create += f" USING ({new_qual_flat}) WITH CHECK ({new_check_flat});"
    elif new_qual_flat:
        create += f" USING ({new_qual_flat});"
    elif new_check_flat:
        create += f" WITH CHECK ({new_check_flat});"

    lines.append(create)
    lines.append("")
    print(f"  {tag}: {tn}.{pn}")

lines.append("COMMIT;")
lines.append("")

with open('/Users/ce/dev/rhproject-new/supabase/migrations/086_normalize_jwt_tenant_id_helper.sql', 'w') as f:
    f.write('\n'.join(lines))

print(f"\nWrote migration: {rewrite_count} rewritten, {len(policies) - rewrite_count} unchanged, {len(policies)} total")
