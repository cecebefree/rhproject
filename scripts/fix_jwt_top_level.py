import re

pattern = re.compile(
    r"('sub', p_sub::text,\n"
    r"\s*'role', 'authenticated',\n"
    r"\s*)'app_metadata'",
    re.MULTILINE
)

replacement = r"\1'tenant_id', p_tenant_id::text,\n      'app_metadata'"

files = [
    'supabase/tests/111_office_desk_rls_test.sql',
    'supabase/tests/112_profiles_rls_test.sql',
    'supabase/tests/113_enrollments_rls_test.sql',
    'supabase/tests/117_courses_rls_test.sql',
    'supabase/tests/012_rls_denial_proofs.sql',
    'supabase/tests/013_cross_tenant_office.sql',
    'supabase/tests/065_r18_rpc_test.sql',
    'supabase/tests/109_leads_archive_test.sql',
]

for f in files:
    with open(f, 'r') as fh:
        content = fh.read()
    new_content, count = pattern.subn(replacement, content)
    if count > 0:
        with open(f, 'w') as fh:
            fh.write(new_content)
        print(f"Fixed {count} occurrences in {f}")
    else:
        print(f"No match in {f}")
