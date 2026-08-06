-- NOT A MIGRATION — pgTAP must never enter the production migration path
-- Runs first (000_ prefix). No explicit BEGIN/ROLLBACK: the CLI wraps each
-- test file; CREATE EXTENSION IF NOT EXISTS is idempotent regardless.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT public.plan(1);
SELECT public.ok(true, 'pgTAP bootstrap: extension available in extensions schema');
SELECT public.finish();
