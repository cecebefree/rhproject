SELECT plan(15);
-- 5 tables x 3 checks each

CREATE OR REPLACE FUNCTION check_admin_all_policy(tname text)
RETURNS SETOF TEXT AS $$
BEGIN
    RETURN QUERY SELECT ok(
        EXISTS (SELECT 1 FROM pg_policies
                WHERE schemaname = 'public'
                  AND tablename = tname
                  AND policyname = 'admin_all_' || tname),
        tname || ' has admin_all policy'
    );

    RETURN QUERY SELECT ok(
        (SELECT qual::text LIKE '%auth.jwt()%app_metadata%role%admin%'
         FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = tname
           AND policyname = 'admin_all_' || tname),
        tname || ' admin_all uses JWT role check'
    );

    RETURN QUERY SELECT ok(
        (SELECT relrowsecurity
         FROM pg_class
         WHERE relname = tname),
        tname || ' has RLS enabled'
    );
END;
$$ LANGUAGE plpgsql;

SELECT * FROM check_admin_all_policy('tenant_devotional');
SELECT * FROM check_admin_all_policy('tenant_lms');
SELECT * FROM check_admin_all_policy('tenant_mobile');
SELECT * FROM check_admin_all_policy('devotional_config');
SELECT * FROM check_admin_all_policy('devotional_item');

SELECT * FROM finish();
