-- Fix is_rls_enabled helper to use pg_class.relrowsecurity instead of nonexistent row_security_enabled()

CREATE OR REPLACE FUNCTION public.is_rls_enabled(p_schema name, p_table name, p_type text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_rls_enabled boolean;
BEGIN
  SELECT c.relrowsecurity
  INTO v_rls_enabled
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = p_schema
    AND c.relname = p_table
    AND c.relkind IN ('r', 'p');

  RETURN COALESCE(v_rls_enabled, false);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.is_rls_enabled(name, name, text) TO authenticated, service_role;
